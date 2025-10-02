/**
 * Error help tool
 */

import { z } from 'zod';
import { apiClient } from '../api/client.js';
import type { ErrorHelpResult, McpToolInput } from '../types/index.js';

// Input schema
const ErrorHelpInputSchema = z.object({
  errorCode: z.string().optional(),
  language: z.enum(['en', 'ja']).optional().default('en'),
});

/**
 * Get detailed help information for ads.txt validation errors
 */
export async function getErrorHelp(input: McpToolInput): Promise<ErrorHelpResult> {
  const parsed = ErrorHelpInputSchema.parse(input);

  try {
    // Fetch the warnings.md file
    const content = await apiClient.getRaw(`/help/${parsed.language}/warnings.md`);

    // If specific error code is requested, extract that section
    if (parsed.errorCode) {
      const result = extractErrorSection(content, parsed.errorCode);
      if (result) {
        return {
          content: result,
          url: `https://adstxt-manager.jp/help/${parsed.language}/warnings.md#${getAnchorId(parsed.errorCode)}`,
        };
      }
    }

    // Return full content if no specific error code or section not found
    return {
      content,
    };
  } catch (error) {
    throw new Error(`Failed to fetch error help: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract a specific error section from the markdown content
 */
function extractErrorSection(content: string, errorCode: string): string | null {
  const lines = content.split('\n');
  const codePattern = new RegExp(`\\(Code: ${errorCode}\\)`, 'i');

  let startIdx = -1;
  let endIdx = -1;

  // Find the section with the error code
  for (let i = 0; i < lines.length; i++) {
    if (codePattern.test(lines[i])) {
      // Find the header (backtrack to previous ###)
      for (let j = i; j >= 0; j--) {
        if (lines[j].startsWith('###')) {
          startIdx = j;
          break;
        }
      }

      // Find the end (next ### or end of file)
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('###')) {
          endIdx = j;
          break;
        }
      }

      if (endIdx === -1) {
        endIdx = lines.length;
      }

      break;
    }
  }

  if (startIdx !== -1) {
    return lines.slice(startIdx, endIdx).join('\n').trim();
  }

  return null;
}

/**
 * Get anchor ID for a given error code
 */
function getAnchorId(errorCode: string): string {
  // Map common error codes to their anchor IDs
  const anchorMap: Record<string, string> = {
    '10010': 'file-not-found',
    '10020': 'invalid-content-type',
    '10030': 'timeout',
    '10040': 'too-many-redirects',
    '10050': 'too-many-redirects',
    '11010': 'missing-fields',
    '11020': 'invalid-relationship',
    '11030': 'invalid-domain',
    '11040': 'no-valid-entries',
    '11050': 'whitespace-in-fields',
    '12010': 'no-sellers-json',
    '12020': 'direct-account-id-not-in-sellers-json',
    '12030': 'domain-mismatch',
    '12040': 'direct-not-publisher',
    '12050': 'direct-not-publisher',
    '12060': 'seller-id-not-unique',
    '13010': 'no-sellers-json',
    '13020': 'reseller-account-id-not-in-sellers-json',
    '13030': 'domain-mismatch',
    '13040': 'reseller-not-intermediary',
    '13050': 'reseller-not-intermediary',
    '13060': 'seller-id-not-unique',
    '14020': 'invalid-subdomain-url',
    '14030': 'invalid-subdomain',
    '14040': 'invalid-subdomain-ads-txt',
    '14050': 'subdomain-not-listed',
    '14060': 'subdomain-contains-subdomains',
    '15020': 'invalid-inventory-partner-domain',
    '15030': 'inventory-partner-contains-partners',
    '16010': 'invalid-manager-domain',
    '16020': 'multiple-manager-domains-without-country',
    '16030': 'invalid-country-code',
    '16040': 'manager-without-sellers-json',
    '16050': 'manager-without-entry',
    '16060': 'manager-not-direct',
    '16070': 'manager-sellers-json-without-id',
    '16080': 'manager-sellers-json-domain-mismatch',
    '16090': 'manager-sellers-json-not-publisher',
    '17010': 'invalid-owner-domain',
    '17020': 'multiple-owner-domains',
    '17030': 'owner-domain-mismatch',
  };

  return anchorMap[errorCode] || 'invalid-format';
}
