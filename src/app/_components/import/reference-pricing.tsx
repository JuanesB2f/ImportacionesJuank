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
    <div className="ios-card p-4 sm:p-5">
      <h2 className="mb-2 text-sm font-semibold text-ios-label">
        Precios e imagen por color
      </h2>
      <p className="mb-3 text-xs text-ios-muted">
        Cada referencia (CRG001) es un producto. Variantes = Color + Talla. Una
        foto por color cubre todas las tallas. La categoría del menú se elige
        con la colección al publicar.
      </p>

      <ul className="mb-4 grid gap-2 text-xs text-ios-muted sm:grid-cols-2 lg:grid-cols-4">
        {PRICE_RULES.map((rule) => (
          <li
            key={rule.key}
            className="rounded-ios-sm border border-ios-separator/50 bg-ios-secondary/50 px-3 py-2"
          >
            <p className="font-semibold text-ios-label">
              {rule.label}{" "}
              <span className="font-normal text-ios-muted">({rule.range})</span>
            </p>
            <p className="mt-0.5">{rule.description}</p>
          </li>
        ))}
      </ul>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          value={refQuery}
          onChange={(e) => onRefQueryChange(e.target.value)}
          placeholder="Filtrar referencia… ej. PLZ008"
          className="ios-input min-w-0 flex-1 sm:min-w-56"
        />
        <button
          type="button"
          onClick={onSelectVisible}
          className="ios-btn ios-btn-secondary"
        >
          Seleccionar filtradas
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="ios-btn ios-btn-secondary"
        >
          Limpiar selección
        </button>
      </div>

      <div className="mb-4 max-h-48 space-y-1 overflow-auto rounded-ios-sm border border-ios-separator/50 p-2">
        {filteredReferences.length === 0 ? (
          <p className="px-2 py-3 text-sm text-ios-muted">
            No hay referencias con ese filtro.
          </p>
        ) : (
          filteredReferences.map((p) => {
            const colors = colorsOfProduct(p);
            const withImg = colors.filter((c) => getColorImage(p, c)).length;
            return (
              <label
                key={p.reference}
                className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-sm hover:bg-ios-fill"
              >
                <input
                  type="checkbox"
                  checked={selectedRefs.includes(p.reference)}
                  onChange={() => onToggleRef(p.reference)}
                  className="accent-ios-blue"
                />
                <span className="w-10 font-semibold text-ios-blue">
                  {extractReferencePrefix(p.reference)}
                </span>
                <span className="font-medium text-ios-label">{p.reference}</span>
                <span className="text-xs text-ios-muted">
                  {p.variants.length} var. · {colors.length} colores · Detal $
                  {p.variants[0]?.priceRetail?.toFixed(2) ?? "0.00"}
                </span>
                {withImg > 0 ? (
                  <span className="text-xs text-ios-blue sm:ml-auto">
                    ✓ {withImg}/{colors.length} fotos
                  </span>
                ) : null}
              </label>
            );
          })
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRICE_FIELDS.map(({ field, key }) => {
          const rule = PRICE_RULES.find((r) => r.key === key)!;
          return (
            <label key={field} className="text-xs text-ios-muted">
              {rule.label}
              <input
                type="number"
                min={0}
                step="0.01"
                value={bulkPrices[field]}
                onChange={(e) => onBulkPriceChange(field, e.target.value)}
                className="ios-input mt-1"
                placeholder="0.00"
              />
            </label>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onApplyPrices}
          disabled={selectedRefs.length === 0}
          className="ios-btn ios-btn-primary"
        >
          Aplicar precios a {pricedTargets.length} referencia
          {pricedTargets.length === 1 ? "" : "s"}
        </button>
        <span className="text-xs text-ios-muted">
          Cada variante de la referencia recibe el mismo precio unitario.
        </span>
      </div>

      <div className="mt-5 border-t border-ios-separator/50 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-ios-label">
          Foto por color (1 por color de la referencia)
        </h3>
        <p className="mb-3 text-xs text-ios-muted">
          No hace falta una foto por talla: si hay Negro M/L/XL, subes una sola
          foto negra.
        </p>
        {pricedTargets.length === 0 ? (
          <p className="text-sm text-ios-muted">
            Selecciona referencias arriba para cargar imágenes por color.
          </p>
        ) : (
          <div className="space-y-4">
            {pricedTargets.slice(0, 8).map((p) => (
              <div
                key={`colors-${p.reference}`}
                className="rounded-ios-sm border border-ios-separator/50 bg-ios-secondary/30 p-3"
              >
                <p className="mb-2 text-sm font-medium text-ios-label">
                  {p.reference}
                  <span className="ml-2 font-normal text-ios-muted">
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
                        className="flex items-center gap-3 rounded-ios-sm border border-ios-separator/40 bg-ios-elevated px-3 py-2"
                      >
                        {img?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img.url}
                            alt={`${p.reference} ${color}`}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ios-fill text-[10px] text-ios-faint">
                            sin img
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ios-label">
                            {color}
                          </p>
                          <p className="text-[10px] text-ios-faint">
                            {
                              p.variants.filter((v) => v.option1Value === color)
                                .length
                            }{" "}
                            tallas
                          </p>
                          <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-ios-blue">
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
              <p className="text-xs text-ios-muted">
                Mostrando 8 de {pricedTargets.length} referencias seleccionadas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
