import slugify from "slugify";

/** Normaliza texto para handles/SKU: mayúsculas → slug estable */
export function toHandle(value: string): string {
  return slugify(value.trim(), {
    lower: true,
    strict: true,
    trim: true,
  });
}

/** SKU determinista: SK001-AZUL-HIELO-8 */
export function buildSku(reference: string, color: string, size: string): string {
  const ref = reference.trim().toUpperCase().replace(/\s+/g, "");
  const colorPart = toHandle(color).toUpperCase().replace(/-/g, "-");
  const sizePart = size.trim().toUpperCase();
  return `${ref}-${colorPart}-${sizePart}`;
}

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/** Mapea encabezados flexibles del Excel del proveedor */
export const HEADER_ALIASES: Record<string, string[]> = {
  reference: ["REFERENCIA", "REF", "SKU", "CODIGO", "CÓDIGO"],
  color: ["COLOR", "COLORES"],
  size: ["TALLA", "SIZE", "TALLES"],
  quantity: ["CANTIDAD", "CANTIDA", "STOCK", "QTY", "CANT"],
  priceRetail: ["PRECIO DETAL", "PRECIO DETALLE", "PRECIO", "PRICE"],
  priceEntrepreneur: ["PRECIO EMPRENDEDOR", "EMPRENDEDOR"],
  priceWholesale: ["PRECIO MAYORISTA", "MAYORISTA"],
  priceDistributor: ["PRECIO DISTRIBUIDOR", "DISTRIBUIDOR"],
  description: ["DESCRIPCION", "DESCRIPCIÓN", "DESCRIPTION", "NOMBRE"],
};
