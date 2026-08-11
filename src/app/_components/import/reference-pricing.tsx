"use client";

import type { CatalogProduct } from "@/domain/catalog";
import { colorsOfProduct, getColorImage } from "@/domain/catalog";
import { PRICE_RULES } from "@/domain/pricing";
import { extractReferencePrefix } from "@/domain/reference-groups";
import {
  PRICE_FIELDS,
  type BulkPrices,
  type PriceField,
} from "./types";

export function ReferencePricingPanel({
  filteredReferences,
  selectedRefs,
  pricedTargets,
  bulkPrices,
  refQuery,
  uploadingKey,
  onRefQueryChange,
  onToggleRef,
  onSelectVisible,
  onClearSelection,
  onBulkPriceChange,
  onApplyPrices,
  onUploadColorImage,
}: {
  filteredReferences: CatalogProduct[];
  selectedRefs: string[];
  pricedTargets: CatalogProduct[];
  bulkPrices: BulkPrices;
  refQuery: string;
  /** `REFERENCE||COLOR` mientras sube */
  uploadingKey: string | null;
  onRefQueryChange: (q: string) => void;
  onToggleRef: (reference: string) => void;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onBulkPriceChange: (field: PriceField, value: string) => void;
  onApplyPrices: () => void;
  onUploadColorImage: (reference: string, color: string, file: File) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">
        Precios e imagen por color
      </h2>
      <p className="mb-3 text-xs text-zinc-500">
        Cada referencia (CRG001) es un producto. Variantes = Color + Talla. Una
        foto por color cubre todas las tallas. La categoría del menú se elige
        con la colección al publicar.
      </p>

      <ul className="mb-4 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
        {PRICE_RULES.map((rule) => (
          <li
            key={rule.key}
            className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
          >
            <p className="font-semibold text-zinc-800">
              {rule.label}{" "}
              <span className="font-normal text-zinc-500">({rule.range})</span>
            </p>
            <p>{rule.description}</p>
          </li>
        ))}
      </ul>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={refQuery}
          onChange={(e) => onRefQueryChange(e.target.value)}
          placeholder="Filtrar referencia… ej. PLZ008"
          className="min-w-56 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onSelectVisible}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          Seleccionar filtradas
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          Limpiar selección
        </button>
      </div>

      <div className="mb-4 max-h-48 space-y-1 overflow-auto rounded-lg border border-zinc-100 p-2">
        {filteredReferences.length === 0 ? (
          <p className="px-2 py-3 text-sm text-zinc-500">
            No hay referencias con ese filtro.
          </p>
        ) : (
          filteredReferences.map((p) => {
            const colors = colorsOfProduct(p);
            const withImg = colors.filter((c) => getColorImage(p, c)).length;
            return (
              <label
                key={p.reference}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  checked={selectedRefs.includes(p.reference)}
                  onChange={() => onToggleRef(p.reference)}
                />
                <span className="w-10 font-semibold text-teal-800">
                  {extractReferencePrefix(p.reference)}
                </span>
                <span className="font-medium text-zinc-900">{p.reference}</span>
                <span className="text-xs text-zinc-500">
                  {p.variants.length} var. · {colors.length} colores · Detal $
                  {p.variants[0]?.priceRetail?.toFixed(2) ?? "0.00"}
                </span>
                {withImg > 0 ? (
                  <span className="ml-auto text-xs text-teal-700">
                    ✓ {withImg}/{colors.length} fotos
                  </span>
                ) : null}
              </label>
            );
          })
        )}
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        {PRICE_FIELDS.map(({ field, key }) => {
          const rule = PRICE_RULES.find((r) => r.key === key)!;
          return (
            <label key={field} className="text-xs text-zinc-600">
              {rule.label}
              <input
                type="number"
                min={0}
                step="0.01"
                value={bulkPrices[field]}
                onChange={(e) => onBulkPriceChange(field, e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
                placeholder="0.00"
              />
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onApplyPrices}
          disabled={selectedRefs.length === 0}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Aplicar precios a {pricedTargets.length} referencia
          {pricedTargets.length === 1 ? "" : "s"}
        </button>
        <span className="text-xs text-zinc-500">
          Cada variante de la referencia recibe el mismo precio unitario.
        </span>
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-900">
          Foto por color (1 por color de la referencia)
        </h3>
        <p className="mb-3 text-xs text-zinc-500">
          No hace falta una foto por talla: si hay Negro M/L/XL, subes una sola
          foto negra.
        </p>
        {pricedTargets.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Selecciona referencias arriba para cargar imágenes por color.
          </p>
        ) : (
          <div className="space-y-4">
            {pricedTargets.slice(0, 8).map((p) => (
              <div
                key={`colors-${p.reference}`}
                className="rounded-lg border border-zinc-100 p-3"
              >
                <p className="mb-2 text-sm font-medium text-zinc-900">
                  {p.reference}
                  <span className="ml-2 font-normal text-zinc-500">
                    {p.title}
                  </span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {colorsOfProduct(p).map((color) => {
                    const img = getColorImage(p, color);
                    const key = `${p.reference}||${color}`;
                    const uploading = uploadingKey === key;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2"
                      >
                        {img?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.url}
                            alt={`${p.reference} ${color}`}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-400">
                            sin img
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{color}</p>
                          <p className="text-[10px] text-zinc-400">
                            {
                              p.variants.filter((v) => v.option1Value === color)
                                .length
                            }{" "}
                            tallas
                          </p>
                          <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-teal-700">
                            {uploading
                              ? "Subiendo…"
                              : img?.url
                                ? "Cambiar"
                                : "Cargar foto"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploading}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onUploadColorImage(p.reference, color, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {pricedTargets.length > 8 && (
              <p className="text-xs text-zinc-500">
                Mostrando 8 de {pricedTargets.length} referencias seleccionadas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
