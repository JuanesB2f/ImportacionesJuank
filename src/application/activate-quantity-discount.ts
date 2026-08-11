import { shopifyGraphql } from "@/infrastructure/shopify/client";

const FUNCTION_HANDLE = "quantity-price-tiers";

const CREATE_DISCOUNT = `
  mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount {
        discountId
        title
        status
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const LIST_DISCOUNTS = `
  query automaticAppDiscounts {
    discountNodes(first: 50, query: "type:app") {
      nodes {
        id
        discount {
          ... on DiscountAutomaticApp {
            title
            status
            appDiscountType {
              functionId
              title
            }
          }
        }
      }
    }
  }
`;

type CreateData = {
  discountAutomaticAppCreate: {
    automaticAppDiscount: {
      discountId: string;
      title: string;
      status: string;
    } | null;
    userErrors: Array<{ field: string[] | null; message: string; code?: string }>;
  };
};

/**
 * Activa el descuento automático que ejecuta la Function de precios por cantidad.
 * Requiere haber hecho deploy de la extensión `quantity-price-tiers` y scope write_discounts.
 */
export async function activateQuantityPriceDiscount(): Promise<{
  ok: boolean;
  discountId?: string;
  message: string;
}> {
  const startsAt = new Date().toISOString();

  try {
    const data = await shopifyGraphql<CreateData>(CREATE_DISCOUNT, {
      automaticAppDiscount: {
        title: "Precios por cantidad ImportacionesJuank",
        functionHandle: FUNCTION_HANDLE,
        discountClasses: ["PRODUCT"],
        startsAt,
        combinesWith: {
          orderDiscounts: true,
          productDiscounts: true,
          shippingDiscounts: true,
        },
      },
    });

    const errors = data.discountAutomaticAppCreate.userErrors;
    if (errors.length) {
      const msg = errors.map((e) => e.message).join("; ");
      // Si ya existe, lo tratamos como ok
      if (/already|taken|exists|duplicate/i.test(msg)) {
        return {
          ok: true,
          message: `El descuento ya estaba activo: ${msg}`,
        };
      }
      return { ok: false, message: msg };
    }

    const created = data.discountAutomaticAppCreate.automaticAppDiscount;
    return {
      ok: true,
      discountId: created?.discountId,
      message: `Descuento activado (${created?.status ?? "ACTIVE"})`,
    };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : "No se pudo crear el descuento automático",
    };
  }
}

export { FUNCTION_HANDLE, LIST_DISCOUNTS };
