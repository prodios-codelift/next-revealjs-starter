import { startElementPicker, stopElementPicker } from '@/lib/element-picker';

export const WIRE_FRAME_RPC_CHANNEL = 'prodios:wireframe-preview-rpc';
export const WIRE_FRAME_RPC_VERSION = 1;
export const WIRE_FRAME_RPC_CAPABILITIES = [
  'route-navigation',
  'element-picker',
] as const;

type RpcHandlers = {
  getLocation: () => string;
  navigate: (location: string) => void | Promise<void>;
  back: () => void | Promise<void>;
  forward: () => void | Promise<void>;
};

type RpcRequest = {
  type: 'request';
  id: string;
  method:
    | 'getLocation'
    | 'navigate'
    | 'back'
    | 'forward'
    | 'startElementPicker'
    | 'stopElementPicker';
  params?: { location?: string };
};

export class WireframePreviewClientRpc {
  private port: MessagePort | null = null;
  private started = false;
  private readonly handlers: RpcHandlers;
  private readonly parentOrigin: string | null;

  constructor(handlers: RpcHandlers) {
    this.handlers = handlers;
    this.parentOrigin = resolveParentOrigin();
  }

  start() {
    if (this.started || window.parent === window || !this.parentOrigin) return;

    this.started = true;
    window.addEventListener('message', this.handleWindowMessage);
    window.parent.postMessage(
      {
        channel: WIRE_FRAME_RPC_CHANNEL,
        type: 'ready',
        version: WIRE_FRAME_RPC_VERSION,
        capabilities: [...WIRE_FRAME_RPC_CAPABILITIES],
      },
      this.parentOrigin
    );
  }

  stop() {
    stopElementPicker();
    window.removeEventListener('message', this.handleWindowMessage);
    this.port?.removeEventListener('message', this.handlePortMessage);
    this.port?.close();
    this.port = null;
    this.started = false;
  }

  notifyLocationChanged(location = this.handlers.getLocation()) {
    if (!isPreviewLocation(location)) return;
    this.port?.postMessage({
      type: 'notification',
      event: 'locationChanged',
      location,
    });
  }

  private readonly handleWindowMessage = (event: MessageEvent) => {
    if (
      event.source !== window.parent ||
      event.origin !== this.parentOrigin ||
      !isConnectMessage(event.data) ||
      event.ports.length !== 1
    ) {
      return;
    }

    this.port?.removeEventListener('message', this.handlePortMessage);
    this.port?.close();

    this.port = event.ports[0];
    this.port.addEventListener('message', this.handlePortMessage);
    this.port.start();
    this.notifyLocationChanged();
  };

  private readonly handlePortMessage = (event: MessageEvent) => {
    if (!isRpcRequest(event.data)) return;
    const port = event.currentTarget as MessagePort;
    void this.executeRequest(event.data, port);
  };

  private async executeRequest(request: RpcRequest, port: MessagePort) {
    try {
      let result: string | undefined;

      switch (request.method) {
        case 'getLocation':
          result = this.handlers.getLocation();
          break;
        case 'navigate': {
          const location = request.params?.location;
          if (!location || !isPreviewLocation(location)) {
            throw new Error('Invalid preview location');
          }
          await this.handlers.navigate(location);
          break;
        }
        case 'back':
          await this.handlers.back();
          break;
        case 'forward':
          await this.handlers.forward();
          break;
        case 'startElementPicker':
          startElementPicker({
            pick: (element) => {
              port.postMessage({
                type: 'notification',
                event: 'elementPicked',
                element,
              });
            },
            cancel: () => {
              port.postMessage({
                type: 'notification',
                event: 'elementPickerCancelled',
              });
            },
          });
          break;
        case 'stopElementPicker':
          stopElementPicker();
          break;
      }

      port.postMessage({
        type: 'response',
        id: request.id,
        result,
      });
    } catch (error) {
      port.postMessage({
        type: 'response',
        id: request.id,
        error: error instanceof Error ? error.message : 'RPC request failed',
      });
    }
  }
}

function resolveParentOrigin() {
  const storageKey = 'prodios:wireframe-parent-origin';

  try {
    if (document.referrer) {
      const origin = new URL(document.referrer).origin;
      sessionStorage.setItem(storageKey, origin);
      return origin;
    }

    return sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function isConnectMessage(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    value.channel === WIRE_FRAME_RPC_CHANNEL &&
    value.type === 'connect' &&
    value.version === WIRE_FRAME_RPC_VERSION
  );
}

function isRpcRequest(value: unknown): value is RpcRequest {
  if (!isRecord(value)) return false;
  return (
    value.type === 'request' &&
    typeof value.id === 'string' &&
    [
      'getLocation',
      'navigate',
      'back',
      'forward',
      'startElementPicker',
      'stopElementPicker',
    ].includes(String(value.method))
  );
}

function isPreviewLocation(value: string) {
  return value.startsWith('/') && !value.startsWith('//');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
