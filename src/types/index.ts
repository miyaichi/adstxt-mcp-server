/**
 * Common types for MCP server
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ParsedAdsTxtRecord {
  domain: string;
  account_id: string;
  account_type: 'DIRECT' | 'RESELLER';
  certification_authority_id?: string;
  relationship: 'DIRECT' | 'RESELLER';
  line_number?: number;
  raw_line?: string;
  is_valid: boolean;
}

export interface ValidationError {
  line: number;
  message: string;
  code?: string;
  severity: 'error';
}

export interface ValidationWarning {
  line: number;
  message: string;
  severity: 'warning';
  original_line?: number;
}

export interface ValidationStatistics {
  totalLines: number;
  validRecords: number;
  invalidRecords: number;
  variables: number;
  comments: number;
  duplicates: number;
}

export interface QuickValidationResult {
  isValid: boolean;
  records: ParsedAdsTxtRecord[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: ValidationStatistics;
}

export interface FullValidationResult {
  records: ParsedAdsTxtRecord[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

export interface OptimizationResult {
  optimized_content: string;
  original_length: number;
  optimized_length: number;
  optimization_level: string;
  categories?: {
    other: number;
    confidential: number;
    missing_seller_id: number;
    no_seller_json: number;
  };
  execution_time_ms: number;
}

export interface AdsTxtCacheResult {
  domain: string;
  content: string;
  fetched_at: string;
  status: 'success' | 'not_found' | 'error';
}

export interface SellerRecord {
  seller_id: string;
  seller_type: 'PUBLISHER' | 'INTERMEDIARY' | 'BOTH';
  is_confidential: number;
  name?: string;
  domain?: string;
}

export interface SellersJsonResult {
  domain: string;
  sellers_json: SellerRecord[];
  contact_email?: string;
  contact_address?: string;
  version?: string;
  identifiers?: unknown[];
}

export interface SellersJsonMetadata {
  domain: string;
  seller_count: number;
  contact_email?: string;
  contact_address?: string;
  version?: string;
  identifiers?: unknown[];
  fetched_at: string;
}

export interface BatchSearchResult {
  found: SellerRecord[];
  not_found: string[];
  execution_time_ms: number;
}

export interface SellerSearchResult {
  found: boolean;
  seller?: SellerRecord;
}

export interface DomainInfo {
  domain: string;
  ads_txt: {
    exists: boolean;
    last_fetched?: string;
    status: string;
    record_count?: number;
  };
  sellers_json: {
    exists: boolean;
    last_fetched?: string;
    status: string;
    seller_count?: number;
  };
}

export interface BatchDomainInfoResult {
  domains: DomainInfo[];
  summary: {
    total_domains: number;
    with_ads_txt: number;
    with_sellers_json: number;
    with_both: number;
  };
}

export interface ErrorHelpResult {
  content: string;
  url?: string;
}

export interface McpToolInput {
  [key: string]: unknown;
}
