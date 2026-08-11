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
    <div className="ios-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ios-label">
            Familias (SK, PLZ, CRG…)
          </h2>
          <p className="text-xs text-ios-muted">
            Agrupa referencias para trabajarlas juntas. Cada referencia sigue
            siendo un producto.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="ios-btn ios-btn-secondary px-2.5! py-1! text-xs">
            Todas
          </button>
          <button type="button" onClick={onClear} className="ios-btn ios-btn-secondary px-2.5! py-1! text-xs">
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
              className={`flex cursor-pointer items-start gap-3 rounded-ios-sm border px-3 py-3 transition ${
                checked
                  ? "border-ios-blue bg-ios-blue/15"
                  : "border-ios-separator/60 bg-ios-secondary/40 hover:bg-ios-fill"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(g.prefix)}
                className="mt-1 accent-ios-blue"
              />
              <span className="min-w-0">
                <span className="block font-semibold text-ios-label">
                  {g.prefix}
                </span>
                <span className="block text-xs text-ios-muted">
                  {g.productCount} productos · {g.variantCount} variantes
                </span>
                <span className="mt-1 block truncate font-mono text-[10px] text-ios-faint">
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
