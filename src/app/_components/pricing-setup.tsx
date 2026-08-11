"use client";

import { useState } from "react";
import { PRICE_RULES } from "@/domain/pricing";

export function PricingSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSetup(activateDiscount: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/shopify/pricing/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activateDiscount }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        metafields?: { messages: string[] };
        discount?: { ok: boolean; message: string; discountId?: string };
      };
      if (!res.ok) throw new Error(json.error ?? "Error de setup");

      const lines = [
        ...(json.metafields?.messages ?? []).map((m) => `Metafield: ${m}`),
        json.discount
          ? `Descuento: ${json.discount.message}${json.discount.discountId ? ` (${json.discount.discountId})` : ""}`
          : "Descuento: omitido (solo metafields)",
      ];
      setResult(lines.join("\n"));
      if (json.discount && !json.discount.ok) {
        setError(json.discount.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Precios por cantidad
        </h1>
        <p className="text-zinc-600">
          En el checkout, el cliente paga según cuántas prendas lleva en el
          carrito. El precio Detal es el de la variante; los otros se aplican
          como ajuste automático.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {PRICE_RULES.map((rule) => (
          <div
            key={rule.key}
            className="rounded-2xl border border-zinc-200 bg-white p-4"
          >
            <p className="font-semibold text-zinc-900">
              {rule.label}{" "}
              <span className="font-normal text-zinc-500">({rule.range})</span>
            </p>
            <p className="mt-1 text-sm text-zinc-600">{rule.description}</p>
            <p className="mt-2 text-xs text-zinc-400">
              {rule.sendsToShopify
                ? "Precio de venta en Shopify (variante)"
                : `Metafield: importacionesjuank.${rule.metafieldKey}`}
            </p>
          </div>
        ))}
      </div>

      <ol className="list-decimal space-y-2 rounded-2xl border border-zinc-200 bg-white p-5 pl-9 text-sm text-zinc-700">
        <li>
          En Dev Dashboard → app → <strong>Scopes</strong>, asegúrate de tener{" "}
          <code className="rounded bg-zinc-100 px-1">write_discounts</code> y{" "}
          <code className="rounded bg-zinc-100 px-1">read_discounts</code>.
          Guarda, publica la versión e <strong>reinstala</strong> la app en la
          tienda (sin reinstalar el token no ve los scopes nuevos).
        </li>
        <li>
          La Function ya se despliega con{" "}
          <code className="rounded bg-zinc-100 px-1">
            npm run shopify:deploy
          </code>{" "}
          (si aún no, ejecútalo una vez).
        </li>
        <li>
          Aquí: pulsa <strong>Activar descuento en Shopify</strong>.
        </li>
        <li>
          Opcional: pega{" "}
          <code className="rounded bg-zinc-100 px-1">
            theme/snippets/juank-price-tiers.liquid
          </code>{" "}
          en el tema con{" "}
          <code className="rounded bg-zinc-100 px-1">
            {"{% render 'juank-price-tiers' %}"}
          </code>
          .
        </li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSetup(false)}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Crear metafields
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSetup(true)}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40"
        >
          {loading ? "Configurando…" : "Activar descuento en Shopify"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 whitespace-pre-wrap">
          {error}
          <p className="mt-2 text-xs">
            Si dice que no encuentra la Function, falta el deploy (
            <code>npx shopify app deploy</code>).
          </p>
        </div>
      )}

      {result && (
        <pre className="overflow-auto rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs text-teal-950">
          {result}
        </pre>
      )}
    </div>
  );
}
