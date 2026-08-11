/** Config del PIM — valores de entorno, sin hardcode en UI */

export function getShopifyStoreDomain(): string {
  return (
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    process.env.SHOPIFY_STORE_DOMAIN ||
    "je3hk0-dk.myshopify.com"
  ).replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getShopifyAdminStoreHandle(): string {
  return getShopifyStoreDomain().replace(/\.myshopify\.com$/i, "");
}

export function shopifyAdminProductUrl(productGid: string): string {
  const id = productGid.split("/").pop() ?? "";
  return `https://admin.shopify.com/store/${getShopifyAdminStoreHandle()}/products/${id}`;
}

export function shopifyAdminProductsUrl(): string {
  return `https://admin.shopify.com/store/${getShopifyAdminStoreHandle()}/products`;
}
