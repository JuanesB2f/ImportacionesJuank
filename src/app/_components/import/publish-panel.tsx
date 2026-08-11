"use client";

import type { CollectionOption } from "./types";
import type { ImportMode } from "@/domain/import-mode";
import { isHomepageCollection } from "@/domain/collections";

export function PublishPanel({
  collections,
  selectedCollections,
  publishStatus,
  importMode,
  syncing,
  canSync,
  hasCsv,
  onToggleCollection,
  onStatusChange,
  onDownloadCsv,
  onSync,
}: {
  collections: CollectionOption[];
  selectedCollections: string[];
  publishStatus: "active" | "draft";
  importMode: ImportMode;
  syncing: boolean;
  canSync: boolean;
  hasCsv: boolean;
  onToggleCollection: (id: string) => void;
  onStatusChange: (status: "active" | "draft") => void;
  onDownloadCsv: () => void;
  onSync: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="ios-alert ios-alert-warning">
        <p className="font-semibold">Inicio de Shopify (Colección destacada)</p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">
          Los productos <strong>no van al inicio</strong> solos. Solo aparecen
          ahí si marcas “Página de inicio” / Destacados, o si el tema apunta la
          sección a “Todos los productos”. Usa colecciones como Jeans o Corsets
          para el menú; marca inicio solo cuando quieras destacar algo.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ios-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ios-label">
            Destino en Shopify (colección / categoría)
          </h2>
          <p className="mb-3 text-xs text-ios-muted">
            Ej. Jeans, Corsets… — menú DAMAS. No marques “Página de inicio” salvo
            que quieras ese producto en el home.
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-ios-orange">
              Crea colecciones en Shopify (ej. Jeans) para asignar destino.
            </p>
          ) : (
            <div className="flex max-h-56 flex-col gap-2 overflow-auto">
              {collections.map((c) => {
                const homeRisk = isHomepageCollection(c);
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-ios-sm border px-3 py-2 text-sm transition hover:bg-ios-fill ${
                      homeRisk
                        ? "border-ios-orange/40 bg-ios-orange/10"
                        : "border-ios-separator/50 bg-ios-secondary/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollections.includes(c.id)}
                      onChange={() => onToggleCollection(c.id)}
                      className="mt-0.5 accent-ios-blue"
                    />
                    <span>
                      <span className="font-medium text-ios-label">
                        {c.title}
                      </span>
                      {homeRisk ? (
                        <span className="mt-0.5 block text-[11px] text-ios-orange">
                          Alimenta el inicio — solo si quieres destacarlo
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="ios-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ios-label">
            Estado al publicar
          </h2>
          <div className="flex flex-col gap-2">
            {(
              [
                {
                  id: "draft" as const,
                  label: "Borrador (recomendado)",
                  hint: "No se ve en la tienda ni en el inicio",
                },
                {
                  id: "active" as const,
                  label: "Activo",
                  hint: "Visible en la colección que elijas (no en el home, salvo Página de inicio)",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-start gap-2 rounded-ios-sm border border-ios-separator/50 bg-ios-secondary/30 px-3 py-3 text-sm"
              >
                <input
                  type="radio"
                  name="status"
                  checked={publishStatus === opt.id}
                  onChange={() => onStatusChange(opt.id)}
                  className="mt-1 accent-ios-blue"
                />
                <span>
                  <span className="font-medium text-ios-label">{opt.label}</span>
                  <span className="block text-xs text-ios-muted">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onDownloadCsv}
              disabled={!hasCsv || syncing}
              className="ios-btn ios-btn-secondary w-full sm:w-auto"
            >
              Descargar CSV
            </button>
            <button
              type="button"
              onClick={onSync}
              disabled={!canSync || syncing}
              className="ios-btn ios-btn-primary w-full sm:w-auto"
            >
              {syncing
                ? "Subiendo…"
                : importMode === "replace"
                  ? "Cargar desde 0 → Shopify"
                  : "Actualizar → Shopify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
