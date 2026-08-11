import type {
  ShopifyCatalogProduct,
  ShopifyCatalogVariant,
  ShopifyCollection,
} from "@/domain/shopify-catalog";
import { shopifyGraphql } from "@/infrastructure/shopify/client";

export type {
  ShopifyCatalogProduct,
  ShopifyCatalogVariant,
  ShopifyCollection,
};

const COLLECTIONS_QUERY = `
  query collectionsList {
    collections(first: 100) {
      nodes {
        id
        title
        handle
      }
    }
  }
`;

const PRODUCTS_QUERY = `
  query productsCatalog($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      nodes {
        id
        title
        handle
        status
        totalInventory
        featuredMedia {
          preview {
            image {
              url
            }
          }
        }
        collections(first: 10) {
          nodes {
            id
            title
          }
        }
        variants(first: 50) {
          nodes {
            id
            sku
            price
            inventoryQuantity
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_DELETE_MUTATION = `
  mutation productDelete($input: ProductDeleteInput!, $synchronous: Boolean) {
    productDelete(input: $input, synchronous: $synchronous) {
      deletedProductId
      productDeleteOperation {
        id
        status
        deletedProductId
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_DELETE_OPERATION_QUERY = `
  query productDeleteOperation($id: ID!) {
    productOperation(id: $id) {
      ... on ProductDeleteOperation {
        id
        status
        deletedProductId
        userErrors {
          field
          message
        }
      }
    }
  }
`;

export async function listShopifyCollections(): Promise<ShopifyCollection[]> {
  const data = await shopifyGraphql<{
    collections: { nodes: ShopifyCollection[] };
  }>(COLLECTIONS_QUERY);

  return [...data.collections.nodes].sort((a, b) =>
    a.title.localeCompare(b.title, "es")
  );
}

export async function listShopifyProducts(
  search?: string
): Promise<ShopifyCatalogProduct[]> {
  const query = search?.trim() ? `title:*${search.trim}* OR sku:${search.trim}` : null;

  const data = await shopifyGraphql<{
    products: {
      nodes: Array<{
        id: string;
        title: string;
        handle: string;
        status: string;
        totalInventory: number | null;
        featuredMedia: {
          preview: { image: { url: string } | null } | null;
        } | null;
        collections: { nodes: Array<{ id: string; title: string }> };
        variants: {
          nodes: ShopifyCatalogVariant[];
        };
      }>;
    };
  }>(PRODUCTS_QUERY, { first: 50, query: query });

  return data.products.nodes.map((p) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    status: p.status,
    totalInventory: p.totalInventory,
    imageUrl: p.featuredMedia?.preview?.image?.url ?? null,
    collections: p.collections.nodes,
    variants: p.variants.nodes,
  }));
}

type DeleteMutationData = {
  productDelete: {
    deletedProductId: string | null;
    productDeleteOperation: {
      id: string;
      status: string;
      deletedProductId: string | null;
    } | null;
    userErrors: Array<{ message: string }>;
  };
};

type DeleteOperationData = {
  productOperation: {
    id: string;
    status: string;
    deletedProductId: string | null;
    userErrors: Array<{ message: string }>;
  } | null;
};

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollDeleteOperation(operationId: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const data = await shopifyGraphql<DeleteOperationData>(
      PRODUCT_DELETE_OPERATION_QUERY,
      { id: operationId }
    );

    const op = data.productOperation;
    if (!op) {
      throw new Error("Shopify no devolvió el estado del borrado");
    }

    if (op.userErrors?.length) {
      throw new Error(op.userErrors.map((e) => e.message).join("; "));
    }

    if (op.status === "COMPLETE" && op.deletedProductId) {
      return op.deletedProductId;
    }

    if (op.status === "FAILED") {
      throw new Error("Shopify falló al eliminar el producto");
    }

    await wait(500);
  }

  throw new Error(
    "El borrado sigue en proceso en Shopify. Recarga el catálogo en unos segundos."
  );
}

/**
 * Elimina un producto en Shopify (idempotente).
 * Si ya no existe, se considera eliminado correctamente.
 */
export async function deleteShopifyProduct(productId: string): Promise<string> {
  if (!productId.startsWith("gid://shopify/Product/")) {
    throw new Error(`ID de producto inválido: ${productId}`);
  }

  const isGone = (message: string) =>
    /not found|does not exist|no existe/i.test(message);

  // Intento síncrono
  try {
    const data = await shopifyGraphql<DeleteMutationData>(PRODUCT_DELETE_MUTATION, {
      input: { id: productId },
      synchronous: true,
    });

    if (data.productDelete.userErrors.length > 0) {
      const msg = data.productDelete.userErrors.map((e) => e.message).join("; ");
      if (isGone(msg)) return productId;
      throw new Error(msg);
    }

    if (data.productDelete.deletedProductId) {
      return data.productDelete.deletedProductId;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isGone(message)) return productId;
    if (/access denied|permission|unauthorized/i.test(message)) {
      throw e instanceof Error ? e : new Error(message);
    }
    // Timeout / sin confirmación → seguir con async
  }

  // Fallback asíncrono (productos con muchas variantes / media)
  const asyncData = await shopifyGraphql<DeleteMutationData>(
    PRODUCT_DELETE_MUTATION,
    {
      input: { id: productId },
      synchronous: false,
    }
  );

  if (asyncData.productDelete.userErrors.length > 0) {
    const msg = asyncData.productDelete.userErrors
      .map((e) => e.message)
      .join("; ");
    if (isGone(msg)) return productId;
    throw new Error(msg);
  }

  if (asyncData.productDelete.deletedProductId) {
    return asyncData.productDelete.deletedProductId;
  }

  const operationId = asyncData.productDelete.productDeleteOperation?.id;
  if (!operationId) {
    // Sin operación y sin error: probablemente ya no existe
    return productId;
  }

  return pollDeleteOperation(operationId);
}
