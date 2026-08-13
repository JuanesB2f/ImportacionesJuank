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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:py-8 lg:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ios-label sm:text-3xl">
          Precios por cantidad
        </h1>
        <p className="text-sm text-ios-muted sm:text-base">
          En el checkout, el cliente paga según cuántas prendas lleva en el
          carrito. El precio Detal es el de la variante; los otros se aplican
          como ajuste automático.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {PRICE_RULES.map((rule) => (
          <div key={rule.key} className="ios-card p-4">
            <p className="font-semibold text-ios-label">
              {rule.label}{" "}
              <span className="font-normal text-ios-muted">({rule.range})</span>
            </p>
            <p className="mt-1 text-sm text-ios-muted">{rule.description}</p>
            <p className="mt-2 text-xs text-ios-faint">
              {rule.sendsToShopify
                ? "Precio de venta en Shopify (variante)"
                : `Metafield: importacionesjuank.${rule.metafieldKey}`}
            </p>
          </div>
        ))}
      </div>

      <ol className="list-decimal space-y-2 rounded-ios border border-ios-separator bg-ios-elevated p-5 pl-9 text-sm text-ios-muted">
        <li>
          En Dev Dashboard → app → <strong className="text-ios-label">Scopes</strong>, asegúrate de tener{" "}
          <code className="rounded-md bg-ios-secondary px-1 text-ios-blue">
            write_discounts
          </code>{" "}
          y{" "}
          <code className="rounded-md bg-ios-secondary px-1 text-ios-blue">
            read_discounts
          </code>
          . Guarda, publica la versión e{" "}
          <strong className="text-ios-label">reinstala</strong> la app en la
          tienda (sin reinstalar el token no ve los scopes nuevos).
        </li>
        <li>
          La Function ya se despliega con{" "}
          <code className="rounded-md bg-ios-secondary px-1 text-ios-blue">
            npm run shopify:deploy
          </code>{" "}
          (si aún no, ejecútalo una vez).
        </li>
        <li>
          Aquí: pulsa{" "}
          <strong className="text-ios-label">Activar descuento en Shopify</strong>.
        </li>
        <li>
          En el tema, sube{" "}
          <code className="rounded-md bg-ios-secondary px-1 text-ios-blue">
            theme/snippets/juank-price-tiers.liquid
          </code>{" "}
          y{" "}
          <code className="rounded-md bg-ios-secondary px-1 text-ios-blue">
            theme/snippets/juank-qty-limit.liquid
          </code>
          . En la ficha de producto (o un bloque Liquid personalizado) pon{" "}
          <code className="rounded-md bg-ios-secondary px-1 text-ios-blue">
            {"{% render 'juank-price-tiers' %}"}
          </code>
          . Así el selector de cantidad se bloquea según el stock (si hay 1,
          queda en 1).
        </li>
      </ol>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSetup(false)}
          className="ios-btn ios-btn-secondary"
        >
          Crear metafields
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSetup(true)}
          className="ios-btn ios-btn-primary"
        >
          {loading ? "Configurando…" : "Activar descuento en Shopify"}
        </button>
      </div>

      {error && (
        <div className="ios-alert ios-alert-warning whitespace-pre-wrap">
          {error}
          <p className="mt-2 text-xs opacity-80">
            Si dice que no encuentra la Function, falta el deploy (
            <code>npx shopify app deploy</code>).
          </p>
        </div>
      )}

      {result && (
        <pre className="ios-alert ios-alert-success overflow-auto whitespace-pre-wrap font-mono text-xs">
          {result}
        </pre>
      )}
    </div>
  );
}
