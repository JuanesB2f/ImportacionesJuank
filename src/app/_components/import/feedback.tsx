"use client";

import type { SyncSummary } from "@/domain/sync";
import type { ImportApiResponse } from "./types";

export function ImportStats({
  rows,
  totalProducts,
  selectedProducts,
  selectedVariants,
}: {
  rows: number;
  totalProducts: number;
  selectedProducts: number;
  selectedVariants: number;
}) {
  const items = [
    { label: "Filas Excel", value: rows },
    { label: "En archivo", value: totalProducts },
    { label: "Seleccionados", value: selectedProducts },
    { label: "Variantes sel.", value: selectedVariants },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
        >
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {s.label}
          </p>
          <p className="text-2xl font-semibold text-zinc-900">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ImportIssues({
  issues,
}: {
  issues: ImportApiResponse["preview"]["issues"];
}) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="mb-2 text-sm font-semibold text-amber-900">
        Avisos ({issues.length})
      </h2>
      <ul className="max-h-32 space-y-1 overflow-auto text-sm text-amber-900">
        {issues.map((issue, i) => (
          <li key={`${issue.row}-${i}`}>
            {issue.row > 0 ? `Fila ${issue.row}: ` : ""}[{issue.level}]{" "}
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SyncResult({ summary }: { summary: SyncSummary }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        summary.errorCount > 0
          ? "border-amber-200 bg-amber-50"
          : "border-teal-200 bg-teal-50"
      }`}
    >
      <h2 className="mb-2 text-sm font-semibold text-zinc-900">
        Resultado — {summary.okCount} ok / {summary.errorCount} errores
      </h2>
      <ul className="max-h-40 space-y-1 overflow-auto text-sm">
        {summary.results.map((r) => (
          <li key={r.handle}>
            {r.ok
              ? `✓ ${r.reference} — ${r.variantCount} variantes${r.error ? ` ${r.error}` : ""}`
              : `✗ ${r.reference}: ${r.error}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExcelDropzone({
  loading,
  syncing,
  importModeLabel,
  onFile,
}: {
  loading: boolean;
  syncing: boolean;
  importModeLabel: string;
  onFile: (file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 transition hover:border-teal-500 hover:bg-teal-50/40">
      <span className="text-sm font-medium text-zinc-800">
        {loading
          ? "Procesando…"
          : `Arrastra o elige tu Excel (.xlsx) — modo: ${importModeLabel}`}
      </span>
      <span className="text-xs text-zinc-500">
        REFERENCIA · COLOR · TALLA · CANTIDAD · (precios opcionales)
      </span>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        disabled={loading || syncing}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
