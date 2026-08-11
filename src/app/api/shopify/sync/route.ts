import { NextResponse } from "next/server";
import { z } from "zod";
import {
  syncCatalogProductsToShopify,
  type SyncOptions,
} from "@/application/sync-shopify-products";
import type { CatalogProduct } from "@/domain/catalog";

export const runtime = "nodejs";

const variantSchema = z.object({
  sku: z.string(),
  option1Value: z.string(),
  option2Value: z.string(),
  inventoryQty: z.number().int().nonnegative(),
  priceRetail: z.number().nonnegative(),
  priceEntrepreneur: z.number().nonnegative(),
  priceWholesale: z.number().nonnegative(),
  priceDistributor: z.number().nonnegative(),
});

const colorImageSchema = z.object({
  color: z.string().min(1),
  url: z.string().min(1),
  filename: z.string().optional(),
});

const productSchema = z.object({
  reference: z.string(),
  handle: z.string(),
  title: z.string(),
  bodyHtml: z.string(),
  vendor: z.string(),
  option1Name: z.literal("Color"),
  option2Name: z.literal("Talla"),
  status: z.enum(["active", "draft", "archived"]),
  imageUrl: z.string().optional(),
  imageFilename: z.string().optional(),
  colorImages: z.array(colorImageSchema).optional(),
  variants: z.array(variantSchema).min(1),
});

const bodySchema = z.object({
  products: z.array(productSchema).min(1),
  options: z
    .object({
      status: z.enum(["active", "draft"]).default("draft"),
      collectionIds: z.array(z.string()).default([]),
      mode: z.enum(["replace", "update"]).default("replace"),
    })
    .default({ status: "draft", collectionIds: [], mode: "replace" }),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const products = parsed.data.products as CatalogProduct[];
    const options = parsed.data.options as SyncOptions;
    const summary = await syncCatalogProductsToShopify(products, options);

    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Error al sincronizar con Shopify",
      },
      { status: 500 }
    );
  }
}
