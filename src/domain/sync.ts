export type SyncProductResult = {
  reference: string;
  handle: string;
  ok: boolean;
  productId?: string;
  variantCount?: number;
  error?: string;
};

export type SyncSummary = {
  locationId: string;
  locationName: string;
  results: SyncProductResult[];
  okCount: number;
  errorCount: number;
};
