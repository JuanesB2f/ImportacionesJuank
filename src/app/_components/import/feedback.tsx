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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {items.map((s) => (
        <div key={s.label} className="ios-card px-3 py-3 sm:px-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ios-faint sm:text-xs">
            {s.label}
          </p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-ios-label sm:text-2xl">
            {s.value}
          </p>
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
    <div className="ios-alert ios-alert-warning">
      <h2 className="mb-2 text-sm font-semibold">Avisos ({issues.length})</h2>
      <ul className="max-h-32 space-y-1 overflow-auto text-sm">
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
      className={`ios-alert ${
        summary.errorCount > 0 ? "ios-alert-warning" : "ios-alert-success"
      }`}
    >
      <h2 className="mb-2 text-sm font-semibold text-ios-label">
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
    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-ios border border-dashed border-ios-separator bg-ios-elevated px-4 py-10 text-center transition hover:border-ios-blue hover:bg-ios-blue/10 sm:px-6 sm:py-12">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ios-blue/15 text-ios-blue">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
          <path
            d="M12 16V4m0 0 4 4m-4-4-4 4M5 20h14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm font-medium text-ios-label">
        {loading
          ? "Procesando…"
          : `Arrastra o elige tu Excel (.xlsx) — modo: ${importModeLabel}`}
      </span>
      <span className="max-w-sm text-xs text-ios-muted">
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
