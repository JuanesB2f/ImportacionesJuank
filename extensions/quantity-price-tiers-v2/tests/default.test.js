import { describe, it, expect } from "vitest";
import { cartLinesDiscountsGenerateRun } from "../src/cart_lines_discounts_generate_run";
import { DiscountClass, ProductDiscountSelectionStrategy } from "../generated/api";

describe("quantity price tiers", () => {
  it("no discount under 6 units", () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 2,
            cost: { amountPerQuantity: { amount: "100.0" } },
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
              precioEmprendedor: { value: "80.0" },
              precioMayorista: { value: "70.0" },
              precioDistribuidor: { value: "60.0" },
            },
          },
        ],
      },
      discount: { discountClasses: [DiscountClass.Product] },
    });
    expect(result.operations).toEqual([]);
  });

  it("applies emprendedor discount at 6+ units", () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 6,
            cost: { amountPerQuantity: { amount: "100.0" } },
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
              precioEmprendedor: { value: "80.0" },
              precioMayorista: { value: "70.0" },
              precioDistribuidor: { value: "60.0" },
            },
          },
        ],
      },
      discount: { discountClasses: [DiscountClass.Product] },
    });

    expect(result.operations).toHaveLength(1);
    const op = result.operations[0].productDiscountsAdd;
    expect(op.selectionStrategy).toBe(ProductDiscountSelectionStrategy.First);
    expect(op.candidates[0].value.fixedAmount.amount).toBe("20.00");
    expect(op.candidates[0].value.fixedAmount.appliesToEachItem).toBe(true);
  });
});
