import { NextResponse } from "next/server";
import { listShopifyCollections } from "@/application/shopify-catalog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const collections = await listShopifyCollections();
    return NextResponse.json({ collections });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Error al listar colecciones",
      },
      { status: 500 }
    );
  }
}
