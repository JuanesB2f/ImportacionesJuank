"use client";

import type { CatalogProduct } from "@/domain/catalog";
import { extractReferencePrefix } from "@/domain/reference-groups";
import { PRICE_FIELDS, type PriceField } from "./types";

export function VariantsTable({
  products,
  onPriceChange,
}: {
  products: CatalogProduct[];
  onPriceChange: (
    productHandle: string,
    sku: string,
    field: PriceField,
    value: string
  ) => void;
}) {
  return (
    <div className="overflow-hidden rounded-ios border border-ios-separator bg-ios-elevated">
      <div className="border-b border-ios-separator/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-ios-label">
          Variantes de familias seleccionadas
        </h2>
      </div>
      <div className="max-h-120 overflow-auto">
        <table className="min-w-176 w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-ios-secondary text-xs uppercase text-ios-muted backdrop-blur">
            <tr>
              <th className="px-2 py-2">Fam.</th>
              <th className="px-2 py-2">Ref</th>
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">Color</th>
              <th className="px-2 py-2">Talla</th>
              <th className="px-2 py-2">Stock</th>
              <th className="px-2 py-2">Detal*</th>
              <th className="px-2 py-2">Empr.</th>
              <th className="px-2 py-2">Mayor.</th>
              <th className="px-2 py-2">Distr.</th>
            </tr>
          </thead>
          <tbody>
            {products.flatMap((p) =>
              p.variants.map((v) => (
                <tr
                  key={v.sku}
                  className="border-t border-ios-separator/40 odd:bg-ios-secondary/20"
                >
                  <td className="px-2 py-1.5 font-semibold text-ios-blue">
                    {extractReferencePrefix(p.reference)}
                  </td>
                  <td className="px-2 py-1.5 text-ios-label">{p.reference}</td>
                  <td className="px-2 py-1.5 font-mono text-xs text-ios-muted">
                    {v.sku}
                  </td>
                  <td className="px-2 py-1.5">{v.option1Value}</td>
                  <td className="px-2 py-1.5">{v.option2Value}</td>
                  <td className="px-2 py-1.5 tabular-nums">{v.inventoryQty}</td>
                  {PRICE_FIELDS.map(({ field }) => (
                    <td key={field} className="px-1 py-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={v[field]}
                        onChange={(e) =>
                          onPriceChange(p.handle, v.sku, field, e.target.value)
                        }
                        className="w-20 rounded-md border border-ios-separator bg-ios-secondary px-1.5 py-1 text-xs text-ios-label outline-none focus:border-ios-blue"
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
