import { NextResponse } from "next/server";
import { uploadImageToShopify } from "@/application/shopify-upload-image";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const reference = String(form.get("reference") ?? "producto");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Sube un archivo de imagen" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const safeRef = reference.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() || "img";
    const filename = `${safeRef}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const url = await uploadImageToShopify({
      filename,
      mimeType: file.type || "image/jpeg",
      bytes,
    });

    return NextResponse.json({ url, filename });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error al subir imagen",
      },
      { status: 500 }
    );
  }
}
