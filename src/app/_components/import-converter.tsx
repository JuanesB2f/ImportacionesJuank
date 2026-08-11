"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogProduct } from "@/domain/catalog";
import { upsertColorImage } from "@/domain/catalog";
import type { ImportMode } from "@/domain/import-mode";
import {
  filterProductsByPrefixes,
  groupProductsByPrefix,
} from "@/domain/reference-groups";
import type { SyncSummary } from "@/domain/sync";
import { FamilyGroupsPanel } from "./import/family-groups";
import {
  ExcelDropzone,
  ImportIssues,
  ImportStats,
  SyncResult,
} from "./import/feedback";
import { ImportModeSelector } from "./import/mode-selector";
import { PublishPanel } from "./import/publish-panel";
import { ReferencePricingPanel } from "./import/reference-pricing";
import {
  applyPricesToProducts,
  emptyBulkPrices,
  type BulkPrices,
  type CollectionOption,
  type ImportApiResponse,
  type PriceField,
} from "./import/types";
import { VariantsTable } from "./import/variants-table";

export function ImportConverter() {
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<ImportApiResponse | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [publishStatus, setPublishStatus] = useState<"active" | "draft">(
    "draft"
  );
  const [bulkPrices, setBulkPrices] = useState<BulkPrices>(emptyBulkPrices);
  const [refQuery, setRefQuery] = useState("");
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const hasBlockingErrors =
    data?.preview.issues.some((i) => i.level === "error") ?? false;

  const groups = useMemo(() => groupProductsByPrefix(products), [products]);

  const selectedProducts = useMemo(
    () => filterProductsByPrefixes(products, selectedPrefixes),
    [products, selectedPrefixes]
  );

  const filteredReferences = useMemo(() => {
    const q = refQuery.trim().toUpperCase();
    return selectedProducts.filter((p) => {
      if (!q) return true;
      return (
        p.reference.includes(q) || p.title.toUpperCase().includes(q)
      );
    });
  }, [selectedProducts, refQuery]);

  const pricedTargets = useMemo(() => {
    if (selectedRefs.length === 0) return [];
    const set = new Set(selectedRefs);
    return selectedProducts.filter((p) => set.has(p.reference));
  }, [selectedProducts, selectedRefs]);

  const stats = useMemo(() => {
    const variants = selectedProducts.reduce(
      (acc, p) => acc + p.variants.length,
      0
    );
    return {
      products: selectedProducts.length,
      variants,
      totalProducts: products.length,
    };
  }, [products, selectedProducts]);

  useEffect(() => {
    void fetch("/api/shopify/collections")
      .then((r) => r.json())
      .then((json: { collections?: CollectionOption[] }) => {
        if (json.collections) setCollections(json.collections);
      })
      .catch(() => undefined);
  }, []);

  async function onFileChange(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    setData(null);
    setProducts([]);
    setSelectedPrefixes([]);
    setSyncSummary(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as ImportApiResponse;
      if (!res.ok) {
        throw new Error(json.error ?? "Error al procesar el Excel");
      }
      setData(json);
      setProducts(json.preview.products);
      setSelectedPrefixes(
        groupProductsByPrefix(json.preview.products).map((g) => g.prefix)
      );
      setSelectedRefs(json.preview.products.map((p) => p.reference));
      setRefQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function updateVariantPrice(
    productHandle: string,
    sku: string,
    field: PriceField,
    value: string
  ) {
    const n = Number(value);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.handle !== productHandle) return p;
        return {
          ...p,
          variants: p.variants.map((v) =>
            v.sku === sku
              ? { ...v, [field]: Number.isFinite(n) && n >= 0 ? n : 0 }
              : v
          ),
        };
      })
    );
  }

  function applyPricesToSelectedReferences() {
    if (selectedRefs.length === 0) {
      setError("Selecciona al menos una referencia para poner precios");
      return;
    }
    setProducts((prev) =>
      applyPricesToProducts(prev, selectedRefs, bulkPrices)
    );
    setError(null);
  }

  async function uploadColorImage(
    reference: string,
    color: string,
    file: File
  ) {
    const key = `${reference}||${color}`;
    setUploadingKey(key);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("reference", `${reference}-${color}`);
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
      setProducts((prev) =>
        prev.map((p) =>
          p.reference === reference
            ? upsertColorImage(p, {
                color,
                url: json.url!,
                filename: json.filename,
              })
            : p
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir imagen");
    } finally {
      setUploadingKey(null);
    }
  }

  function downloadCsv() {
    if (!data?.csv) return;
    const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopify-import-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function syncToShopify() {
    if (!selectedProducts.length || hasBlockingErrors) return;

    const missingPrice = selectedProducts.some((p) =>
      p.variants.some((v) => v.priceRetail <= 0)
    );
    if (missingPrice) {
      const ok = window.confirm(
        "Hay variantes con Precio Detal en 0 en las familias seleccionadas. ¿Subir igual?"
      );
      if (!ok) return;
    }

    const modeLabel =
      importMode === "replace"
        ? "CARGAR DESDE 0 (reemplaza stock)"
        : "ACTUALIZAR (suma stock / agrega refs)";
    const statusLabel =
      publishStatus === "active" ? "ACTIVO (a la venta)" : "BORRADOR";
    const cols = collections
      .filter((c) => selectedCollections.includes(c.id))
      .map((c) => c.title)
      .join(", ");

    const confirmed = window.confirm(
      `${modeLabel}\n\nFamilias: ${selectedPrefixes.join(", ")}\nProductos: ${stats.products} · Variantes: ${stats.variants}\nEstado: ${statusLabel}\nColecciones: ${cols || "(ninguna)"}\n\n¿Continuar?`
    );
    if (!confirmed) return;

    setSyncing(true);
    setError(null);
    setSyncSummary(null);

    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: selectedProducts.map((p) => ({
            ...p,
            status: publishStatus,
          })),
          options: {
            status: publishStatus,
            collectionIds: selectedCollections,
            mode: importMode,
          },
        }),
      });
      const json = (await res.json()) as {
        summary?: SyncSummary;
        error?: string;
      };
      if (!res.ok || !json.summary) {
        throw new Error(json.error ?? "Error al sincronizar con Shopify");
      }
      setSyncSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:py-8 lg:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ios-label sm:text-3xl">
          Importar inventario
        </h1>
        <p className="max-w-3xl text-sm text-ios-muted sm:text-base">
          Sube el Excel: cada referencia (CRG001) es un producto con Color +
          Talla. Elige colección (categoría del menú), precios y foto por color.
        </p>
      </header>

      <ImportModeSelector value={importMode} onChange={setImportMode} />

      <ExcelDropzone
        loading={loading}
        syncing={syncing}
        importModeLabel={importMode === "replace" ? "Desde 0" : "Actualizar"}
        onFile={onFileChange}
      />

      {error && <div className="ios-alert ios-alert-error">{error}</div>}

      {data && products.length > 0 && (
        <section className="space-y-6">
          <ImportStats
            rows={data.preview.stats.rows}
            totalProducts={stats.totalProducts}
            selectedProducts={stats.products}
            selectedVariants={stats.variants}
          />

          <FamilyGroupsPanel
            groups={groups}
            selectedPrefixes={selectedPrefixes}
            onToggle={(prefix) =>
              setSelectedPrefixes((prev) =>
                prev.includes(prefix)
                  ? prev.filter((p) => p !== prefix)
                  : [...prev, prefix]
              )
            }
            onSelectAll={() =>
              setSelectedPrefixes(groups.map((g) => g.prefix))
            }
            onClear={() => setSelectedPrefixes([])}
          />

          <ReferencePricingPanel
            filteredReferences={filteredReferences}
            selectedRefs={selectedRefs}
            pricedTargets={pricedTargets}
            bulkPrices={bulkPrices}
            refQuery={refQuery}
            uploadingKey={uploadingKey}
            onRefQueryChange={setRefQuery}
            onToggleRef={(reference) =>
              setSelectedRefs((prev) =>
                prev.includes(reference)
                  ? prev.filter((r) => r !== reference)
                  : [...prev, reference]
              )
            }
            onSelectVisible={() =>
              setSelectedRefs(filteredReferences.map((p) => p.reference))
            }
            onClearSelection={() => setSelectedRefs([])}
            onBulkPriceChange={(field, value) =>
              setBulkPrices((b) => ({ ...b, [field]: value }))
            }
            onApplyPrices={applyPricesToSelectedReferences}
            onUploadColorImage={uploadColorImage}
          />

          <PublishPanel
            collections={collections}
            selectedCollections={selectedCollections}
            publishStatus={publishStatus}
            importMode={importMode}
            syncing={syncing}
            canSync={!hasBlockingErrors && selectedProducts.length > 0}
            hasCsv={Boolean(data.csv)}
            onToggleCollection={(id) =>
              setSelectedCollections((prev) =>
                prev.includes(id)
                  ? prev.filter((x) => x !== id)
                  : [...prev, id]
              )
            }
            onStatusChange={setPublishStatus}
            onDownloadCsv={downloadCsv}
            onSync={syncToShopify}
          />

          <ImportIssues issues={data.preview.issues} />
          {syncSummary && <SyncResult summary={syncSummary} />}

          <VariantsTable
            products={selectedProducts}
            onPriceChange={updateVariantPrice}
          />
        </section>
      )}
    </div>
  );
}
