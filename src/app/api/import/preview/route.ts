import { NextResponse } from "next/server";
import { parseSupplierExcel } from "@/application/import-supplier-excel";
import { buildShopifyCsv } from "@/application/export-shopify-csv";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Sube un archivo Excel (.xlsx)." },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const preview = parseSupplierExcel(buffer);
  const hasBlockingErrors = preview.issues.some((i) => i.level === "error");

  const csv =
    !hasBlockingErrors && preview.products.length > 0
      ? buildShopifyCsv(preview.products)
      : null;

  return NextResponse.json({
    preview,
    csv,
    mapping: {
      "REFERENCIA →": "Product (Handle + Title)",
      "COLOR →": "Option1 (Color)",
      "TALLA →": "Option2 (Talla)",
      "CANTIDAD →": "Variant Inventory Qty",
      "PRECIO DETAL →": "Variant Price (único que va a Shopify)",
      "SKU →": "REFERENCIA-COLOR-TALLA",
    },
  });
}
