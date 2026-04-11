import type { DataSource, Normalizer } from "../types";
import { ShopifyNormalizer } from "./shopify";
import { ApiNormalizer } from "./api";

const normalizers: Partial<Record<DataSource, Normalizer>> = {
  shopify: new ShopifyNormalizer(),
  api: new ApiNormalizer(),
};

export function getNormalizer(source: DataSource): Normalizer | undefined {
  return normalizers[source];
}
