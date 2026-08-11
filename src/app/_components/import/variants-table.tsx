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
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Variantes de familias seleccionadas
        </h2>
      </div>
      <div className="max-h-120 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
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
                <tr key={v.sku} className="border-t border-zinc-100">
                  <td className="px-2 py-1.5 font-semibold text-teal-800">
                    {extractReferencePrefix(p.reference)}
                  </td>
                  <td className="px-2 py-1.5">{p.reference}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">{v.sku}</td>
                  <td className="px-2 py-1.5">{v.option1Value}</td>
                  <td className="px-2 py-1.5">{v.option2Value}</td>
                  <td className="px-2 py-1.5">{v.inventoryQty}</td>
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
                        className="w-20 rounded border border-zinc-200 px-1 py-0.5 text-xs"
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
