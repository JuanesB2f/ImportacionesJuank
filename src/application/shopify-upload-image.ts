import { shopifyGraphql } from "@/infrastructure/shopify/client";

const STAGED_UPLOADS_MUTATION = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

type StagedUploadsData = {
  stagedUploadsCreate: {
    stagedTargets: Array<{
      url: string;
      resourceUrl: string;
      parameters: Array<{ name: string; value: string }>;
    }>;
    userErrors: Array<{ message: string }>;
  };
};

/**
 * Sube una imagen a Shopify Files y devuelve la URL pública (resourceUrl)
 * para usarla en el producto.
 */
export async function uploadImageToShopify(params: {
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
}): Promise<string> {
  const data = await shopifyGraphql<StagedUploadsData>(STAGED_UPLOADS_MUTATION, {
    input: [
      {
        filename: params.filename,
        mimeType: params.mimeType,
        httpMethod: "POST",
        resource: "FILE",
        fileSize: String(params.bytes.byteLength),
      },
    ],
  });

  if (data.stagedUploadsCreate.userErrors.length > 0) {
    throw new Error(
      data.stagedUploadsCreate.userErrors.map((e) => e.message).join("; ")
    );
  }

  const target = data.stagedUploadsCreate.stagedTargets[0];
  if (!target) {
    throw new Error("Shopify no devolvió destino de subida");
  }

  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append(
    "file",
    new Blob([params.bytes], { type: params.mimeType }),
    params.filename
  );

  const uploadRes = await fetch(target.url, {
    method: "POST",
    body: form,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Error subiendo imagen a Shopify (${uploadRes.status}): ${text.slice(0, 200)}`);
  }

  return target.resourceUrl;
}
