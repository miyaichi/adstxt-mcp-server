# Ads.txt Manager MCP Server - AGENT.md

## Overview

This MCP (Model Context Protocol) server provides AI agents with tools to validate, optimize, and analyze ads.txt and sellers.json files. It acts as a lightweight proxy to the Ads.txt Manager backend API, enabling AI-powered workflows for digital advertising transparency.

## Architecture

```
AI Agent (Claude/etc.)
    ↓
MCP Server (adstxt-manager-mcp-server)
    ↓
Backend API (adstxt-manager)
    ↓
PostgreSQL Database (Cache: ads.txt, sellers.json)
```

### Design Principles

- **API Proxy Pattern**: MCP server acts as a thin wrapper around existing backend APIs
- **Leverage Database Cache**: Utilizes PostgreSQL cache for ads.txt and sellers.json data
- **Reuse Business Logic**: Delegates complex validation and optimization to backend services
- **Stateless Operations**: No session management, token-based access where needed

## MCP Tools

### 1. validate_adstxt_quick

Fast syntax-only validation without database queries or sellers.json cross-checking.

**Input:**
```typescript
{
  content: string;              // ads.txt file content
  checkDuplicates?: boolean;    // Check for duplicates (default: true)
}
```

**Backend API:** `POST /api/v1/adstxt/validate/quick`

**Output:**
```typescript
{
  success: boolean;
  data: {
    isValid: boolean;
    records: ParsedAdsTxtRecord[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
    statistics: {
      totalLines: number;
      validRecords: number;
      invalidRecords: number;
      variables: number;
      comments: number;
      duplicates: number;
    }
  }
}
```

**Use Cases:**
- Real-time validation in editors
- Quick syntax checking before full validation
- Fast duplicate detection
- Performance: 10-20x faster than full validation

### 2. validate_adstxt

Full validation with detailed error reporting and sellers.json cross-checking.

**Input:**
```typescript
{
  content: string;              // ads.txt file content
  publisherDomain?: string;     // Optional: publisher domain for cross-checking
}
```

**Backend API:** `POST /api/adsTxt/process`

**Output:**
```typescript
{
  success: boolean;
  data: {
    records: ParsedAdsTxtRecord[];
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  }
}
```

**Use Cases:**
- Comprehensive ads.txt validation
- Check for duplicate entries
- Cross-reference with existing publisher ads.txt
- Verify account IDs against sellers.json

### 3. optimize_adstxt

Optimizes ads.txt content with two levels of optimization.

**Input:**
```typescript
{
  content: string;              // ads.txt file content
  publisher_domain?: string;    // Optional: publisher domain
  level?: 'level1' | 'level2';  // Optimization level (default: 'level1')
}
```

**Backend API:** `POST /api/adsTxt/optimize`

**Output:**
```typescript
{
  success: boolean;
  data: {
    optimized_content: string;
    original_length: number;
    optimized_length: number;
    optimization_level: string;
    categories?: {              // Only for level2
      other: number;
      confidential: number;
      missing_seller_id: number;
      no_seller_json: number;
    };
    execution_time_ms: number;
  }
}
```

**Optimization Levels:**
- **Level 1**: Remove duplicates, standardize format, group by domain
- **Level 2**: Level 1 + sellers.json integration, categorization by seller type

**Use Cases:**
- Clean up messy ads.txt files
- Categorize entries by confidentiality
- Identify missing sellers.json entries
- Add certification authority IDs

### 3b. optimize_adstxt_by_domain ⭐ Recommended

Optimizes ads.txt by domain (automatically fetches from cache). More efficient than fetching content separately.

**Input:**
```typescript
{
  domain: string;               // Publisher domain
  level?: 'level1' | 'level2';  // Optimization level (default: 'level1')
  force?: boolean;              // Force refresh from source (default: false)
}
```

**Backend APIs:**
1. `GET /api/adsTxtCache/domain/:domain` - Fetch cached ads.txt
2. `POST /api/adsTxt/optimize` - Optimize content

