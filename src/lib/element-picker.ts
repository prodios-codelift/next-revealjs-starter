export type ElementPickerBridge = {
  pick: (element: unknown) => void;
  cancel: () => void;
};

const MAX_TEXT = 200;
const MAX_HTML = 1500;

type SourceLocation = {
  fileName?: string;
  lineNumber?: number | null;
  columnNumber?: number | null;
};

type ReactFiber = {
  type?: unknown;
  return?: ReactFiber | null;
  _debugSource?: SourceLocation;
  memoizedProps?: { __source?: SourceLocation };
};

type ReactInfo = {
  componentName: string | null;
  sourceFile: string | null;
  sourceLine: number | null;
  sourceColumn: number | null;
};

let activeBridge: ElementPickerBridge | null = null;
let stopActivePicker: (() => void) | null = null;

export function startElementPicker(bridge: ElementPickerBridge) {
  activeBridge = bridge;
  if (stopActivePicker) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'pointer-events:none',
    'background:rgba(80,150,255,0.25)',
    'border:1px solid rgba(80,150,255,0.95)',
    'border-radius:2px',
    'transition:all 0.04s ease-out',
  ].join(';');

  const label = document.createElement('div');
  label.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'pointer-events:none',
    'background:#1e1e1e',
    'color:#fff',
    'font:11px/1.4 ui-monospace,monospace',
    'padding:2px 6px',
    'border-radius:3px',
    'white-space:nowrap',
    'box-shadow:0 1px 4px rgba(0,0,0,0.4)',
  ].join(';');

  const cursorStyle = document.createElement('style');
  cursorStyle.textContent = '*{cursor:crosshair !important}';

  let current: Element | null = null;

  const onMove = (event: MouseEvent) => {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || target === overlay || target === label) return;
    current = target;
    const rect = target.getBoundingClientRect();
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    const moveInfo = getReactInfo(target);
    const componentSuffix = moveInfo.componentName
      ? `  <${moveInfo.componentName}>`
      : '';
    label.textContent = `${describe(target)}${componentSuffix}  ${Math.round(rect.width)}×${Math.round(rect.height)}`;
    const labelTop = rect.top > 22 ? rect.top - 20 : rect.bottom + 4;
    label.style.left = `${Math.max(0, rect.left)}px`;
    label.style.top = `${labelTop}px`;
  };

  const onClick = (event: MouseEvent) => {
    const target = current || event.target;
    if (
      !(target instanceof Element) ||
      target === overlay ||
      target === label
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    activeBridge?.pick(buildPayload(target));
    stop();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    activeBridge?.cancel();
    stop();
  };

  const stop = () => {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    label.remove();
    cursorStyle.remove();
    activeBridge = null;
    stopActivePicker = null;
  };

  stopActivePicker = stop;
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.documentElement.appendChild(cursorStyle);
  document.body.appendChild(overlay);
  document.body.appendChild(label);
}

export function stopElementPicker() {
  stopActivePicker?.();
}

function cssPath(el: Element) {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && parts.length < 6) {
    let selector = node.nodeName.toLowerCase();
    if (node.id) {
      selector += `#${CSS.escape(node.id)}`;
      parts.unshift(selector);
      break;
    }
    const parent = node.parentNode;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.nodeName === node?.nodeName
      );
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
    }
    parts.unshift(selector);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function describe(el: Element) {
  let out = el.nodeName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  if (el.classList.length) out += `.${Array.from(el.classList).join('.')}`;
  return out;
}

function normalizeSourceFile(fileName: string | null | undefined) {
  if (!fileName || typeof fileName !== 'string') return null;
  let file = fileName.split('?')[0] ?? '';
  const marker = 'next-revealjs-starter/';
  const markerIndex = file.indexOf(marker);
  if (markerIndex !== -1)
    return file.slice(markerIndex + marker.length) || null;
  const srcIndex = file.lastIndexOf('/src/');
  if (srcIndex !== -1) return file.slice(srcIndex + 1) || null;
  return file || null;
}

function getFiber(el: Element): ReactFiber | null {
  const record = el as unknown as Record<string, unknown>;
  for (const key in record) {
    if (
      key.startsWith('__reactFiber$') ||
      key.startsWith('__reactInternalInstance$')
    ) {
      return record[key] as ReactFiber;
    }
  }
  return null;
}

function getNearestFiber(el: Element) {
  let node: Element | null = el;
  while (node) {
    const fiber = getFiber(node);
    if (fiber) return fiber;
    node = node.parentElement;
  }
  return null;
}

function componentNameFromType(type: unknown) {
  if (!type || typeof type === 'string') return null;
  if (typeof type !== 'function' && typeof type !== 'object') return null;
  const typed = type as {
    displayName?: string;
    name?: string;
    render?: { displayName?: string; name?: string };
    type?: { displayName?: string; name?: string };
  };
  return (
    typed.displayName ||
    typed.name ||
    typed.render?.displayName ||
    typed.render?.name ||
    typed.type?.displayName ||
    typed.type?.name ||
    null
  );
}

function getReactInfo(el: Element): ReactInfo {
  const info: ReactInfo = {
    componentName: null,
    sourceFile: null,
    sourceLine: null,
    sourceColumn: null,
  };
  const inspected = el.closest('[data-inspector-relative-path]');
  if (inspected) {
    info.sourceFile = inspected.getAttribute('data-inspector-relative-path');
    info.sourceLine =
      Number(inspected.getAttribute('data-inspector-line')) || null;
    info.sourceColumn =
      Number(inspected.getAttribute('data-inspector-column')) || null;
    info.componentName = inspected.getAttribute('data-inspector-component');
  }
  let node = getNearestFiber(el);
  let depth = 0;
  while (node && depth < 80) {
    if (!info.componentName) {
      info.componentName = componentNameFromType(node.type);
    }
    if (!info.sourceFile) {
      const source = node._debugSource || node.memoizedProps?.__source;
      if (source?.fileName) {
        info.sourceFile = normalizeSourceFile(source.fileName);
        info.sourceLine = source.lineNumber ?? null;
        info.sourceColumn = source.columnNumber ?? null;
      }
    }
    if (info.componentName && info.sourceFile) break;
    node = node.return ?? null;
    depth += 1;
  }
  if (info.sourceFile) info.sourceFile = normalizeSourceFile(info.sourceFile);
  return info;
}

function buildPayload(target: Element) {
  const reactInfo = getReactInfo(target);
  const text = (target.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
  const outerHTML = (target.outerHTML || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_HTML);
  return {
    route: location.pathname + location.search + location.hash,
    selector: cssPath(target),
    tagName: target.nodeName.toLowerCase(),
    id: target.id || null,
    classes: Array.from(target.classList),
    text,
    componentName: reactInfo.componentName,
    sourceFile: reactInfo.sourceFile,
    sourceLine: reactInfo.sourceLine,
    sourceColumn: reactInfo.sourceColumn,
    outerHTML,
  };
}
