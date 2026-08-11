import type { CatalogProduct, CatalogVariant } from "@/domain/catalog";
import { isHomepageCollection } from "@/domain/collections";
import type { ImportMode } from "@/domain/import-mode";
import type { SyncProductResult, SyncSummary } from "@/domain/sync";
import { ensurePriceMetafieldDefinitions } from "@/application/ensure-price-metafields";
import { publishProductToOnlineStore } from "@/application/shopify-publish";
import { shopifyGraphql } from "@/infrastructure/shopify/client";

export type { SyncProductResult, SyncSummary, ImportMode };

export type SyncOptions = {
  status: "active" | "draft";
  collectionIds: string[];
  /**
   * replace = cargar desde 0 (stock del Excel reemplaza)
   * update  = sumar stock a lo existente + agregar nuevas refs/variantes
   */
  mode: ImportMode;
};

const LOCATIONS_QUERY = `
  query primaryLocations {
    locations(first: 5) {
      nodes {
        id
        name
        isActive
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = `
  query productByHandle($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
      status
      variants(first: 100) {
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
`;

const PRODUCT_SET_MUTATION = `
  mutation productSet($input: ProductSetInput!, $synchronous: Boolean!) {
    productSet(input: $input, synchronous: $synchronous) {
      product {
        id
        handle
        title
        status
        variants(first: 100) {
          nodes {
            id
            sku
            inventoryQuantity
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type LocationsData = {
  locations: {
    nodes: Array<{ id: string; name: string; isActive: boolean }>;
  };
};

type ExistingProduct = {
  id: string;
  handle: string;
  title: string;
  status: string;
  variants: {
    nodes: Array<{
      id: string;
      sku: string | null;
      price: string;
      inventoryQuantity: number | null;
      selectedOptions: Array<{ name: string; value: string }>;
    }>;
  };
};

type ProductByHandleData = {
  productByIdentifier: ExistingProduct | null;
};

type ProductSetData = {
  productSet: {
    product: {
      id: string;
      handle: string;
      title: string;
      status: string;
      variants: {
        nodes: Array<{
          id: string;
          sku: string | null;
          inventoryQuantity: number | null;
        }>;
      };
    } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

export async function getPrimaryLocationId(): Promise<{
  id: string;
  name: string;
}> {
  const data = await shopifyGraphql<LocationsData>(LOCATIONS_QUERY);
  const location =
    data.locations.nodes.find((l) => l.isActive) ?? data.locations.nodes[0];

  if (!location) {
    throw new Error("No hay ubicaciones (locations) activas en Shopify");
  }

  return { id: location.id, name: location.name };
}

async function findExistingProduct(
  handle: string
): Promise<ExistingProduct | null> {
  const data = await shopifyGraphql<ProductByHandleData>(
    PRODUCT_BY_HANDLE_QUERY,
    { handle }
  );
  return data.productByIdentifier;
}

function optionValue(
  options: Array<{ name: string; value: string }>,
  name: string
): string {
  return (
    options.find((o) => o.name.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

/**
 * En modo update: conserva variantes existentes, suma stock del Excel
 * y agrega referencias/variantes nuevas.
 */
function mergeForUpdate(
  incoming: CatalogProduct,
  existing: ExistingProduct
): CatalogProduct {
  const merged = new Map<string, CatalogVariant>();

  for (const v of existing.variants.nodes) {
    const color = optionValue(v.selectedOptions, "Color") || "Default";
    const size = optionValue(v.selectedOptions, "Talla") || "Default";
    const sku = (v.sku || `${incoming.reference}-${color}-${size}`).toUpperCase();
    const price = Number(v.price) || 0;

    merged.set(sku, {
      sku,
      option1Value: color.toUpperCase(),
      option2Value: size.toUpperCase(),
      inventoryQty: v.inventoryQuantity ?? 0,
      priceRetail: price,
      priceEntrepreneur: 0,
      priceWholesale: 0,
      priceDistributor: 0,
    });
  }

  for (const v of incoming.variants) {
    const key = v.sku.toUpperCase();
    const prev = merged.get(key);
    if (prev) {
      merged.set(key, {
        ...prev,
        inventoryQty: prev.inventoryQty + v.inventoryQty,
        priceRetail: v.priceRetail > 0 ? v.priceRetail : prev.priceRetail,
        priceEntrepreneur:
          v.priceEntrepreneur > 0
            ? v.priceEntrepreneur
            : prev.priceEntrepreneur,
        priceWholesale:
          v.priceWholesale > 0 ? v.priceWholesale : prev.priceWholesale,
        priceDistributor:
          v.priceDistributor > 0
            ? v.priceDistributor
            : prev.priceDistributor,
      });
    } else {
      merged.set(key, { ...v });
    }
  }

  return {
    ...incoming,
    title: incoming.title || existing.title,
    variants: [...merged.values()].sort((a, b) => a.sku.localeCompare(b.sku)),
  };
}

type FileSetInput = {
  originalSource: string;
  alt: string;
  contentType: "IMAGE";
  filename?: string;
};

/** Archivos únicos del producto: 1 por color (misma foto para todas las tallas) */
function buildProductFiles(product: CatalogProduct): FileSetInput[] {
  const byUrl = new Map<string, FileSetInput>();

  for (const img of product.colorImages ?? []) {
    if (!img.url || byUrl.has(img.url)) continue;
    byUrl.set(img.url, {
      originalSource: img.url,
      alt: `${product.title} — ${img.color}`,
      contentType: "IMAGE",
      ...(img.filename ? { filename: img.filename } : {}),
    });
  }

  // Legacy: una sola imagen de producto
  if (byUrl.size === 0 && product.imageUrl) {
    byUrl.set(product.imageUrl, {
      originalSource: product.imageUrl,
      alt: product.title,
      contentType: "IMAGE",
      ...(product.imageFilename ? { filename: product.imageFilename } : {}),
    });
  }

  return [...byUrl.values()];
}

function fileForColor(
  product: CatalogProduct,
  color: string
): FileSetInput | undefined {
  const fromColor = (product.colorImages ?? []).find(
    (c) => c.color.trim().toUpperCase() === color.trim().toUpperCase()
  );
  if (fromColor?.url) {
    return {
      originalSource: fromColor.url,
      alt: `${product.title} — ${fromColor.color}`,
      contentType: "IMAGE",
      ...(fromColor.filename ? { filename: fromColor.filename } : {}),
    };
  }
  if (product.imageUrl) {
    return {
      originalSource: product.imageUrl,
      alt: product.title,
      contentType: "IMAGE",
      ...(product.imageFilename ? { filename: product.imageFilename } : {}),
    };
  }
  return undefined;
}

const PRODUCT_COLLECTIONS_QUERY = `
  query productCollections($id: ID!) {
    product(id: $id) {
      id
      collections(first: 50) {
        nodes {
          id
          title
          handle
        }
      }
    }
  }
`;

const COLLECTION_REMOVE_PRODUCTS = `
  mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
    collectionRemoveProducts(id: $id, productIds: $productIds) {
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Saca el producto de colecciones tipo Home / Destacados / Frontpage
 * a menos que el usuario las haya marcado explícitamente al sincronizar.
 */
async function removeFromHomepageCollectionsUnlessSelected(
  productId: string,
  selectedCollectionIds: string[]
): Promise<void> {
  const selected = new Set(selectedCollectionIds);
  const data = await shopifyGraphql<{
    product: {
      id: string;
      collections: {
        nodes: Array<{ id: string; title: string; handle: string }>;
      };
    } | null;
  }>(PRODUCT_COLLECTIONS_QUERY, { id: productId });

  const current = data.product?.collections.nodes ?? [];
  const toRemove = current.filter(
    (c) => isHomepageCollection(c) && !selected.has(c.id)
  );

  for (const col of toRemove) {
    const res = await shopifyGraphql<{
      collectionRemoveProducts: {
        userErrors: Array<{ message: string }>;
      };
    }>(COLLECTION_REMOVE_PRODUCTS, {
      id: col.id,
      productIds: [productId],
    });
    const errors = res.collectionRemoveProducts.userErrors;
    if (errors.length > 0) {
      throw new Error(
        `${col.title}: ${errors.map((e) => e.message).join("; ")}`
      );
    }
  }
}

function buildProductSetInput(
  product: CatalogProduct,
  locationId: string,
  options: SyncOptions,
  existingId?: string
) {
  const colors = [...new Set(product.variants.map((v) => v.option1Value))];
  const sizes = [...new Set(product.variants.map((v) => v.option2Value))];
  const status = options.status === "active" ? "ACTIVE" : "DRAFT";
  const files = buildProductFiles(product);

  return {
    ...(existingId ? { id: existingId } : {}),
    handle: product.handle,
    title: product.title,
    descriptionHtml: product.bodyHtml || undefined,
    vendor: product.vendor,
    status,
    // Siempre enviar lista (aunque vacía) para no heredar Home/Destacados
    collections: options.collectionIds,
    ...(files.length > 0 ? { files } : {}),
    productOptions: [
      {
        name: product.option1Name,
        values: colors.map((name) => ({ name })),
      },
      {
        name: product.option2Name,
        values: sizes.map((name) => ({ name })),
      },
    ],
    variants: product.variants.map((variant) => {
      const file = fileForColor(product, variant.option1Value);
      return {
        optionValues: [
          { optionName: product.option1Name, name: variant.option1Value },
          { optionName: product.option2Name, name: variant.option2Value },
        ],
        price: variant.priceRetail.toFixed(2),
        inventoryPolicy: "DENY",
        inventoryItem: {
          sku: variant.sku,
          tracked: true,
          ...(variant.priceDistributor > 0
            ? { cost: variant.priceDistributor.toFixed(2) }
            : {}),
        },
        inventoryQuantities: [
          {
            locationId,
            name: "available",
            quantity: variant.inventoryQty,
          },
        ],
        ...(file ? { file } : {}),
        metafields: [
          {
            namespace: "importacionesjuank",
            key: "precio_emprendedor",
            type: "number_decimal",
            value: variant.priceEntrepreneur.toFixed(2),
          },
          {
            namespace: "importacionesjuank",
            key: "precio_mayorista",
            type: "number_decimal",
            value: variant.priceWholesale.toFixed(2),
          },
          {
            namespace: "importacionesjuank",
            key: "precio_distribuidor",
            type: "number_decimal",
            value: variant.priceDistributor.toFixed(2),
          },
        ],
      };
    }),
  };
}

export async function syncCatalogProductsToShopify(
  products: CatalogProduct[],
  options: SyncOptions = {
    status: "draft",
    collectionIds: [],
    mode: "replace",
  }
): Promise<SyncSummary> {
  // Asegura metafields de precios por cantidad (idempotente)
  await ensurePriceMetafieldDefinitions().catch(() => undefined);

  const location = await getPrimaryLocationId();
  const results: SyncProductResult[] = [];

  for (const product of products) {
    try {
      let toSync = product;
      let existingId: string | undefined;

      if (options.mode === "update") {
        const existing = await findExistingProduct(product.handle);
        if (existing) {
          existingId = existing.id;
          toSync = mergeForUpdate(product, existing);
        }
      } else {
        // replace: si existe, actualizar por id para sobrescribir stock
        const existing = await findExistingProduct(product.handle);
        if (existing) existingId = existing.id;
      }

      const data = await shopifyGraphql<ProductSetData>(PRODUCT_SET_MUTATION, {
        synchronous: true,
        input: buildProductSetInput(
          toSync,
          location.id,
          options,
          existingId
        ),
      });

      const errors = data.productSet.userErrors;
      if (errors.length > 0) {
        results.push({
          reference: product.reference,
          handle: product.handle,
          ok: false,
          error: errors.map((e) => e.message).join("; "),
        });
        continue;
      }

      const created = data.productSet.product;
      if (!created) {
        results.push({
          reference: product.reference,
          handle: product.handle,
          ok: false,
          error: "Shopify no devolvió el producto",
        });
        continue;
      }

      // No meter en inicio / destacados salvo que el usuario lo haya elegido
      let publishWarning: string | undefined;
      try {
        await removeFromHomepageCollectionsUnlessSelected(
          created.id,
          options.collectionIds
        );
      } catch (homeErr) {
        publishWarning =
          homeErr instanceof Error
            ? `⚠ Creado, pero no se pudo sacar del inicio: ${homeErr.message}`
            : "⚠ Creado, pero no se pudo sacar del inicio";
      }

      // Visible en la tienda (colecciones del menú DAMAS, etc.)
      if (options.status === "active") {
        try {
          await publishProductToOnlineStore(created.id);
        } catch (pubErr) {
          const msg =
            pubErr instanceof Error
              ? `⚠ Producto creado pero no visible en tienda: ${pubErr.message}`
              : "⚠ Producto creado pero no publicado al Online Store";
          publishWarning = publishWarning ? `${publishWarning} · ${msg}` : msg;
        }
      }

      results.push({
        reference: product.reference,
        handle: created.handle,
        ok: true,
        productId: created.id,
        variantCount: created.variants.nodes.length,
        error: publishWarning,
      });
    } catch (e) {
      results.push({
        reference: product.reference,
        handle: product.handle,
        ok: false,
        error: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return {
    locationId: location.id,
    locationName: location.name,
    results,
    okCount: results.filter((r) => r.ok).length,
    errorCount: results.filter((r) => !r.ok).length,
  };
}
