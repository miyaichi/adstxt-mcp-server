/**
 * Domain information tools
 */

import { z } from 'zod';
import { apiClient } from '../api/client.js';
import type {
  AdsTxtCacheResult,
  DomainInfo,
  BatchDomainInfoResult,
  McpToolInput,
} from '../types/index.js';

// Input schemas
const AdsTxtCacheInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  force: z.boolean().optional().default(false),
});

const DomainInfoInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
});

const BatchDomainInfoInputSchema = z.object({
  domains: z.array(z.string()).min(1).max(50, 'Maximum 50 domains allowed'),
});

/**
 * Get cached ads.txt for a domain
 */
export async function getAdsTxtCache(input: McpToolInput) {
  const parsed = AdsTxtCacheInputSchema.parse(input);

  const queryString = parsed.force ? '?force=true' : '';
  const response = await apiClient.get<AdsTxtCacheResult>(
    `/api/adsTxtCache/domain/${parsed.domain}${queryString}`
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch ads.txt cache');
  }

  return response.data;
}

/**
 * Get comprehensive domain information (ads.txt + sellers.json)
 * Reduces API calls by 60-70%
 */
export async function getDomainInfo(input: McpToolInput) {
  const parsed = DomainInfoInputSchema.parse(input);

  const response = await apiClient.get<DomainInfo>(`/api/v1/domains/${parsed.domain}/info`);

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch domain info');
  }

  return response.data;
}

/**
 * Get information for multiple domains (up to 50)
 * Reduces API calls by 90%+
 */
export async function getBatchDomainInfo(input: McpToolInput) {
  const parsed = BatchDomainInfoInputSchema.parse(input);

  const response = await apiClient.post<BatchDomainInfoResult>('/api/v1/domains/batch/info', {
    domains: parsed.domains,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch batch domain info');
  }

  return response.data;
}
