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
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-ios-muted">
        Cargando catálogo…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:py-8 lg:px-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ios-label sm:text-3xl">
            Catálogo Shopify
          </h1>
          <p className="mt-1 text-sm text-ios-muted sm:text-base">
            Ver, buscar y eliminar productos. Puedes borrar uno, varios o todos
            los borradores.
          </p>
        </div>
        <form
          className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            void load(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar título o SKU…"
            className="ios-input sm:min-w-56"
          />
          <div className="flex gap-2">
            <button type="submit" className="ios-btn ios-btn-primary flex-1 sm:flex-none">
              Buscar
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="ios-btn ios-btn-secondary flex-1 sm:flex-none"
            >
              Recargar
            </button>
          </div>
        </form>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={toggleSelectAll}
          disabled={products.length === 0}
          className="ios-btn ios-btn-secondary"
        >
          {selected.size === products.length && products.length > 0
            ? "Quitar selección"
            : "Seleccionar todos"}
        </button>
        <button
          type="button"
          onClick={() => void deleteSelected()}
          disabled={selected.size === 0 || busyIds.size > 0}
          className="ios-btn ios-btn-danger"
        >
          Eliminar seleccionados ({selected.size})
        </button>
        <button
          type="button"
          onClick={() => void deleteAllDrafts()}
          disabled={
            !products.some((p) => p.status === "DRAFT") || busyIds.size > 0
          }
          className="ios-btn ios-btn-secondary border-ios-orange/40 text-ios-orange"
        >
          Eliminar todos los borradores
        </button>
      </div>

      {statusMsg && <div className="ios-alert ios-alert-info">{statusMsg}</div>}
      {error && <div className="ios-alert ios-alert-error">{error}</div>}

      {pendingDelete && (
        <div className="ios-card p-4 shadow-lg shadow-black/40">
          <p className="text-sm font-medium text-ios-label">
            ¿Eliminar permanentemente &quot;{pendingDelete.title}&quot;?
          </p>
          <p className="mt-1 text-xs text-ios-muted">
            Handle: {pendingDelete.handle} · {pendingDelete.status}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void confirmPendingDelete()}
              className="ios-btn ios-btn-danger"
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="ios-btn ios-btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ios-muted">Cargando productos…</p>
      ) : products.length === 0 ? (
        <p className="rounded-ios border border-dashed border-ios-separator bg-ios-elevated px-6 py-12 text-center text-sm text-ios-muted">
          No hay productos (o no coinciden con la búsqueda).
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const open = expanded === p.id;
            const deleting = busyIds.has(p.id);
            const rowError = rowErrors[p.id];

            return (
              <article key={p.id} className="ios-card overflow-hidden">
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-4 sm:py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="h-4 w-4 shrink-0 accent-ios-blue"
                      aria-label={`Seleccionar ${p.title}`}
                    />
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ios-fill text-xs text-ios-faint">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-medium text-ios-label">
                        {p.title}
                      </h2>
                      <p className="text-xs text-ios-muted">
                        <span className="font-mono">{p.handle}</span>
                        {" · "}
                        <span
                          className={
                            p.status === "ACTIVE"
                              ? "text-ios-green"
                              : "text-ios-orange"
                          }
                        >
                          {p.status}
                        </span>
                        {" · "}
                        Stock: {p.totalInventory ?? 0}
                        {p.collections.length > 0 &&
                          ` · ${p.collections.map((c) => c.title).join(", ")}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : p.id)}
                      className="ios-btn ios-btn-secondary px-2.5! py-1.5! text-xs sm:text-sm"
                    >
                      {open ? "Ocultar" : "Variantes"}
                    </button>
                    <a
                      href={shopifyAdminProductUrl(p.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="ios-btn ios-btn-secondary px-2.5! py-1.5! text-center text-xs sm:text-sm"
                    >
                      Shopify
                    </a>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDelete(p);
                      }}
                      className="ios-btn ios-btn-danger px-2.5! py-1.5! text-xs sm:text-sm"
                    >
                      {deleting ? "…" : "Eliminar"}
                    </button>
                  </div>
                </div>

                {rowError && (
                  <div className="border-t border-ios-red/30 bg-ios-red/10 px-4 py-2 text-sm text-ios-red">
                    No se pudo eliminar: {rowError}
                  </div>
                )}

                {open && (
                  <div className="overflow-x-auto border-t border-ios-separator/50 bg-ios-secondary/40 px-4 py-3">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-ios-muted">
                        <tr>
                          <th className="py-1 pr-3">SKU</th>
                          <th className="py-1 pr-3">Opciones</th>
                          <th className="py-1 pr-3">Precio</th>
                          <th className="py-1">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.variants.map((v) => (
                          <tr
                            key={v.id}
                            className="border-t border-ios-separator/40"
                          >
                            <td className="py-1.5 pr-3 font-mono text-xs text-ios-muted">
                              {v.sku || "—"}
                            </td>
                            <td className="py-1.5 pr-3 text-ios-label">
                              {v.selectedOptions
                                .map((o) => `${o.name}: ${o.value}`)
                                .join(" / ")}
                            </td>
                            <td className="py-1.5 pr-3 tabular-nums">
                              ${v.price}
                            </td>
                            <td className="py-1.5 tabular-nums">
                              {v.inventoryQuantity ?? 0}
                            </td>
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
