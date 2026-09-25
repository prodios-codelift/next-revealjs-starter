'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WireframePreviewClientRpc } from '@/lib/wireframe-rpc';

export function WireframePreviewBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rpcRef = useRef<WireframePreviewClientRpc>(null);

  useEffect(
    function connectWireframePreviewRpc() {
      const rpc = new WireframePreviewClientRpc({
        getLocation: currentLocation,
        navigate: (location) => {
          // reveal.js moves slides on `hashchange`, which router.push does not fire.
          const target = new URL(location, window.location.href);
          if (
            target.pathname === window.location.pathname &&
            target.search === window.location.search
          ) {
            window.location.hash = target.hash || '#/';
            return;
          }
          router.push(location);
        },
        back: () => router.back(),
        forward: () => router.forward(),
      });

      rpcRef.current = rpc;
      rpc.start();

      return () => {
        rpc.stop();
        if (rpcRef.current === rpc) rpcRef.current = null;
      };
    },
    [router]
  );

  useEffect(
    function publishRouteChange() {
      rpcRef.current?.notifyLocationChanged(currentLocation());
    },
    [pathname, searchParams]
  );

  useEffect(function publishHashChanges() {
    function handleHashChange() {
      rpcRef.current?.notifyLocationChanged(currentLocation());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(function publishHistoryWrites() {
    // reveal.js writes the slide hash with (throttled) history.replaceState,
    // which fires no event; publish after every history write instead.
    const { pushState, replaceState } = window.history;
    const notify = () => rpcRef.current?.notifyLocationChanged(currentLocation());

    window.history.pushState = function (...args: Parameters<History['pushState']>) {
      pushState.apply(this, args);
      notify();
    };
    window.history.replaceState = function (...args: Parameters<History['replaceState']>) {
      replaceState.apply(this, args);
      notify();
    };

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);

  return null;
}

function currentLocation() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
