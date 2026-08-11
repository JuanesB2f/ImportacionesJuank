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
            className={`rounded-ios border p-4 text-left transition active:scale-[0.98] ${
              active
                ? "border-ios-blue bg-ios-blue/15 ring-2 ring-ios-blue/25"
                : "border-ios-separator bg-ios-elevated hover:border-ios-tertiary"
            }`}
          >
            <p className="font-semibold text-ios-label">{mode.title}</p>
            <p className="mt-1 text-sm text-ios-muted">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
}
