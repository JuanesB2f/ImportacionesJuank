"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getColorImage,
  upsertColorImage,
  type CatalogProduct,
  type CatalogVariant,
} from "@/domain/catalog";
import { buildSku, toHandle } from "@/domain/naming";
import { PRICE_RULES } from "@/domain/pricing";
import type { SyncSummary } from "@/domain/sync";
import type { CollectionOption } from "./import/types";

const DEFAULT_SIZES = ["S", "M", "L", "XL"];

function emptyPrices() {
  return {
    priceRetail: "",
    priceEntrepreneur: "",
    priceWholesale: "",
    priceDistributor: "",
  };
}

function parseList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
}

export function ProductCreator() {
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [colorsRaw, setColorsRaw] = useState("");
  const [sizesRaw, setSizesRaw] = useState(DEFAULT_SIZES.join(", "));
  const [qty, setQty] = useState("0");
  const [prices, setPrices] = useState(emptyPrices);
  const [bodyHtml, setBodyHtml] = useState("");
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [publishStatus, setPublishStatus] = useState<"active" | "draft">(
    "draft"
  );
  const [colorImages, setColorImages] = useState<
    CatalogProduct["colorImages"]
  >([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  const colors = useMemo(() => parseList(colorsRaw), [colorsRaw]);
  const sizes = useMemo(() => parseList(sizesRaw), [sizesRaw]);

  const draftProduct = useMemo((): CatalogProduct | null => {
    const ref = reference.trim().toUpperCase().replace(/\s+/g, "");
    if (!ref || colors.length === 0 || sizes.length === 0) return null;

    const nQty = Math.max(0, Math.floor(Number(qty) || 0));
    const retail = Number(prices.priceRetail) || 0;
    const entrepr = Number(prices.priceEntrepreneur) || 0;
    const wholesale = Number(prices.priceWholesale) || 0;
    const dist = Number(prices.priceDistributor) || 0;

    const variants: CatalogVariant[] = [];
    for (const color of colors) {
      for (const size of sizes) {
        variants.push({
          sku: buildSku(ref, color, size),
          option1Value: color,
          option2Value: size,
          inventoryQty: nQty,
          priceRetail: retail,
          priceEntrepreneur: entrepr,
          priceWholesale: wholesale,
          priceDistributor: dist,
        });
      }
    }

    let product: CatalogProduct = {
      reference: ref,
      handle: toHandle(ref),
      title: title.trim() || ref,
      bodyHtml: bodyHtml.trim(),
      vendor: "ImportacionesJuank",
      option1Name: "Color",
      option2Name: "Talla",
      status: publishStatus,
      colorImages: colorImages?.filter((c) =>
        colors.includes(c.color.trim().toUpperCase())
      ),
      variants,
    };

    if (product.colorImages?.[0]) {
      product = {
        ...product,
        imageUrl: product.colorImages[0].url,
        imageFilename: product.colorImages[0].filename,
      };
    }

    return product;
  }, [
    reference,
    title,
    colors,
    sizes,
    qty,
    prices,
    bodyHtml,
    publishStatus,
    colorImages,
  ]);

  useEffect(() => {
    void fetch("/api/shopify/collections")
      .then((r) => r.json())
      .then((json: { collections?: CollectionOption[] }) => {
        if (json.collections) setCollections(json.collections);
      })
      .catch(() => undefined);
  }, []);

  async function uploadColorImage(color: string, file: File) {
    const ref = reference.trim().toUpperCase().replace(/\s+/g, "") || "NUEVO";
    const key = `${ref}||${color}`;
    setUploadingKey(key);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("reference", `${ref}-${color}`);
      const res = await fetch("/api/shopify/upload-image", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        url?: string;
        filename?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "No se pudo subir la imagen");
      }

      const base: CatalogProduct = {
        reference: ref,
        handle: toHandle(ref),
        title: title || ref,
        bodyHtml: "",
        vendor: "ImportacionesJuank",
        option1Name: "Color",
        option2Name: "Talla",
        status: "draft",
        colorImages: colorImages ?? [],
        variants: [],
      };
      const next = upsertColorImage(base, {
        color,
        url: json.url,
        filename: json.filename,
      });
      setColorImages(next.colorImages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploadingKey(null);
    }
  }

  async function publish() {
    if (!draftProduct) {
      setError("Completa referencia, al menos un color y una talla");
      return;
    }
    if (draftProduct.variants.some((v) => v.priceRetail <= 0)) {
      const ok = window.confirm("Precio Detal en 0. ¿Publicar igual?");
      if (!ok) return;
    }

    setSyncing(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: [draftProduct],
          options: {
            status: publishStatus,
            collectionIds: selectedCollections,
            mode: "replace",
          },
        }),
      });
      const json = (await res.json()) as {
        summary?: SyncSummary;
        error?: string;
      };
      if (!res.ok || !json.summary) {
        throw new Error(json.error ?? "Error al publicar");
      }
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:py-8 lg:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ios-label sm:text-3xl">
          Nueva prenda
        </h1>
        <p className="text-sm text-ios-muted sm:text-base">
          Una referencia = una ficha. Variantes: Color + Talla. La categoría del
          menú se elige con la colección.
        </p>
      </header>

      <div className="ios-card space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ios-muted">
            Referencia *
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="CRG001"
              className="ios-input mt-1 font-mono uppercase"
            />
          </label>
          <label className="text-sm text-ios-muted">
            Título
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre visible"
              className="ios-input mt-1"
            />
          </label>
        </div>

        <label className="block text-sm text-ios-muted">
          Colores * (separados por coma)
          <input
            value={colorsRaw}
            onChange={(e) => setColorsRaw(e.target.value)}
            placeholder="NEGRO, ROJO, BEIGE"
            className="ios-input mt-1 uppercase"
          />
        </label>

        <label className="block text-sm text-ios-muted">
          Tallas * (separadas por coma)
          <input
            value={sizesRaw}
            onChange={(e) => setSizesRaw(e.target.value)}
            placeholder="S, M, L, XL"
            className="ios-input mt-1 uppercase"
          />
        </label>

        <label className="block text-sm text-ios-muted">
          Stock inicial por variante
          <input
            type="number"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="ios-input mt-1 sm:max-w-40"
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-ios-label">Precios</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["priceRetail", "detal"],
                ["priceEntrepreneur", "emprendedor"],
                ["priceWholesale", "mayorista"],
                ["priceDistributor", "distribuidor"],
              ] as const
            ).map(([field, key]) => {
              const rule = PRICE_RULES.find((r) => r.key === key)!;
              return (
                <label key={field} className="text-xs text-ios-muted">
                  {rule.label}{" "}
                  <span className="text-ios-faint">({rule.range})</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={prices[field]}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [field]: e.target.value }))
                    }
                    className="ios-input mt-1"
                    placeholder="0.00"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <label className="block text-sm text-ios-muted">
          Descripción (opcional)
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={3}
            className="ios-input mt-1 resize-y"
          />
        </label>
      </div>

      <div className="ios-card p-4 sm:p-5">
        <h2 className="mb-1 text-sm font-semibold text-ios-label">
          Fotos por color
        </h2>
        <p className="mb-3 text-xs text-ios-muted">
          Una foto por color (cubre todas las tallas de ese color).
        </p>
        {colors.length === 0 ? (
          <p className="text-sm text-ios-muted">Escribe colores arriba.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {colors.map((color) => {
              const stub: CatalogProduct = {
                reference: reference || "X",
                handle: "x",
                title: "",
                bodyHtml: "",
                vendor: "",
                option1Name: "Color",
                option2Name: "Talla",
                status: "draft",
                colorImages: colorImages ?? [],
                variants: [],
              };
              const img = getColorImage(stub, color);
              const key = `${reference}||${color}`;
              const uploading = uploadingKey === key;
              return (
                <div
                  key={color}
                  className="flex items-center gap-3 rounded-ios-sm border border-ios-separator/50 bg-ios-secondary/40 px-3 py-2"
                >
                  {img?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.url}
                      alt={color}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-ios-fill text-[10px] text-ios-faint">
                      sin img
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-ios-label">{color}</p>
                    <label className="cursor-pointer text-xs font-medium text-ios-blue">
                      {uploading
                        ? "Subiendo…"
                        : img
                          ? "Cambiar foto"
                          : "Cargar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadColorImage(color, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="ios-card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-semibold text-ios-label">
            Colección (categoría)
          </h2>
          <p className="mb-2 text-xs text-ios-muted">
            Dónde aparece en el menú (Jeans, Corsets…).
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-ios-orange">Sin colecciones en Shopify.</p>
          ) : (
            <div className="flex max-h-40 flex-col gap-2 overflow-auto">
              {collections.map((c) => (
                <label
                  key={c.id}
                  className="flex gap-2 text-sm text-ios-label"
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(c.id)}
                    onChange={() =>
                      setSelectedCollections((prev) =>
                        prev.includes(c.id)
                          ? prev.filter((x) => x !== c.id)
                          : [...prev, c.id]
                      )
                    }
                    className="accent-ios-blue"
                  />
                  {c.title}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="ios-card p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-semibold text-ios-label">Estado</h2>
          <div className="flex flex-col gap-2 text-sm text-ios-label">
            <label className="flex gap-2">
              <input
                type="radio"
                checked={publishStatus === "draft"}
                onChange={() => setPublishStatus("draft")}
                className="accent-ios-blue"
              />
              Borrador
            </label>
            <label className="flex gap-2">
              <input
                type="radio"
                checked={publishStatus === "active"}
                onChange={() => setPublishStatus("active")}
                className="accent-ios-blue"
              />
              Activo
            </label>
          </div>
        </div>
      </div>

      {draftProduct && (
        <p className="text-sm text-ios-muted">
          {draftProduct.variants.length} variantes (Color × Talla). Ejemplo:{" "}
          <code className="rounded-md bg-ios-secondary px-1.5 py-0.5 font-mono text-xs text-ios-blue">
            {draftProduct.variants[0]?.sku}
          </code>
        </p>
      )}

      {error && <div className="ios-alert ios-alert-error">{error}</div>}

      {summary && (
        <div
          className={`ios-alert ${
            summary.errorCount > 0 ? "ios-alert-warning" : "ios-alert-success"
          }`}
        >
          {summary.results.map((r) => (
            <p key={r.handle}>
              {r.ok
                ? `✓ ${r.reference} publicado (${r.variantCount} variantes)${r.error ? ` — ${r.error}` : ""}`
                : `✗ ${r.reference}: ${r.error}`}
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => void publish()}
        disabled={!draftProduct || syncing}
        className="ios-btn ios-btn-primary w-full py-3.5 text-base"
      >
        {syncing ? "Publicando…" : "Crear en Shopify"}
      </button>
    </div>
  );
}
