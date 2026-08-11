import { shopifyGraphql } from "@/infrastructure/shopify/client";

const PUBLICATIONS_QUERY = `
  query publicationsList {
    publications(first: 20) {
      nodes {
        id
        supportsFuturePublishing
        catalog {
          title
        }
      }
    }
  }
`;

const PUBLISH_MUTATION = `
  mutation publishProduct($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

type PublicationsData = {
  publications: {
    nodes: Array<{
      id: string;
      supportsFuturePublishing: boolean;
      catalog: { title: string } | null;
    }>;
  };
};

let cachedPublicationIds: string[] | null | undefined;

/**
 * Publica el producto en los canales de venta (Online Store, etc.)
 * para que se vea en la tienda y colecciones del menú.
 */
export async function publishProductToOnlineStore(
  productId: string
): Promise<void> {
  const publicationIds = await getPublicationIds();
  if (publicationIds.length === 0) {
    throw new Error(
      "No se encontraron canales de publicación. Revisa scopes read_publications / write_publications."
    );
  }

  const data = await shopifyGraphql<{
    publishablePublish: {
      userErrors: Array<{ message: string }>;
    };
  }>(PUBLISH_MUTATION, {
    id: productId,
    input: publicationIds.map((publicationId) => ({ publicationId })),
  });

  if (data.publishablePublish.userErrors.length > 0) {
    throw new Error(
      data.publishablePublish.userErrors.map((e) => e.message).join("; ")
    );
  }
}

async function getPublicationIds(): Promise<string[]> {
  if (cachedPublicationIds !== undefined) {
    return cachedPublicationIds ?? [];
  }

  try {
    const data = await shopifyGraphql<PublicationsData>(PUBLICATIONS_QUERY);
    const nodes = data.publications.nodes;

    // Preferir Online Store (soporta publicación futura)
    const online = nodes.filter((p) =>
      /online store|tienda online/i.test(p.catalog?.title ?? "")
    );
    const withFuture = nodes.filter((p) => p.supportsFuturePublishing);

    const chosen =
      online.length > 0
        ? online
        : withFuture.length > 0
          ? withFuture
          : nodes;

    cachedPublicationIds = chosen.map((p) => p.id);
    return cachedPublicationIds;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/read_publications|ACCESS_DENIED|Access denied/i.test(message)) {
      throw new Error(
        "Faltan permisos de publicación. Agrega read_publications y write_publications, publica la versión y reinstala la app."
      );
    }
    throw e;
  }
}
