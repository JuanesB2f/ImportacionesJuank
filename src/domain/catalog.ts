export type ProductStatus = "active" | "draft" | "archived";

/** Fila cruda del Excel del proveedor */
export type SupplierRow = {
  reference: string;
  color: string;
  size: string;
  quantity: number;
  priceRetail?: number;
  priceEntrepreneur?: number;
  priceWholesale?: number;
  priceDistributor?: number;
  description?: string;
};

/** Variante = Color + Talla de una misma referencia (CRG001, SK002…) */
export type CatalogVariant = {
  sku: string;
  option1Value: string; // Color
  option2Value: string; // Talla
  inventoryQty: number;
  priceRetail: number;
  priceEntrepreneur: number;
  priceWholesale: number;
  priceDistributor: number;
};

/** Una foto por color: cubre todas las tallas de ese color */
export type ColorImage = {
  color: string;
  url: string;
  filename?: string;
};

/**
 * Producto = una REFERENCIA (CRG001).
 * En la tienda: una ficha con Color + Talla.
 * La categoría del menú se asigna con la colección (Jeans, Corsets…).
 */
export type CatalogProduct = {
  reference: string;
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  option1Name: "Color";
  option2Name: "Talla";
  status: ProductStatus;
  imageUrl?: string;
  imageFilename?: string;
  colorImages?: ColorImage[];
  variants: CatalogVariant[];
};

export function colorsOfProduct(product: CatalogProduct): string[] {
  return [
    ...new Set(product.variants.map((v) => v.option1Value).filter(Boolean)),
  ];
}

export function getColorImage(
  product: CatalogProduct,
  color: string
): ColorImage | undefined {
  const key = color.trim().toUpperCase();
  return product.colorImages?.find((c) => c.color.trim().toUpperCase() === key);
}

export function upsertColorImage(
  product: CatalogProduct,
  image: ColorImage
): CatalogProduct {
  const key = image.color.trim().toUpperCase();
  const rest = (product.colorImages ?? []).filter(
    (c) => c.color.trim().toUpperCase() !== key
  );
  const colorImages = [...rest, { ...image, color: image.color.trim() }];
  const first = colorImages[0];
  return {
    ...product,
    colorImages,
    imageUrl: first?.url,
    imageFilename: first?.filename,
  };
}

export type ImportIssue = {
  row: number;
  level: "error" | "warning";
  message: string;
};

export type ImportPreview = {
  products: CatalogProduct[];
  issues: ImportIssue[];
  stats: {
    rows: number;
    products: number;
    variants: number;
  };
};