**Output:**
```typescript
{
  success: boolean;
  data: {
    optimized_content: string;
    original_length: number;
    optimized_length: number;
    domain: string;
    fetched_at: string;
    categories?: {              // Only for level2
      other: number;
      confidential: number;
      missing_seller_id: number;
      no_seller_json: number;
    };
    execution_time_ms: number;
  }
}
```

**Performance Benefits:**
- ~50% faster than separate fetch + optimize
- Reduced data transfer (no client-side content handling)
- Single tool call instead of two

**Use Cases:**
- Domain-based optimization workflows
- Automated optimization pipelines
- Batch processing multiple domains

### 4. optimize_adstxt_by_domain

(See 3b above)

### 5. get_adstxt_cache

Retrieves cached ads.txt content for a domain.

**Input:**
```typescript
{
  domain: string;               // Publisher domain
  force?: boolean;              // Force refresh from source (default: false)
}
```

**Backend API:** `GET /api/adsTxtCache/domain/:domain?force=true`

**Output:**
```typescript
{
  success: boolean;
  data: {
    domain: string;
    content: string;
    fetched_at: string;
    status: 'success' | 'not_found' | 'error';
  }
}
```

**Use Cases:**
- Check current ads.txt for a publisher
- Compare submitted entries with existing ads.txt
- Analyze publisher's current advertising relationships

### 6. get_sellers_json

Retrieves sellers.json data for an advertising system domain.

**Input:**
```typescript
{
  domain: string;               // Ad system domain (e.g., 'google.com')
}
```

**Backend API:** `GET /api/sellersJson/:domain`

**Output:**
```typescript
{
  success: boolean;
  data: {
    domain: string;
    sellers_json: {
      seller_id: string;
      seller_type: string;
      is_confidential: number;
      name?: string;
      domain?: string;
    }[];
    contact_email?: string;
    contact_address?: string;
    version?: string;
    identifiers?: any[];
  }
}
```

**Use Cases:**
- Verify account IDs against sellers.json
- Check seller types (PUBLISHER, INTERMEDIARY, BOTH)
- Identify confidential sellers

### 7. get_sellers_json_metadata

Retrieves only metadata from sellers.json (without full seller list).

**Input:**
```typescript
{
  domain: string;               // Ad system domain
}
```

**Backend API:** `GET /api/sellersJson/:domain/metadata`

**Output:**
```typescript
{
  success: boolean;
  data: {
    domain: string;
    seller_count: number;
    contact_email?: string;
    contact_address?: string;
    version?: string;
    identifiers?: any[];
    fetched_at: string;
  }
}
```

**Use Cases:**
- Quick check if sellers.json is available
- Get contact information for an ad system
- Verify TAG-ID or other identifiers

### 8. search_sellers_batch

High-performance batch search for multiple seller IDs in a single domain.

**Input:**
```typescript
{
  domain: string;               // Ad system domain
  seller_ids: string[];         // Array of seller IDs (max 100)
}
```

**Backend API:** `POST /api/v1/sellersjson/:domain/sellers/batch`

**Output:**
```typescript
{
  success: boolean;
  data: {
    found: SellerRecord[];
    not_found: string[];
    execution_time_ms: number;
  }
}
```

**Use Cases:**
- Validate multiple account IDs efficiently
- Bulk verification for ads.txt optimization
- Performance-optimized seller lookups

### 9. get_seller_by_id

Search for a specific seller ID in an ad system's sellers.json.

**Input:**
```typescript
{
  domain: string;               // Ad system domain
  seller_id: string;            // Seller ID to search
}
```

**Backend API:** `GET /api/sellersJson/:domain/seller/:sellerId`

**Output:**
```typescript
{
  success: boolean;
  data: {
    found: boolean;
    seller?: SellerRecord;
  }
}
```

**Use Cases:**
- Verify single account ID
- Get seller details and type
- Check confidentiality status

### 10. get_domain_info

Get comprehensive domain information in a single API call.

**Input:**
```typescript
{
  domain: string;               // Domain to query
}
```

**Backend API:** `GET /api/v1/domains/:domain/info`

**Output:**
```typescript
{
  success: boolean;
  data: {
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
}
```

