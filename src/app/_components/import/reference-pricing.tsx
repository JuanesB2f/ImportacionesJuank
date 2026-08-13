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

export type PricingMode = "single" | "bulk";

function filledPriceLabels(p: CatalogProduct): string[] {
  const v = p.variants[0];
  if (!v) return [];
  const labels: string[] = [];
  if (v.priceRetail > 0) labels.push("Detal");
  if (v.priceEntrepreneur > 0) labels.push("Empr.");
  if (v.priceWholesale > 0) labels.push("Mayor.");
  if (v.priceDistributor > 0) labels.push("Distr.");
  return labels;
}

function ColorPhotoSlots({
  product,
  uploadingKey,
  onUpload,
}: {
  product: CatalogProduct;
  uploadingKey: string | null;
  onUpload: (reference: string, color: string, file: File) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {colorsOfProduct(product).map((color) => {
        const img = getColorImage(product, color);
        const key = `${product.reference}||${color}`;
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
                alt={`${product.reference} ${color}`}
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
                  product.variants.filter((v) => v.option1Value === color)
                    .length
                }{" "}
                tallas
              </p>
              <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-ios-blue">
                {uploading ? "Subiendo…" : img?.url ? "Cambiar" : "Cargar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(product.reference, color, f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BulkColorApply({
  products,
  uploadingKey,
  onUploadMany,
}: {
  products: CatalogProduct[];
  uploadingKey: string | null;
  onUploadMany: (references: string[], color: string, file: File) => void;
}) {
  const colorMap = new Map<string, string[]>();
  for (const p of products) {
    for (const color of colorsOfProduct(p)) {
      const list = colorMap.get(color) ?? [];
      list.push(p.reference);
      colorMap.set(color, list);
    }
  }
  const colors = [...colorMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (colors.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-ios-label">
          Foto masiva por color
        </h3>
        <p className="text-xs text-ios-muted">
          Sube una foto y se aplica a todas las referencias seleccionadas que
          tengan ese color.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {colors.map(([color, refs]) => {
          const key = `bulk||${color}||${refs.length}`;
          const uploading = uploadingKey === key;
          const withImg = refs.filter((ref) => {
            const p = products.find((x) => x.reference === ref);
            return p ? Boolean(getColorImage(p, color)?.url) : false;
          }).length;
          return (
            <div
              key={color}
              className="rounded-ios-sm border border-ios-separator/40 bg-ios-elevated px-3 py-3"
            >
              <p className="text-sm font-medium text-ios-label">{color}</p>
              <p className="text-xs text-ios-muted">
                {refs.length} ref. · {withImg}/{refs.length} con foto
              </p>
              <label className="mt-2 inline-block cursor-pointer text-xs font-medium text-ios-blue">
                {uploading ? "Subiendo…" : "Cargar a todas"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadMany(refs, color, f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReferencePricingPanel({
  mode,
  filteredReferences,
  activeReference,
  activeProduct,
  selectedRefs,
  bulkProducts,
  bulkPrices,
  refQuery,
  uploadingKey,
  savedFlash,
  onModeChange,
  onRefQueryChange,
  onSelectReference,
  onToggleBulkRef,
  onSelectAllVisible,
  onClearBulkSelection,
  onBulkPriceChange,
  onSavePrices,
  onSaveAndNext,
  onApplyBulkPrices,
  onUploadColorImage,
}: {
  mode: PricingMode;
  filteredReferences: CatalogProduct[];
  activeReference: string | null;
  activeProduct: CatalogProduct | null;
  selectedRefs: string[];
  bulkProducts: CatalogProduct[];
  bulkPrices: BulkPrices;
  refQuery: string;
  uploadingKey: string | null;
  savedFlash: string | null;
  onModeChange: (mode: PricingMode) => void;
  onRefQueryChange: (q: string) => void;
  onSelectReference: (reference: string) => void;
  onToggleBulkRef: (reference: string) => void;
  onSelectAllVisible: () => void;
  onClearBulkSelection: () => void;
  onBulkPriceChange: (field: PriceField, value: string) => void;
  onSavePrices: () => void;
  onSaveAndNext: () => void;
  onApplyBulkPrices: () => void;
  onUploadColorImage: (
    references: string | string[],
    color: string,
    file: File
  ) => void;
}) {
  const pricedCount = filteredReferences.filter(
    (p) => filledPriceLabels(p).length > 0
  ).length;
  const completeCount = filteredReferences.filter(
    (p) => filledPriceLabels(p).length === 4
  ).length;
  const selectedSet = new Set(selectedRefs);

  return (
    <div className="ios-card p-4 sm:p-5">
      <h2 className="mb-2 text-sm font-semibold text-ios-label">
        Precios e imágenes
      </h2>

      <div className="mb-3 flex w-full max-w-md rounded-full bg-ios-secondary p-1">
        <button
          type="button"
          onClick={() => onModeChange("single")}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            mode === "single"
              ? "bg-ios-tertiary text-ios-label shadow-sm"
              : "text-ios-muted"
          }`}
        >
          Una a una
        </button>
        <button
          type="button"
          onClick={() => onModeChange("bulk")}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            mode === "bulk"
              ? "bg-ios-tertiary text-ios-label shadow-sm"
              : "text-ios-muted"
          }`}
        >
          Masivo
        </button>
      </div>

      <p className="mb-3 text-xs text-ios-muted">
        {mode === "single"
          ? "Una referencia: precios (solo los que llenes) + fotos por color. Luego puedes pasar a la siguiente."
          : "Varias referencias: precios masivos y fotos por color (individual o la misma foto a todas las que compartan color)."}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ios-muted">
        <span className="rounded-full bg-ios-secondary px-2.5 py-1">
          {pricedCount}/{filteredReferences.length} con algún precio
        </span>
        <span className="rounded-full bg-ios-secondary px-2.5 py-1">
          {completeCount} con los 4
        </span>
        {mode === "bulk" ? (
          <span className="rounded-full bg-ios-secondary px-2.5 py-1">
            {selectedRefs.length} seleccionadas
          </span>
        ) : null}
        {savedFlash ? (
          <span className="text-ios-green">✓ {savedFlash}</span>
        ) : null}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          value={refQuery}
          onChange={(e) => onRefQueryChange(e.target.value)}
          placeholder="Filtrar referencia… ej. PLZ008"
          className="ios-input min-w-0 flex-1 sm:min-w-56"
        />
        {mode === "bulk" ? (
          <>
            <button
              type="button"
              onClick={onSelectAllVisible}
              className="ios-btn ios-btn-secondary"
            >
              Seleccionar filtradas
            </button>
            <button
              type="button"
              onClick={onClearBulkSelection}
              className="ios-btn ios-btn-secondary"
            >
              Limpiar selección
            </button>
          </>
        ) : null}
      </div>

      <div className="mb-4 max-h-52 space-y-1 overflow-auto rounded-ios-sm border border-ios-separator/50 p-2">
        {filteredReferences.length === 0 ? (
          <p className="px-2 py-3 text-sm text-ios-muted">
            No hay referencias con ese filtro.
          </p>
        ) : (
          filteredReferences.map((p) => {
            const filled = filledPriceLabels(p);
            const colors = colorsOfProduct(p);
            const withImg = colors.filter((c) => getColorImage(p, c)).length;
            const active =
              mode === "single"
                ? activeReference === p.reference
                : selectedSet.has(p.reference);

            const statusBadge =
              filled.length === 4 ? (
                <span className="text-xs font-medium text-ios-green sm:ml-auto">
                  ✓ 4 precios
                </span>
              ) : filled.length > 0 ? (
                <span className="text-xs text-ios-blue sm:ml-auto">
                  {filled.join(" · ")}
                </span>
              ) : (
                <span className="text-xs text-ios-orange sm:ml-auto">
                  Sin precios
                </span>
              );

            if (mode === "bulk") {
              return (
                <label
                  key={p.reference}
                  className={`flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-sm transition ${
                    active
                      ? "bg-ios-blue/15 ring-1 ring-ios-blue/40"
                      : "hover:bg-ios-fill"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(p.reference)}
                    onChange={() => onToggleBulkRef(p.reference)}
                    className="accent-ios-blue"
                  />
                  <span className="w-10 font-semibold text-ios-blue">
                    {extractReferencePrefix(p.reference)}
                  </span>
                  <span className="font-medium text-ios-label">
                    {p.reference}
                  </span>
                  <span className="text-xs text-ios-muted">
                    Detal ${p.variants[0]?.priceRetail?.toFixed(2) ?? "0.00"}
                  </span>
                  {statusBadge}
                  <span className="text-xs text-ios-muted">
                    {withImg}/{colors.length} fotos
                  </span>
                </label>
              );
            }

            return (
              <button
                key={p.reference}
                type="button"
                onClick={() => onSelectReference(p.reference)}
                className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left text-sm transition ${
                  active
                    ? "bg-ios-blue/15 ring-1 ring-ios-blue/40"
                    : "hover:bg-ios-fill"
                }`}
              >
                <span className="w-10 font-semibold text-ios-blue">
                  {extractReferencePrefix(p.reference)}
                </span>
                <span className="font-medium text-ios-label">{p.reference}</span>
                <span className="text-xs text-ios-muted">
                  {p.variants.length} var. · Detal $
                  {p.variants[0]?.priceRetail?.toFixed(2) ?? "0.00"}
                </span>
                {statusBadge}
                <span className="text-xs text-ios-muted">
                  {withImg}/{colors.length} fotos
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="space-y-4 rounded-ios-sm border border-ios-separator/50 bg-ios-secondary/30 p-4">
        <div>
          <p className="text-sm font-semibold text-ios-label">
            {mode === "single"
              ? activeProduct
                ? `Editando ${activeProduct.reference}`
                : "Sin referencia activa"
              : `Masivo (${selectedRefs.length} referencias)`}
          </p>
          <p className="text-xs text-ios-muted">
            {mode === "single"
              ? activeProduct?.title ||
                "Selecciona una referencia de la lista."
              : "Aplica precios y/o fotos a las referencias marcadas."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRICE_FIELDS.map(({ field, key }) => {
            const rule = PRICE_RULES.find((r) => r.key === key)!;
            return (
              <label key={field} className="text-xs text-ios-muted">
                {rule.label}{" "}
                <span className="text-ios-faint">({rule.range})</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={bulkPrices[field]}
                  onChange={(e) => onBulkPriceChange(field, e.target.value)}
                  className="ios-input mt-1"
                  placeholder="0.00"
                  disabled={mode === "single" && !activeProduct}
                />
              </label>
            );
          })}
        </div>

        {mode === "single" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onSavePrices}
              disabled={!activeReference}
              className="ios-btn ios-btn-secondary"
            >
              Guardar precios
            </button>
            <button
              type="button"
              onClick={onSaveAndNext}
              disabled={!activeReference}
              className="ios-btn ios-btn-primary"
            >
              Guardar y siguiente
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onApplyBulkPrices}
            disabled={selectedRefs.length === 0}
            className="ios-btn ios-btn-primary"
          >
            Aplicar precios a {selectedRefs.length} referencia
            {selectedRefs.length === 1 ? "" : "s"}
          </button>
        )}

        {mode === "single" && activeProduct ? (
          <div className="border-t border-ios-separator/50 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-ios-label">
              Foto por color
            </h3>
            <p className="mb-3 text-xs text-ios-muted">
              Una foto por color cubre todas las tallas de ese color.
            </p>
            <ColorPhotoSlots
              product={activeProduct}
              uploadingKey={uploadingKey}
              onUpload={(reference, color, file) =>
                onUploadColorImage(reference, color, file)
              }
            />
          </div>
        ) : null}

        {mode === "bulk" && bulkProducts.length > 0 ? (
          <div className="space-y-5 border-t border-ios-separator/50 pt-4">
            <BulkColorApply
              products={bulkProducts}
              uploadingKey={uploadingKey}
              onUploadMany={(references, color, file) =>
                onUploadColorImage(references, color, file)
              }
            />

            <div>
              <h3 className="mb-1 text-sm font-semibold text-ios-label">
                Fotos por referencia
              </h3>
              <p className="mb-3 text-xs text-ios-muted">
                Si cada referencia necesita fotos distintas, cárgalas aquí una
                por una dentro de las seleccionadas.
              </p>
              <div className="max-h-112 space-y-4 overflow-auto">
                {bulkProducts.map((p) => (
                  <div
                    key={`imgs-${p.reference}`}
                    className="rounded-ios-sm border border-ios-separator/50 bg-ios-elevated/60 p-3"
                  >
                    <p className="mb-2 text-sm font-medium text-ios-label">
                      {p.reference}
                      <span className="ml-2 font-normal text-ios-muted">
                        {p.title}
                      </span>
                    </p>
                    <ColorPhotoSlots
                      product={p}
                      uploadingKey={uploadingKey}
                      onUpload={(reference, color, file) =>
                        onUploadColorImage(reference, color, file)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {mode === "bulk" && bulkProducts.length === 0 ? (
          <p className="text-xs text-ios-muted">
            Marca referencias arriba para cargar precios e imágenes en masivo.
          </p>
        ) : null}
      </div>
    </div>
  );
}
