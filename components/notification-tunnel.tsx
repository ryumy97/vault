"use client";

import tunnel from "@/components/ui/tunnel";
import { createContext, useContext, useState } from "react";

/**
 * Singleton tunnel: render content with {@link notificationTunnel.In} anywhere in the tree;
 * it appears at {@link NotificationTunnelOutlet} (fixed top-right).
 *
 * When using multiple `In` nodes, put a stable `key` on the root child (tunnel-rat / React).
 *
 * @example
 * ```tsx
 * <notificationTunnel.In>
 *   <Card key={id} size="sm">…</Card>
 * </notificationTunnel.In>
 * ```
 */
export const notificationTunnel = tunnel();

const NotificationTunnelContext = createContext<{
  expand: boolean;
  setExpand: (expand: boolean) => void;
}>({
  expand: false,
  setExpand: () => {},
});

export function useNotificationTunnel() {
  return useContext(NotificationTunnelContext);
}

/**
 * Mount once in the root layout (sibling to `children`) so tunneled notifications have a target.
 */
export function NotificationTunnelOutlet() {
  const [expand, setExpand] = useState(false);

  return (
    <NotificationTunnelContext.Provider value={{ expand, setExpand }}>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 *:pointer-events-auto w-[min(100%-2rem,24rem)]"
        aria-live="polite"
        aria-relevant="additions removals"
      >
        <notificationTunnel.Out />
      </div>
    </NotificationTunnelContext.Provider>
  );
}
