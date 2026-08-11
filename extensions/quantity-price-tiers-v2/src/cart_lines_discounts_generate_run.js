import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {number} qty
 */
function pickTier(qty) {
  if (qty >= 60) return "distribuidor";
  if (qty >= 12) return "mayorista";
  if (qty >= 6) return "emprendedor";
  return "detal";
}

/**
 * @param {string | null | undefined} raw
 */
function parsePrice(raw) {
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Precios ImportacionesJuank por cantidad de prendas en el carrito.
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product
  );

  if (!hasProductDiscountClass || !input.cart.lines.length) {
    return { operations: [] };
  }

  let totalQty = 0;
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename === "ProductVariant") {
      totalQty += line.quantity;
    }
  }

  const tier = pickTier(totalQty);
  if (tier === "detal") {
    return { operations: [] };
  }

  const labels = {
    emprendedor: "Precio Emprendedor (6-11)",
    mayorista: "Precio Mayorista (12-59)",
    distribuidor: "Precio Distribuidor (60+)",
  };

  const candidates = [];

  for (const line of input.cart.lines) {
    const merch = line.merchandise;
    if (merch.__typename !== "ProductVariant") continue;

    const base = Number(line.cost.amountPerQuantity.amount);
    if (!Number.isFinite(base) || base <= 0) continue;

    let target = 0;
    if (tier === "emprendedor") {
      target = parsePrice(merch.precioEmprendedor?.value);
    } else if (tier === "mayorista") {
      target = parsePrice(merch.precioMayorista?.value);
    } else {
      target = parsePrice(merch.precioDistribuidor?.value);
    }

    if (target <= 0 || target >= base) continue;

    const discountPerItem = Number((base - target).toFixed(2));
    if (discountPerItem <= 0) continue;

    candidates.push({
      message: labels[tier],
      targets: [{ cartLine: { id: line.id } }],
      value: {
        fixedAmount: {
          amount: discountPerItem.toFixed(2),
          appliesToEachItem: true,
        },
      },
    });
  }

  if (candidates.length === 0) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: ProductDiscountSelectionStrategy.First,
          candidates,
        },
      },
    ],
  };
}
