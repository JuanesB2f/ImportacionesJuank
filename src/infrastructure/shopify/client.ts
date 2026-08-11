import {
  getShopifyAccessToken,
  getShopifyStoreDomain,
} from "@/infrastructure/shopify/auth";

const API_VERSION = "2025-10";

export type ShopifyGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function shopifyGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getShopifyAccessToken();
  const domain = getShopifyStoreDomain();

  const res = await fetch(
    `https://${domain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = (await res.json()) as ShopifyGraphqlResponse<T>;

  if (!res.ok) {
    throw new Error(`Shopify HTTP ${res.status}`);
  }

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }

  if (!json.data) {
    throw new Error("Shopify no devolvió data");
  }

  return json.data;
}
