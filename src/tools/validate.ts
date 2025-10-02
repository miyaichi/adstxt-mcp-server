/**
 * Ads.txt validation tools
 */

import { z } from 'zod';
import { apiClient } from '../api/client.js';
import type {
  QuickValidationResult,
  FullValidationResult,
  McpToolInput,
} from '../types/index.js';

// Input schemas
const QuickValidationInputSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  checkDuplicates: z.boolean().optional().default(true),
});

const FullValidationInputSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  publisherDomain: z.string().optional(),
});

/**
 * Quick validation (10-20x faster) - syntax only
 */
export async function validateAdsTxtQuick(input: McpToolInput) {
  const parsed = QuickValidationInputSchema.parse(input);

  const response = await apiClient.post<QuickValidationResult>(
    '/api/v1/adstxt/validate/quick',
    {
      content: parsed.content,
      checkDuplicates: parsed.checkDuplicates,
    }
  );

  if (!response.success) {
    throw new Error(response.error?.message || 'Validation failed');
  }

  return response.data;
}

/**
 * Full validation with sellers.json cross-checking
 */
export async function validateAdsTxt(input: McpToolInput) {
  const parsed = FullValidationInputSchema.parse(input);

  const response = await apiClient.post<FullValidationResult>('/api/adsTxt/process', {
    content: parsed.content,
    publisher_domain: parsed.publisherDomain,
  });

  if (!response.success) {
    throw new Error(response.error?.message || 'Validation failed');
  }

  return response.data;
}
