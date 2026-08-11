import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteShopifyProduct } from "@/application/shopify-catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Falta el id del producto" },
        { status: 400 }
      );
    }

    const deletedProductId = await deleteShopifyProduct(parsed.data.id);

    return NextResponse.json({
      ok: true,
      deletedProductId,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error al eliminar producto",
      },
      { status: 500 }
    );
  }
}
