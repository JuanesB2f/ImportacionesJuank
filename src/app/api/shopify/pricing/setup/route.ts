import { NextResponse } from "next/server";
import { ensurePriceMetafieldDefinitions } from "@/application/ensure-price-metafields";
import { activateQuantityPriceDiscount } from "@/application/activate-quantity-discount";
import { PRICE_RULES } from "@/domain/pricing";

export const runtime = "nodejs";

/** GET: estado / reglas. POST: setup metafields + activar descuento */
export async function GET() {
  return NextResponse.json({
    rules: PRICE_RULES,
    functionHandle: "quantity-price-tiers",
    steps: [
      "1. Agrega scope write_discounts (y reinstala la app)",
      "2. Pon tu Client ID en shopify.app.toml",
      "3. npx shopify app deploy",
      "4. POST /api/shopify/pricing/setup para activar el descuento",
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      activateDiscount?: boolean;
    };

    const metafields = await ensurePriceMetafieldDefinitions();

    let discount: { ok: boolean; discountId?: string; message: string } | null =
      null;
    if (body.activateDiscount !== false) {
      discount = await activateQuantityPriceDiscount();
    }

    return NextResponse.json({
      metafields,
      discount,
      ok: metafields.ok && (discount?.ok ?? true),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error:
          e instanceof Error ? e.message : "Error al configurar precios",
      },
      { status: 500 }
    );
  }
}
