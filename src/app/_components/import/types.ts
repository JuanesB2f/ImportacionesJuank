import type { CatalogProduct, CatalogVariant } from "@/domain/catalog";
import { PRICE_RULES } from "@/domain/pricing";

export type CollectionOption = {
  id: string;
  title: string;
  handle: string;
};

export type PriceField =
  | "priceRetail"
  | "priceEntrepreneur"
  | "priceWholesale"
  | "priceDistributor";

export const PRICE_FIELDS: Array<{
  field: PriceField;
  key: (typeof PRICE_RULES)[number]["key"];
}> = [
  { field: "priceRetail", key: "detal" },
  { field: "priceEntrepreneur", key: "emprendedor" },
  { field: "priceWholesale", key: "mayorista" },
  { field: "priceDistributor", key: "distribuidor" },
];

export type ImportApiResponse = {
  preview: {
    products: CatalogProduct[];
    issues: Array<{ row: number; level: "error" | "warning"; message: string }>;
    stats: { rows: number; products: number; variants: number };
  };
  csv: string | null;
  mapping: Record<string, string>;
  error?: string;
};

export type BulkPrices = Record<PriceField, string>;

export function emptyBulkPrices(): BulkPrices {
  return {
    priceRetail: "",
    priceEntrepreneur: "",
    priceWholesale: "",
    priceDistributor: "",
  };
}

export function applyPricesToProducts(
  products: CatalogProduct[],
  references: string[],
  bulkPrices: BulkPrices
): CatalogProduct[] {
  const set = new Set(references);
  return products.map((p) => {
    if (!set.has(p.reference)) return p;
    return {
      ...p,
      variants: p.variants.map((v) => {
        const next: CatalogVariant = { ...v };
        for (const { field } of PRICE_FIELDS) {
          const raw = bulkPrices[field];
          if (raw === "") continue;
          const n = Number(raw);
          if (Number.isFinite(n) && n >= 0) next[field] = n;
        }
        return next;
      }),
    };
  });
}
