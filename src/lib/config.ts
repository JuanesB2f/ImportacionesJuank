/** Config del PIM — dominio solo desde env (sin hardcode) */

export function getShopifyStoreDomain(): string {
  const domain = (
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    process.env.SHOPIFY_STORE_DOMAIN ||
    ""
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!domain) {
    throw new Error(
      "Falta NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN o SHOPIFY_STORE_DOMAIN"
    );
  }

  return domain;
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
