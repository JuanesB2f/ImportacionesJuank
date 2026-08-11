import { NextResponse } from "next/server";
import { listShopifyProducts } from "@/application/shopify-catalog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const products = await listShopifyProducts(q);
    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error al listar productos",
      },
      { status: 500 }
    );
  }
}
