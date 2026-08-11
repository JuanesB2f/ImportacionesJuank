"use client";

import type { ImportMode } from "@/domain/import-mode";

const MODES: Array<{
  id: ImportMode;
  title: string;
  description: string;
}> = [
  {
    id: "replace",
    title: "Cargar desde 0",
    description:
      "El stock del Excel reemplaza el de Shopify en esas referencias.",
  },
  {
    id: "update",
    title: "Actualizar inventario",
    description:
      "Suma cantidades a lo existente y agrega referencias o tallas nuevas.",
  },
];

export function ImportModeSelector({
  value,
  onChange,
}: {
  value: ImportMode;
  onChange: (mode: ImportMode) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-teal-600 bg-teal-50 ring-2 ring-teal-600/20"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="font-semibold text-zinc-900">{mode.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
