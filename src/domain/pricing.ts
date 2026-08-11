export type PriceTier = {
  detal: number;
  emprendedor: number;
  mayorista: number;
  distribuidor: number;
};

export type PriceTierKey = keyof PriceTier;

/** Reglas comerciales ImportacionesJuank — cantidad = prendas en el carrito */
export const PRICE_RULES = [
  {
    key: "detal" as const,
    label: "Detal",
    description: "Compra menor a 6 prendas",
    range: "< 6",
    minQty: 1,
    maxQty: 5,
    metafieldKey: null as string | null,
    sendsToShopify: true,
  },
  {
    key: "emprendedor" as const,
    label: "Emprendedor",
    description: "6 a 11 prendas",
    range: "6–11",
    minQty: 6,
    maxQty: 11,
    metafieldKey: "precio_emprendedor",
    sendsToShopify: false,
  },
  {
    key: "mayorista" as const,
    label: "Mayorista",
    description: "12 a 59 prendas",
    range: "12–59",
    minQty: 12,
    maxQty: 59,
    metafieldKey: "precio_mayorista",
    sendsToShopify: false,
  },
  {
    key: "distribuidor" as const,
    label: "Distribuidor",
    description: "60 o más prendas",
    range: "60+",
    minQty: 60,
    maxQty: null as number | null,
    metafieldKey: "precio_distribuidor",
    sendsToShopify: false,
  },
] as const;

export const PRICE_METAFIELD_NAMESPACE = "importacionesjuank";

/** Elige el nivel según cantidad total de prendas en el carrito/pedido */
export function pickTierKeyByQuantity(quantity: number): PriceTierKey {
  const q = Math.max(0, Math.floor(quantity));
  if (q >= 60) return "distribuidor";
  if (q >= 12) return "mayorista";
  if (q >= 6) return "emprendedor";
  return "detal";
}

export function pickUnitPrice(tiers: PriceTier, quantity: number): number {
  const key = pickTierKeyByQuantity(quantity);
  const value = tiers[key];
  if (Number.isFinite(value) && value > 0) return value;
  return tiers.detal;
}

export function pickShopifyPrice(tiers: PriceTier): number {
  return tiers.detal;
}

export function tierLabel(key: PriceTierKey): string {
  return PRICE_RULES.find((r) => r.key === key)?.label ?? key;
}