**Use Cases:**
- Get both ads.txt and sellers.json status in one call
- Reduces API calls by 60-70%
- Quick domain overview

### 11. get_batch_domain_info

Get information for multiple domains in a single request.

**Input:**
```typescript
{
  domains: string[];            // Array of domains (max 50)
}
```

**Backend API:** `POST /api/v1/domains/batch/info`

**Output:**
```typescript
{
  success: boolean;
  data: {
    domains: DomainInfo[];
    summary: {
      total_domains: number;
      with_ads_txt: number;
      with_sellers_json: number;
      with_both: number;
    };
  }
}
```

**Use Cases:**
- Bulk domain analysis
- Reduces API calls by 90%+
- Generate summary statistics

### 12. get_error_help

Get detailed help information for ads.txt validation errors.

**Input:**
```typescript
{
  errorCode?: string;           // Optional: specific error code
  language?: 'en' | 'ja';       // Language (default: 'en')
}
```

**Backend API:** `GET /help/{language}/warnings.md`

**Output:**
```typescript
{
  success: boolean;
  data: {
    content: string;            // Markdown help content
    url?: string;               // Link to specific error section
  }
}
```

**Use Cases:**
- Provide context-aware error explanations
- Support multiple languages
- Link to detailed documentation
- Improve user understanding of validation issues

## Backend API Reference

### Core v1 Endpoints (Implemented)

#### Validation APIs
- `POST /api/v1/adstxt/validate/quick` - Quick validation (10-20x faster)

#### Domain APIs
- `GET /api/v1/domains/:domain/info` - Domain info (60-70% fewer calls)
- `POST /api/v1/domains/batch/info` - Batch domain info (90%+ fewer calls)

#### Sellers.json APIs
- `POST /api/v1/sellersjson/:domain/sellers/batch` - Batch seller search
- `POST /api/v1/sellersjson/batch/parallel` - Parallel batch search
- `POST /api/v1/sellersjson/:domain/sellers/batch/stream` - Streaming search

#### Performance Monitoring APIs
- `GET /api/v1/sellersjson/health` - System health check
- `GET /api/v1/sellersjson/stats` - Performance statistics

### Legacy Endpoints

#### Ads.txt APIs
- `POST /api/adsTxt/process` - Full validation with sellers.json
- `POST /api/adsTxt/optimize` - Optimize ads.txt content
- `GET /api/adsTxtCache/domain/:domain` - Get cached ads.txt

#### Sellers.json APIs
- `GET /api/sellersJson/:domain` - Get full sellers.json
- `GET /api/sellersJson/:domain/metadata` - Get metadata only
- `GET /api/sellersJson/:domain/seller/:sellerId` - Search single seller

### Help Resources
- `GET /help/en/warnings.md` - Error help (English)
- `GET /help/ja/warnings.md` - Error help (Japanese)

### Future Endpoint Recommendations

#### 1. Batch Validation API
**Endpoint:** `POST /api/v1/adstxt/validate/batch`

**Purpose:** Validate ads.txt entries against multiple domains at once

**Benefits:**
- Efficient bulk validation
- Useful for validating entire ads.txt files
- Reduces round-trip API calls

#### 2. Ads.txt Diff API
**Endpoint:** `POST /api/v1/adstxt/diff`

**Purpose:** Compare two ads.txt contents and show differences

**Benefits:**
- Help users understand changes
- Useful for approval workflows
- Supports audit trails

#### 3. Cross-Domain Seller Search API
**Endpoint:** `POST /api/v1/sellersjson/search`

**Purpose:** Search for sellers across multiple domains

**Benefits:**
- Find which domains list a specific seller ID
- Useful for relationship verification
- Supports cross-domain analysis

## Configuration

### Backend API Connection

