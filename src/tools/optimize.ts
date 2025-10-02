/**
 * Ads.txt optimization tools
 */

import { z } from 'zod';
import { apiClient } from '../api/client.js';
import type { OptimizationResult, McpToolInput } from '../types/index.js';

// Input schema
const OptimizationInputSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  publisher_domain: z.string().optional(),
  level: z.enum(['level1', 'level2']).optional().default('level1'),
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
