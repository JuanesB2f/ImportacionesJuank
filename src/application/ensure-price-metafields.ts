import { shopifyGraphql } from "@/infrastructure/shopify/client";
import { PRICE_METAFIELD_NAMESPACE } from "@/domain/pricing";

const ENSURE_DEFINITION = `
  mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id name }
      userErrors { field message code }
    }
  }
`;

type EnsureResult = {
  metafieldDefinitionCreate: {
    createdDefinition: { id: string; name: string } | null;
    userErrors: Array<{ field: string[] | null; message: string; code?: string }>;
  };
};

const TIER_DEFINITIONS = [
  {
    key: "precio_emprendedor",
    name: "Precio Emprendedor",
    description: "Precio unitario 6–11 prendas",
  },
  {
    key: "precio_mayorista",
    name: "Precio Mayorista",
    description: "Precio unitario 12–59 prendas",
  },
  {
    key: "precio_distribuidor",
    name: "Precio Distribuidor",
    description: "Precio unitario 60+ prendas",
  },
] as const;

let ensured = false;

/**
 * Crea (idempotente) las definiciones de metafields de precios por variante.
 * Necesarias para que la Discount Function las lea en checkout.
 */
export async function ensurePriceMetafieldDefinitions(): Promise<{
  ok: boolean;
  messages: string[];
}> {
  if (ensured) return { ok: true, messages: ["Ya estaban listas"] };

  const messages: string[] = [];

  for (const def of TIER_DEFINITIONS) {
    try {
      const data = await shopifyGraphql<EnsureResult>(ENSURE_DEFINITION, {
        definition: {
          name: def.name,
          namespace: PRICE_METAFIELD_NAMESPACE,
          key: def.key,
          description: def.description,
          type: "number_decimal",
          ownerType: "PRODUCTVARIANT",
          pin: true,
        },
      });

      const errors = data.metafieldDefinitionCreate.userErrors;
      const taken = errors.some(
        (e) =>
          e.code === "TAKEN" ||
          /already|taken|exists/i.test(e.message)
      );
      if (errors.length && !taken) {
        messages.push(`${def.key}: ${errors.map((e) => e.message).join("; ")}`);
      } else if (taken) {
        messages.push(`${def.key}: ya existía`);
      } else {
        messages.push(`${def.key}: creada`);
      }
    } catch (e) {
      messages.push(
        `${def.key}: ${e instanceof Error ? e.message : "error"}`
      );
    }
  }

  ensured = true;
  return { ok: messages.every((m) => !m.includes("error")), messages };
}