```typescript
{
  apiBaseUrl: string;           // Backend API base URL
  apiKey: string;               // API key for authentication (required)
  timeout: number;              // Request timeout (ms)
  retries: number;              // Number of retries for failed requests
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_BASE_URL` | Backend API base URL | No (default: https://adstxt-manager.jp) |
| `API_KEY` | API key for authentication | **Yes** |
| `API_TIMEOUT` | Request timeout in milliseconds | No (default: 30000) |
| `API_RETRIES` | Number of retry attempts | No (default: 3) |

### Rate Limiting

The backend implements rate limiting for:
- Sellers.json fetching: Max concurrent requests
- Batch operations: Max batch size (100 items)
- Streaming: Progressive response delivery

## Error Handling

### Common Error Responses

```typescript
{
  success: false;
  error: {
    code: string;               // Error code
    message: string;            // Human-readable message
    details?: any;              // Additional context
  }
}
```

### Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Request timeout
- `RATE_LIMIT` - Rate limit exceeded
- `SERVER_ERROR` - Internal server error

## Performance Considerations

### Database Caching Strategy

- **ads.txt cache**: Refreshed when force=true or expired
- **sellers.json cache**: Automatic refresh on expiration
- **Metadata-only queries**: Optimized for fast lookups
- **Batch operations**: Use lookup tables for performance

### Best Practices

1. **Use metadata APIs first**: Check availability before fetching full data
2. **Batch operations**: Use batch APIs for multiple lookups
3. **Cache locally**: MCP server can cache responses temporarily
4. **Handle timeouts**: Large sellers.json files may take time
5. **Parallel requests**: Use parallel batch APIs for multiple domains

## Integration Examples

### Example 1: Validate and Optimize Workflow

```
1. User provides ads.txt content
2. MCP calls validate_adstxt to check syntax
3. If valid, MCP calls optimize_adstxt with level2
4. Return optimized content with categories
```

### Example 2: Domain Analysis

```
1. User provides publisher domain
2. MCP calls get_adstxt_cache to fetch current ads.txt
3. Parse domains from ads.txt
4. MCP calls get_sellers_json_metadata for each domain
5. Generate analysis report
```

### Example 3: Bulk Verification

```
1. User provides list of domains and account IDs
2. Group by domain
3. MCP calls search_sellers_batch for each domain
4. Collect results and identify issues
5. Return verification report
```

## Development Roadmap

### Phase 1: Core MCP Tools (MVP)
- [x] Backend API architecture review
- [x] Backend v1 API implementation (Quick validation, Domain info, Batch domain info)
- [ ] Implement validate_adstxt_quick tool
- [ ] Implement validate_adstxt tool
- [ ] Implement optimize_adstxt tool
- [ ] Implement get_adstxt_cache tool
- [ ] Implement get_sellers_json tool
- [ ] Basic error handling

### Phase 2: Domain & Help Tools
- [ ] Implement get_domain_info tool
- [ ] Implement get_batch_domain_info tool
- [ ] Implement get_error_help tool
- [ ] Implement batch search tools
- [ ] Implement metadata-only tools

### Phase 3: Advanced Features
- [ ] Add caching layer in MCP server
- [ ] Performance optimization
- [ ] Rate limiting handling
- [ ] Comprehensive error handling

### Phase 4: Production Ready
- [ ] Monitoring and logging
- [ ] Documentation and examples
- [ ] Testing (unit, integration, e2e)
- [ ] Deployment guide

## Testing Strategy

### Unit Tests
- Test each MCP tool independently
- Mock backend API responses
- Validate input/output schemas

### Integration Tests
- Test against live backend API
- Validate end-to-end workflows
- Performance benchmarking

### Performance Tests
- Batch operation limits
- Concurrent request handling
- Timeout behavior

## Security Considerations

- **No authentication required**: Public APIs
- **Rate limiting**: Backend enforces limits
- **Input validation**: MCP server validates before forwarding
- **Data sanitization**: Prevent injection attacks
- **HTTPS only**: Secure communication

## License

MIT

## Related Projects

- **Ads.txt Manager**: https://github.com/miyaichi/adstxt-manager
- **@miyaichi/ads-txt-validator**: https://github.com/miyaichi/adstxt-manager/tree/main/packages/ads-txt-validator
- **OpenSincera MCP Server**: https://github.com/miyaichi/opensincera-mcp-server
