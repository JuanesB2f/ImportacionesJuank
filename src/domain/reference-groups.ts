import type { CatalogProduct } from "@/domain/catalog";

/**
 * Extrae la familia de referencia: SK001 → SK, PLZ008 → PLZ, CRG001 → CRG
 * (solo para filtrar/organizar en el PIM; cada CRG001 sigue siendo un producto)
 */
export function extractReferencePrefix(reference: string): string {
  const clean = reference.trim().toUpperCase().replace(/\s+/g, "");
  const match = clean.match(/^([A-ZÁÉÍÓÚÑ]+)/);
  return match?.[1] ?? (clean.slice(0, 3) || "OTROS");
}

export type ReferenceGroup = {
  prefix: string;
  productCount: number;
  variantCount: number;
  references: string[];
};

export function groupProductsByPrefix(
  products: CatalogProduct[]
): ReferenceGroup[] {
  const map = new Map<string, CatalogProduct[]>();

  for (const product of products) {
    const prefix = extractReferencePrefix(product.reference);
    const list = map.get(prefix) ?? [];
    list.push(product);
    map.set(prefix, list);
  }

  return [...map.entries()]
    .map(([prefix, items]) => ({
      prefix,
      productCount: items.length,
      variantCount: items.reduce((acc, p) => acc + p.variants.length, 0),
      references: items.map((p) => p.reference).sort(),
    }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix, "es"));
}

export function filterProductsByPrefixes(
  products: CatalogProduct[],
  prefixes: string[]
): CatalogProduct[] {
  if (prefixes.length === 0) return [];
  const set = new Set(prefixes.map((p) => p.toUpperCase()));
  return products.filter((p) =>
    set.has(extractReferencePrefix(p.reference))
  );
}
