import type { ReactNode } from "react";
import { AppNav } from "./app-nav";

const paths = ["/", "/nuevo", "/catalogo", "/precios"] as const;

export function AppShell({
  current,
  children,
}: {
  current: (typeof paths)[number];
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-ios-bg text-ios-label">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(10,132,255,0.18),transparent_55%)]"
      />
      <AppNav current={current} />
      <div className="relative ios-page pb-(--nav-bottom) md:pb-10">
        {children}
      </div>
    </div>
  );
}
