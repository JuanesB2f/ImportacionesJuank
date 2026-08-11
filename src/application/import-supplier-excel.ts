import * as XLSX from "xlsx";
import type {
  CatalogProduct,
  CatalogVariant,
  ImportIssue,
  ImportPreview,
  SupplierRow,
} from "@/domain/catalog";
import {
  HEADER_ALIASES,
  buildSku,
  normalizeHeader,
  toHandle,
} from "@/domain/naming";

type ColumnMap = Partial<Record<keyof typeof HEADER_ALIASES, number>>;

function detectColumns(headers: string[]): ColumnMap {
  const normalized = headers.map(normalizeHeader);
  const map: ColumnMap = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) {
      map[field as keyof typeof HEADER_ALIASES] = idx;
    }
  }

  return map;
}

function cellString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseSupplierExcel(buffer: ArrayBuffer): ImportPreview {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const issues: ImportIssue[] = [];

  if (matrix.length < 2) {
    return {
      products: [],
      issues: [{ row: 0, level: "error", message: "El Excel está vacío o sin datos." }],
      stats: { rows: 0, products: 0, variants: 0 },
    };
  }

  const headers = (matrix[0] ?? []).map((h) => cellString(h));
  const columns = detectColumns(headers);

  if (columns.reference == null || columns.color == null || columns.size == null) {
    issues.push({
      row: 1,
      level: "error",
      message:
        "No se detectaron columnas obligatorias. Se esperan: REFERENCIA, COLOR, TALLA (y CANTIDAD/CANTIDA).",
    });
    return { products: [], issues, stats: { rows: 0, products: 0, variants: 0 } };
  }

  if (columns.quantity == null) {
    issues.push({
      row: 1,
      level: "warning",
      message: "No se encontró CANTIDAD/CANTIDA. Se usará stock 0.",
    });
  }

  const rows: SupplierRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const excelRow = i + 1;
    const line = matrix[i] ?? [];
    const reference = cellString(line[columns.reference]);
    const color = cellString(line[columns.color!]);
    const size = cellString(line[columns.size!]);
    const quantity =
      columns.quantity != null ? cellNumber(line[columns.quantity]) : 0;

    if (!reference && !color && !size) continue;

    if (!reference) {
      issues.push({ row: excelRow, level: "error", message: "Falta REFERENCIA." });
      continue;
    }
    if (!color) {
      issues.push({ row: excelRow, level: "error", message: `Falta COLOR en ${reference}.` });
      continue;
    }
    if (!size) {
      issues.push({ row: excelRow, level: "error", message: `Falta TALLA en ${reference}.` });
      continue;
    }
    if (quantity < 0) {
      issues.push({
        row: excelRow,
        level: "error",
        message: `Stock negativo en ${reference} ${color}/${size}.`,
      });
      continue;
    }

    rows.push({
      reference: reference.toUpperCase(),
      color: color.toUpperCase(),
      size: size.toUpperCase(),
      quantity,
      priceRetail:
        columns.priceRetail != null ? cellNumber(line[columns.priceRetail]) : 0,
      priceEntrepreneur:
        columns.priceEntrepreneur != null
          ? cellNumber(line[columns.priceEntrepreneur])
          : 0,
      priceWholesale:
        columns.priceWholesale != null
          ? cellNumber(line[columns.priceWholesale])
          : 0,
      priceDistributor:
        columns.priceDistributor != null
          ? cellNumber(line[columns.priceDistributor])
          : 0,
      description:
        columns.description != null
          ? cellString(line[columns.description])
          : undefined,
    });
  }

  const products = groupIntoProducts(rows, issues);

  return {
    products,
    issues,
    stats: {
      rows: rows.length,
      products: products.length,
      variants: products.reduce((acc, p) => acc + p.variants.length, 0),
    },
  };
}

function groupIntoProducts(
  rows: SupplierRow[],
  issues: ImportIssue[]
): CatalogProduct[] {
  // Una ficha Shopify por REFERENCIA (CRG001), variantes = Color + Talla
  const byRef = new Map<string, SupplierRow[]>();

  for (const row of rows) {
    const list = byRef.get(row.reference) ?? [];
    list.push(row);
    byRef.set(row.reference, list);
  }

  const products: CatalogProduct[] = [];
  const usedSkus = new Set<string>();

  for (const [reference, group] of byRef) {
    const variantMap = new Map<string, CatalogVariant>();
    const title =
      group.find((r) => r.description)?.description?.trim() || reference;

    for (const row of group) {
      const key = `${row.color}||${row.size}`;
      const sku = buildSku(row.reference, row.color, row.size);

      if (usedSkus.has(sku) || variantMap.has(key)) {
        issues.push({
          row: 0,
          level: "warning",
          message: `Variante duplicada fusionada: ${sku}. Se suma el stock.`,
        });
        const existing = variantMap.get(key);
        if (existing) {
          existing.inventoryQty += row.quantity;
        }
        continue;
      }

      usedSkus.add(sku);
      variantMap.set(key, {
        sku,
        option1Value: row.color,
        option2Value: row.size,
        inventoryQty: row.quantity,
        priceRetail: row.priceRetail ?? 0,
        priceEntrepreneur: row.priceEntrepreneur ?? 0,
        priceWholesale: row.priceWholesale ?? 0,
        priceDistributor: row.priceDistributor ?? 0,
      });
    }

    products.push({
      reference,
      handle: toHandle(reference),
      title,
      bodyHtml: "",
      vendor: "ImportacionesJuank",
      option1Name: "Color",
      option2Name: "Talla",
      status: "draft",
      variants: Array.from(variantMap.values()).sort((a, b) =>
        a.sku.localeCompare(b.sku)
      ),
    });
  }

  return products.sort((a, b) => a.reference.localeCompare(b.reference));
}
