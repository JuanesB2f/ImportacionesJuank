"use client";

import type { ReferenceGroup } from "@/domain/reference-groups";

export function FamilyGroupsPanel({
  groups,
  selectedPrefixes,
  onToggle,
  onSelectAll,
  onClear,
}: {
  groups: ReferenceGroup[];
  selectedPrefixes: string[];
  onToggle: (prefix: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Familias (SK, PLZ, CRG…)
          </h2>
          <p className="text-xs text-zinc-500">
            Agrupa referencias para trabajarlas juntas. Cada referencia sigue
            siendo un producto.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
          >
            Todas
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
          >
            Ninguna
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const checked = selectedPrefixes.includes(g.prefix);
          return (
            <label
              key={g.prefix}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                checked
                  ? "border-teal-500 bg-teal-50"
                  : "border-zinc-100 hover:bg-zinc-50"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(g.prefix)}
                className="mt-1"
              />
              <span>
                <span className="block font-semibold text-zinc-900">
                  {g.prefix}
                </span>
                <span className="block text-xs text-zinc-500">
                  {g.productCount} productos · {g.variantCount} variantes
                </span>
                <span className="mt-1 block font-mono text-[10px] text-zinc-400">
                  {g.references.slice(0, 6).join(", ")}
                  {g.references.length > 6 ? "…" : ""}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
