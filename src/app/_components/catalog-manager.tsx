"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import type { ShopifyCatalogProduct } from "@/domain/shopify-catalog";
import { shopifyAdminProductUrl } from "@/lib/config";

export function CatalogManager() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<ShopifyCatalogProduct[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<ShopifyCatalogProduct | null>(
    null
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    setRowErrors({});
    try {
      const params = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/shopify/products${params}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        products?: ShopifyCatalogProduct[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Error al cargar catálogo");
      setProducts(json.products ?? []);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  function markBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function deleteOne(product: ShopifyCatalogProduct): Promise<boolean> {
    markBusy(product.id, true);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });

    try {
      const res = await fetch("/api/shopify/products/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        deletedProductId?: string;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "No se pudo eliminar en Shopify");
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      if (expanded === product.id) setExpanded(null);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al eliminar";
      setRowErrors((prev) => ({ ...prev, [product.id]: message }));
      return false;
    } finally {
      markBusy(product.id, false);
    }
  }

  async function confirmPendingDelete() {
    if (!pendingDelete) return;
    const product = pendingDelete;
    setPendingDelete(null);
    setStatusMsg(`Eliminando ${product.title}…`);
    const ok = await deleteOne(product);
    setStatusMsg(
      ok
        ? `✓ Eliminado: ${product.title}`
        : `✗ No se pudo eliminar: ${product.title}`
    );
  }

  async function deleteSelected() {
    const targets = products.filter((p) => selected.has(p.id));
    if (targets.length === 0) return;

    setStatusMsg(`Eliminando ${targets.length} productos…`);
    let okCount = 0;
    for (const product of targets) {
      const ok = await deleteOne(product);
      if (ok) okCount += 1;
    }
    setStatusMsg(`Eliminados ${okCount} de ${targets.length}`);
  }

  async function deleteAllDrafts() {
    const drafts = products.filter((p) => p.status === "DRAFT");
    if (drafts.length === 0) {
      setStatusMsg("No hay borradores para eliminar");
      return;
    }
    setStatusMsg(`Eliminando ${drafts.length} borradores…`);
    let okCount = 0;
    for (const product of drafts) {
      const ok = await deleteOne(product);
      if (ok) okCount += 1;
    }
    setStatusMsg(`Borradores eliminados: ${okCount} de ${drafts.length}`);
    // Siempre sincronizar con Shopify (evita fantasmas en la lista)
    await load(q || undefined);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500">
        Cargando catálogo…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Catálogo Shopify
          </h1>
          <p className="mt-1 text-zinc-600">
            Ver, buscar y eliminar productos. Puedes borrar uno, varios o todos
            los borradores.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar título o SKU…"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            Recargar
          </button>
        </form>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleSelectAll}
          disabled={products.length === 0}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40"
        >
          {selected.size === products.length && products.length > 0
            ? "Quitar selección"
            : "Seleccionar todos"}
        </button>
        <button
          type="button"
          onClick={() => void deleteSelected()}
          disabled={selected.size === 0 || busyIds.size > 0}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
        >
          Eliminar seleccionados ({selected.size})
        </button>
        <button
          type="button"
          onClick={() => void deleteAllDrafts()}
          disabled={
            !products.some((p) => p.status === "DRAFT") || busyIds.size > 0
          }
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-40"
        >
          Eliminar todos los borradores
        </button>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {statusMsg}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {pendingDelete && (
        <div className="rounded-xl border border-red-300 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">
            ¿Eliminar permanentemente &quot;{pendingDelete.title}&quot;?
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Handle: {pendingDelete.handle} · {pendingDelete.status}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmPendingDelete()}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando productos…</p>
      ) : products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500">
          No hay productos (o no coinciden con la búsqueda).
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const open = expanded === p.id;
            const deleting = busyIds.has(p.id);
            const rowError = rowErrors[p.id];

            return (
              <article
                key={p.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="h-4 w-4"
                    aria-label={`Seleccionar ${p.title}`}
                  />
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-400">
                      N/A
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium text-zinc-900">
                      {p.title}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      <span className="font-mono">{p.handle}</span>
                      {" · "}
                      <span
                        className={
                          p.status === "ACTIVE"
                            ? "text-teal-700"
                            : "text-amber-700"
                        }
                      >
                        {p.status}
                      </span>
                      {" · "}
                      Stock total: {p.totalInventory ?? 0}
                      {p.collections.length > 0 &&
                        ` · ${p.collections.map((c) => c.title).join(", ")}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : p.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                  >
                    {open ? "Ocultar" : "Ver variantes"}
                  </button>
                  <a
                    href={shopifyAdminProductUrl(p.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                  >
                    Abrir en Shopify
                  </a>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPendingDelete(p);
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {deleting ? "Eliminando…" : "Eliminar"}
                  </button>
                </div>

                {rowError && (
                  <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
                    No se pudo eliminar: {rowError}
                  </div>
                )}

                {open && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="py-1 pr-3">SKU</th>
                          <th className="py-1 pr-3">Opciones</th>
                          <th className="py-1 pr-3">Precio</th>
                          <th className="py-1">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.variants.map((v) => (
                          <tr key={v.id} className="border-t border-zinc-200">
                            <td className="py-1.5 pr-3 font-mono text-xs">
                              {v.sku || "—"}
                            </td>
                            <td className="py-1.5 pr-3">
                              {v.selectedOptions
                                .map((o) => `${o.name}: ${o.value}`)
                                .join(" / ")}
                            </td>
                            <td className="py-1.5 pr-3">${v.price}</td>
                            <td className="py-1.5">{v.inventoryQuantity ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
