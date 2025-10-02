# Ads.txt MCP Server

A Model Context Protocol (MCP) server that provides AI agents with tools to validate, optimize, and analyze ads.txt and sellers.json files for digital advertising transparency.

## Overview

This MCP server acts as a bridge between AI agents (like Claude) and the [Ads.txt Manager](https://github.com/miyaichi/adstxt-manager) backend API. It enables AI-powered workflows for:

- **Ads.txt Validation**: Syntax checking, duplicate detection, and sellers.json cross-verification
- **Ads.txt Optimization**: Deduplication, formatting, categorization, and certification ID completion
- **Sellers.json Analysis**: Fast lookups, batch searches, and metadata queries
- **Domain Intelligence**: Cache-based ads.txt and sellers.json retrieval

## Features

### 🔍 Validation Tools
- Parse and validate ads.txt syntax
- Cross-check entries with sellers.json
- Detect duplicates and format issues
- Provide detailed error messages

### ⚡ Optimization Tools
- **Level 1**: Remove duplicates, standardize format, group by domain
- **Level 2**: Add sellers.json integration, categorize by seller type, complete certification IDs

### 📊 Analysis Tools
- Batch seller ID lookups (up to 100 at once)
- Metadata-only queries for fast checks
- Parallel domain processing
- Streaming support for large datasets

### 💾 Cache Integration
- Leverage PostgreSQL-backed cache
- Force refresh capability
- Automatic expiration handling

## Architecture

```
┌─────────────────┐
│   AI Agent      │  (Claude, GPT, etc.)
│   (Claude Code) │
└────────┬────────┘
         │ MCP Protocol
         ↓
┌─────────────────┐
│   MCP Server    │  (This project)
│  Lightweight    │
│     Proxy       │
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│ Ads.txt Manager │
│  Backend API    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   PostgreSQL    │  (ads.txt & sellers.json cache)
└─────────────────┘
```

## Installation

### Prerequisites

- Node.js 18 or higher
- Running instance of [Ads.txt Manager](https://github.com/miyaichi/adstxt-manager) backend

### From npm (when published)

```bash
npm install -g adstxt-mcp-server
```

### From Source

```bash
git clone https://github.com/miyaichi/adstxt-mcp-server.git
cd adstxt-mcp-server
npm install
npm run build
```

## Configuration

### MCP Settings

Add to your MCP settings file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "adstxt-manager": {
      "command": "node",
      "args": ["/path/to/adstxt-mcp-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "https://adstxt-manager.jp",
        "API_KEY": "your-api-key-here",
        "API_TIMEOUT": "30000",
        "API_RETRIES": "3"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_BASE_URL` | Ads.txt Manager backend URL | `https://adstxt-manager.jp` | No |
| `API_KEY` | API key for authentication | - | **Yes** |
| `API_TIMEOUT` | Request timeout in milliseconds | `30000` | No |
| `API_RETRIES` | Number of retry attempts | `3` | No |

## MCP Tools

### validate_adstxt_quick

Fast syntax-only validation without database queries (10-20x faster).

```typescript
// Input
{
  content: string;              // ads.txt file content
  checkDuplicates?: boolean;    // Check for duplicates (default: true)
}

// Output
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

### validate_adstxt

Full validation with sellers.json cross-checking.

```typescript
// Input
{
  content: string;              // ads.txt file content
  publisherDomain?: string;     // Optional: for cross-checking
}

// Output
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

### optimize_adstxt

Optimizes ads.txt with two optimization levels.

```typescript
// Input
{
  content: string;
  publisher_domain?: string;
  level?: 'level1' | 'level2';  // Default: 'level1'
}

// Output
{
  success: boolean;
  data: {
    optimized_content: string;
    original_length: number;
    optimized_length: number;
    categories?: {              // Level 2 only
      other: number;
      confidential: number;
      missing_seller_id: number;
      no_seller_json: number;
    }
  }
}
```

### get_adstxt_cache

Retrieves cached ads.txt for a domain.

```typescript
// Input
{
  domain: string;
  force?: boolean;              // Force refresh
}

// Output
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

### get_sellers_json

Gets full sellers.json data for an ad system.

```typescript
// Input
{
  domain: string;               // e.g., 'google.com'
}

// Output
{
  success: boolean;
  data: {
    sellers_json: SellerRecord[];
    contact_email?: string;
    version?: string;
    identifiers?: any[];
  }
}
```

### get_sellers_json_metadata

Gets only metadata (no seller list) for fast checks.

```typescript
// Input
{
  domain: string;
}

// Output
{
  success: boolean;
  data: {
    domain: string;
    seller_count: number;
    contact_email?: string;
    fetched_at: string;
  }
}
```

### search_sellers_batch

High-performance batch search for multiple seller IDs.

```typescript
// Input
{
  domain: string;
  seller_ids: string[];         // Max 100 IDs
}

// Output
{
  success: boolean;
  data: {
    found: SellerRecord[];
    not_found: string[];
    execution_time_ms: number;
  }
}
```

### get_seller_by_id

Searches for a specific seller ID.

```typescript
// Input
{
  domain: string;
  seller_id: string;
}

// Output
{
  success: boolean;
  data: {
    found: boolean;
    seller?: SellerRecord;
  }
}
```

### get_domain_info

Get comprehensive domain information (ads.txt + sellers.json) in single call.

```typescript
// Input
{
  domain: string;
}

// Output
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

### get_batch_domain_info

Get information for multiple domains (up to 50) in a single request.

```typescript
// Input
{
  domains: string[];            // Max 50 domains
}

// Output
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

### get_error_help

Get detailed help information for ads.txt validation errors and warnings.

```typescript
// Input
{
  errorCode?: string;           // Optional: specific error code (e.g., "11010")
  language?: 'en' | 'ja';       // Language (default: 'en')
}

// Output
{
  success: boolean;
  data: {
    content: string;            // Markdown help content
    url?: string;               // Link to specific error section
  }
}
```

## Usage Examples

### Example 1: Validate ads.txt

```
User: "Please validate this ads.txt content"
Agent: Uses validate_adstxt tool
Result: Detailed validation report with errors and warnings
```

### Example 2: Optimize ads.txt

```
User: "Optimize my ads.txt file at example.com"
Agent:
  1. Calls get_adstxt_cache to fetch current ads.txt
  2. Calls optimize_adstxt with level2
  3. Returns categorized, optimized content
```

### Example 3: Verify seller relationships

```
User: "Check if google.com lists publisher ID 12345"
Agent:
  1. Calls get_seller_by_id(domain='google.com', seller_id='12345')
  2. Returns seller details if found
```

### Example 4: Bulk analysis

```
User: "Analyze all ad systems in this ads.txt"
Agent:
  1. Parses ads.txt to extract domains
  2. Calls get_sellers_json_metadata for each domain
  3. Generates comprehensive analysis report
```

## API Backend Requirements

This MCP server requires a running instance of the Ads.txt Manager backend with the following endpoints:

### Core Endpoints (v1)
- `POST /api/v1/adstxt/validate/quick` - Quick validation (10-20x faster)
- `GET /api/v1/domains/:domain/info` - Domain info (60-70% fewer calls)
- `POST /api/v1/domains/batch/info` - Batch domain info (90%+ fewer calls)
- `POST /api/v1/sellersjson/:domain/sellers/batch` - Batch seller search

### Legacy Endpoints
- `POST /api/adsTxt/process` - Full validation with sellers.json
- `POST /api/adsTxt/optimize` - Optimize ads.txt
- `GET /api/adsTxtCache/domain/:domain` - Get cached ads.txt
- `GET /api/sellersJson/:domain` - Get sellers.json
- `GET /api/sellersJson/:domain/metadata` - Get metadata only
- `GET /api/sellersJson/:domain/seller/:sellerId` - Search seller

### Help Resources
- `GET /help/en/warnings.md` - Error help (English)
- `GET /help/ja/warnings.md` - Error help (Japanese)

See [AGENT.md](./AGENT.md) for detailed specifications.

## Performance

### Optimization Features

- **Database caching**: Minimizes external HTTP requests
- **Batch operations**: Up to 100 items per request
- **Parallel processing**: Multiple domains simultaneously
- **Streaming support**: Large dataset handling
- **Metadata queries**: Fast checks without full data

### Benchmarks

- Single seller lookup: ~10ms (cache hit)
- Batch 100 sellers: ~50-100ms
- Level 2 optimization: ~2-5s (depending on seller count)
- Parallel domain analysis: 70-80% faster than sequential

## Error Handling

All tools return a consistent error format:

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

### Common Error Codes

- `VALIDATION_ERROR` - Invalid input
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Request timeout
- `RATE_LIMIT` - Rate limit exceeded
- `SERVER_ERROR` - Internal error

## Development

### Project Structure

```
adstxt-mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # MCP tool implementations
│   │   ├── validate.ts
│   │   ├── optimize.ts
│   │   ├── domain.ts
│   │   ├── sellers.ts
│   │   └── help.ts
│   ├── api/                  # Backend API client
│   │   └── client.ts
│   └── types/                # TypeScript definitions
├── tests/                    # Test files
├── package.json
└── tsconfig.json
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

### Code Style

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Conventional commits

## Testing

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

Requires running backend:

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

## Troubleshooting

### MCP Server Not Connecting

1. Check backend is running: `curl http://localhost:3001/health`
2. Verify MCP configuration in Claude settings
3. Check logs: `tail -f ~/.claude/logs/mcp-server.log`

### Slow Performance

1. Check database cache status
2. Use metadata-only queries when possible
3. Implement batch operations for multiple lookups
4. Consider backend optimization settings

### Validation Errors

1. Verify ads.txt format compliance
2. Check sellers.json availability
3. Review error details in response
4. Consult IAB standards documentation

## Security

- **API Key authentication**: Required for all API calls
- **Environment variables**: API key stored securely in environment, never in code
- **Input validation**: All inputs sanitized using Zod schemas
- **HTTPS only**: All API calls use secure HTTPS connections
- **Rate limiting**: Handled by backend API
- **No data storage**: MCP server is stateless, no caching of sensitive data
- **Retry logic**: Automatic retry for transient errors with exponential backoff

### Best Practices

1. **Never commit API keys**: Keep API_KEY in environment variables only
2. **Rotate keys regularly**: Request new API keys periodically
3. **Limit key scope**: Use separate keys for different environments
4. **Monitor usage**: Check API usage logs for unexpected activity

## License

MIT License - see [LICENSE](../LICENSE) file

## Related Projects

- **Ads.txt Manager**: https://github.com/miyaichi/adstxt-manager
- **@miyaichi/ads-txt-validator**: NPM package for ads.txt validation
- **OpenSincera MCP Server**: https://github.com/miyaichi/opensincera-mcp-server

## Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Developed using [Claude Code](https://claude.ai/code) vibe coding approach
- Leverages [Ads.txt Manager](https://github.com/miyaichi/adstxt-manager) backend

## Support

- **Issues**: https://github.com/miyaichi/adstxt-mcp-server/issues
- **Discussions**: https://github.com/miyaichi/adstxt-mcp-server/discussions
- **Documentation**: [AGENT.md](./AGENT.md)

## Roadmap

- [x] Core validation and optimization tools
- [x] Sellers.json search capabilities
- [x] Database cache integration
- [ ] Additional backend APIs
- [ ] Performance monitoring
- [ ] Advanced error recovery
- [ ] Comprehensive documentation
- [ ] Production deployment guide
