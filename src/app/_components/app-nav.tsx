import Link from "next/link";

const links = [
  { href: "/", label: "Importar" },
  { href: "/nuevo", label: "Nueva prenda" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/precios", label: "Precios" },
] as const;

export function AppNav({
  current,
}: {
  current: (typeof links)[number]["href"];
}) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-teal-700">
            ImportacionesJuank PIM
          </p>
          <p className="text-sm text-zinc-500">
            Controlador de catálogo → Shopify
          </p>
        </div>
        <nav className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          {links.map((link) => {
            const active = current === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
