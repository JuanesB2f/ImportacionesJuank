export type ShopifyCollection = {
  id: string;
  title: string;
  handle: string;
};

export type ShopifyCatalogVariant = {
  id: string;
  sku: string | null;
  price: string;
  inventoryQuantity: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
};

export type ShopifyCatalogProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number | null;
  imageUrl: string | null;
  collections: Array<{ id: string; title: string }>;
  variants: ShopifyCatalogVariant[];
};
