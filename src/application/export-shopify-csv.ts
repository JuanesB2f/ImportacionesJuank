import type { CatalogProduct } from "@/domain/catalog";

/**
 * Columnas oficiales del CSV de productos Shopify.
 * @see https://help.shopify.com/en/manual/products/import-export/using-csv
 */
export const SHOPIFY_CSV_HEADERS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "Variant SKU",
  "Variant Grams",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Variant Barcode",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "Gift Card",
  "SEO Title",
  "SEO Description",
  "Variant Image",
  "Variant Weight Unit",
  "Variant Tax Code",
  "Cost per item",
  "Status",
] as const;

type ShopifyCsvRow = Record<(typeof SHOPIFY_CSV_HEADERS)[number], string>;

function emptyRow(): ShopifyCsvRow {
  return Object.fromEntries(SHOPIFY_CSV_HEADERS.map((h) => [h, ""])) as ShopifyCsvRow;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Reglas Shopify que evitamos romper:
 * - Mismo Handle = mismo producto
 * - Title / Body / Vendor solo en la primera fila del producto
 * - Option1 = Color, Option2 = Talla
 * - Una fila por variante
 * - Solo Precio Detal → Variant Price
 */
export function buildShopifyCsv(products: CatalogProduct[]): string {
  const rows: ShopifyCsvRow[] = [];

  for (const product of products) {
    product.variants.forEach((variant, index) => {
      const row = emptyRow();
      const isFirst = index === 0;

      row.Handle = product.handle;

      if (isFirst) {
        row.Title = product.title;
        row["Body (HTML)"] = product.bodyHtml;
        row.Vendor = product.vendor;
        row.Published = "false";
        row["Option1 Name"] = product.option1Name;
        row["Option2 Name"] = product.option2Name;
        row.Status = product.status === "active" ? "active" : "draft";
        row["SEO Title"] = product.title;
        row["SEO Description"] = "";
      }

      row["Option1 Value"] = variant.option1Value;
      row["Option2 Value"] = variant.option2Value;
      row["Variant SKU"] = variant.sku;
      row["Variant Grams"] = "0";
      row["Variant Inventory Tracker"] = "shopify";
      row["Variant Inventory Qty"] = String(variant.inventoryQty);
      row["Variant Inventory Policy"] = "deny";
      row["Variant Fulfillment Service"] = "manual";
      row["Variant Price"] = variant.priceRetail.toFixed(2);
      row["Variant Requires Shipping"] = "true";
      row["Variant Taxable"] = "true";
      row["Gift Card"] = "false";
      row["Variant Weight Unit"] = "g";
      row["Cost per item"] =
        variant.priceDistributor > 0
          ? variant.priceDistributor.toFixed(2)
          : "";

      rows.push(row);
    });
  }

  const headerLine = SHOPIFY_CSV_HEADERS.join(",");
  const body = rows
    .map((row) => SHOPIFY_CSV_HEADERS.map((h) => escapeCsv(row[h])).join(","))
    .join("\n");

  return `${headerLine}\n${body}\n`;
}
