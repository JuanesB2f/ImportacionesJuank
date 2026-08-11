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
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Inicio de Shopify (Colección destacada)</p>
        <p className="mt-1 text-xs leading-relaxed">
          Los productos <strong>no van al inicio</strong> solos. Solo aparecen
          ahí si marcas “Página de inicio” / Destacados, o si el tema apunta la
          sección a “Todos los productos”. Usa colecciones como Jeans o Corsets
          para el menú; marca inicio solo cuando quieras destacar algo.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
            Destino en Shopify (colección / categoría)
          </h2>
          <p className="mb-3 text-xs text-zinc-500">
            Ej. Jeans, Corsets… — menú DAMAS. No marques “Página de inicio” salvo
            que quieras ese producto en el home.
          </p>
          {collections.length === 0 ? (
            <p className="text-sm text-amber-700">
              Crea colecciones en Shopify (ej. Jeans) para asignar destino.
            </p>
          ) : (
            <div className="flex max-h-56 flex-col gap-2 overflow-auto">
              {collections.map((c) => {
                const homeRisk = isHomepageCollection(c);
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 ${
                      homeRisk
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-zinc-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollections.includes(c.id)}
                      onChange={() => onToggleCollection(c.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-zinc-800">
                        {c.title}
                      </span>
                      {homeRisk ? (
                        <span className="mt-0.5 block text-[11px] text-amber-800">
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

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">
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
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-100 px-3 py-3 text-sm"
              >
                <input
                  type="radio"
                  name="status"
                  checked={publishStatus === opt.id}
                  onChange={() => onStatusChange(opt.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{opt.label}</span>
                  <span className="block text-xs text-zinc-500">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDownloadCsv}
              disabled={!hasCsv || syncing}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              Descargar CSV
            </button>
            <button
              type="button"
              onClick={onSync}
              disabled={!canSync || syncing}
              className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
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
