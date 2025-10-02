/**
 * Ads.txt optimization tools
 */

import { z } from 'zod';
import { apiClient } from '../api/client.js';
import type { OptimizationResult, AdsTxtCacheResult, McpToolInput } from '../types/index.js';

// Input schemas
const OptimizationInputSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  publisher_domain: z.string().optional(),
  level: z.enum(['level1', 'level2']).optional().default('level1'),
});

const OptimizationByDomainInputSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  level: z.enum(['level1', 'level2']).optional().default('level1'),
  force: z.boolean().optional().default(false),
});

/**
 * Optimize ads.txt content
 * - Level 1: Remove duplicates, standardize format, group by domain
 * - Level 2: Level 1 + sellers.json integration, categorization
 */
export async function optimizeAdsTxt(input: McpToolInput) {
  const parsed = OptimizationInputSchema.parse(input);

  const response = await apiClient.post<OptimizationResult>('/api/adsTxt/optimize', {
    content: parsed.content,
    publisher_domain: parsed.publisher_domain,
    level: parsed.level,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Optimization failed');
  }

  return response.data;
}

/**
 * Optimize ads.txt by domain (fetches from cache automatically)
 * More efficient than fetching content separately and then optimizing
 */
export async function optimizeAdsTxtByDomain(input: McpToolInput) {
  const parsed = OptimizationByDomainInputSchema.parse(input);

  // First, get cached ads.txt
  const queryString = parsed.force ? '?force=true' : '';
  const cacheResponse = await apiClient.get<AdsTxtCacheResult>(
    `/api/adsTxtCache/domain/${parsed.domain}${queryString}`
  );

  if (!cacheResponse.success) {
    throw new Error(cacheResponse.error?.message || 'Failed to fetch ads.txt cache');
  }

  if (!cacheResponse.data || cacheResponse.data.status !== 'success') {
    throw new Error(`No ads.txt found for domain: ${parsed.domain}`);
  }

  // Then optimize it
  const optimizeResponse = await apiClient.post<OptimizationResult>('/api/adsTxt/optimize', {
    content: cacheResponse.data.content,
    publisher_domain: parsed.domain,
    level: parsed.level,
  });

  if (!optimizeResponse.success) {
    throw new Error(optimizeResponse.error?.message || 'Optimization failed');
  }

  return {
    ...optimizeResponse.data,
    domain: parsed.domain,
    fetched_at: cacheResponse.data.fetched_at,
  };
}
