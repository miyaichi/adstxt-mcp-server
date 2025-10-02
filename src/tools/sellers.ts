/**
 * Sellers.json tools
 */

import { z } from 'zod';
import { apiClient } from '../api/client.js';
import type {
  SellersJsonResult,
  SellersJsonMetadata,
  BatchSearchResult,
  SellerSearchResult,
  McpToolInput,
} from '../types/index.js';

// Input schemas
const SellersJsonInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

const SellersJsonMetadataInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

const BatchSearchInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  seller_ids: z.array(z.string()).min(1).max(100, 'Maximum 100 seller IDs allowed'),
});

const SellerSearchInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  seller_id: z.string().min(1, 'Seller ID is required'),
});

/**
 * Get full sellers.json data for a domain
 */
export async function getSellersJson(input: McpToolInput) {
  const parsed = SellersJsonInputSchema.parse(input);

  const response = await apiClient.get<SellersJsonResult>(`/api/sellersJson/${parsed.domain}`);

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch sellers.json');
  }

  return response.data;
}

/**
 * Get sellers.json metadata only (no seller list)
 * Fast check for availability and basic info
 */
export async function getSellersJsonMetadata(input: McpToolInput) {
  const parsed = SellersJsonMetadataInputSchema.parse(input);

  const response = await apiClient.get<SellersJsonMetadata>(
    `/api/sellersJson/${parsed.domain}/metadata`
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch sellers.json metadata');
  }

  return response.data;
}

/**
 * High-performance batch search for multiple seller IDs
 * Up to 100 IDs per request
 */
export async function searchSellersBatch(input: McpToolInput) {
  const parsed = BatchSearchInputSchema.parse(input);

  const response = await apiClient.post<BatchSearchResult>(
    `/api/v1/sellersjson/${parsed.domain}/sellers/batch`,
    {
      seller_ids: parsed.seller_ids,
    }
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Batch search failed');
  }

  return response.data;
}

/**
 * Search for a specific seller ID
 */
export async function getSellerById(input: McpToolInput) {
  const parsed = SellerSearchInputSchema.parse(input);

  const response = await apiClient.get<SellerSearchResult>(
    `/api/sellersJson/${parsed.domain}/seller/${parsed.seller_id}`
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Seller search failed');
  }

  return response.data;
}
