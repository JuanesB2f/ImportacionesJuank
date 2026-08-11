"use client";

import Link from "next/link";

const links = [
  {
    href: "/",
    label: "Importar",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path
          d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/nuevo",
    label: "Nueva",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/catalogo",
    label: "Catálogo",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path
          d="M4 7.5A2.5 2.5 0 0 1 6.5 5H20v12.5A2.5 2.5 0 0 1 17.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-10Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 9h8M8 13h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/precios",
    label: "Precios",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path
          d="M12 3v18M16.5 7.5c0-1.5-1.8-2.5-4.5-2.5S7.5 6 7.5 7.75 9.5 10.5 12 11.25s4.5 1.5 4.5 3.25S14.7 18 12 18s-4.5-1-4.5-2.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

export function AppNav({
  current,
}: {
  current: (typeof links)[number]["href"];
}) {
  return (
    <>
      {/* Top bar — desktop / tablet */}
      <header className="sticky top-0 z-40 hidden border-b border-ios-separator/80 bg-ios-bg/75 backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight text-ios-blue">
              ImportacionesJuank
            </p>
            <p className="truncate text-xs text-ios-muted">PIM → Shopify</p>
          </div>
          <nav className="flex shrink-0 gap-1 rounded-full bg-ios-secondary p-1">
            {links.map((link) => {
              const active = current === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-ios-tertiary text-ios-label shadow-sm"
                      : "text-ios-muted hover:text-ios-label"
                  }`}
                >
                  {link.label === "Nueva" ? "Nueva prenda" : link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Brand strip — mobile */}
      <div className="sticky top-0 z-30 border-b border-ios-separator/60 bg-ios-bg/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <p className="text-[13px] font-semibold tracking-tight text-ios-blue">
          ImportacionesJuank
        </p>
        <p className="text-xs text-ios-muted">PIM → Shopify</p>
      </div>

      {/* Tab bar — mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ios-separator/80 bg-ios-elevated/90 backdrop-blur-2xl md:hidden"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {links.map((link) => {
            const active = current === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition ${
                    active ? "text-ios-blue" : "text-ios-muted"
                  }`}
                >
                  <span
                    className={`rounded-xl px-3 py-0.5 transition ${
                      active ? "bg-ios-blue/15" : ""
                    }`}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
