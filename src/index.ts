#!/usr/bin/env node

/**
 * Ads.txt Manager MCP Server
 *
 * Provides AI agents with tools to validate, optimize, and analyze
 * ads.txt and sellers.json files for digital advertising transparency.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Import tools
import { validateAdsTxtQuick, validateAdsTxt } from './tools/validate.js';
import { optimizeAdsTxt } from './tools/optimize.js';
import { getAdsTxtCache, getDomainInfo, getBatchDomainInfo } from './tools/domain.js';
import {
  getSellersJson,
  getSellersJsonMetadata,
  searchSellersBatch,
  getSellerById,
} from './tools/sellers.js';
import { getErrorHelp } from './tools/help.js';

// Create server instance
const server = new Server(
  {
    name: 'adstxt-manager',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const tools = [
  {
    name: 'validate_adstxt_quick',
    description:
      'Fast syntax-only validation without database queries (10-20x faster). Checks ads.txt format, detects duplicates, and provides detailed error messages.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The ads.txt file content to validate',
        },
        checkDuplicates: {
          type: 'boolean',
          description: 'Check for duplicate entries (default: true)',
          default: true,
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'validate_adstxt',
    description:
      'Full ads.txt validation with sellers.json cross-checking. Validates syntax, format, and verifies account IDs against sellers.json.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The ads.txt file content to validate',
        },
        publisherDomain: {
          type: 'string',
          description: 'Optional publisher domain for cross-checking',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'optimize_adstxt',
    description:
      'Optimize ads.txt content. Level 1: remove duplicates, standardize format, group by domain. Level 2: Level 1 + sellers.json integration and categorization.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The ads.txt file content to optimize',
        },
        publisher_domain: {
          type: 'string',
          description: 'Optional publisher domain',
        },
        level: {
          type: 'string',
          enum: ['level1', 'level2'],
          description: 'Optimization level (default: level1)',
          default: 'level1',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'get_adstxt_cache',
    description:
      'Retrieve cached ads.txt content for a domain from the database. Optionally force refresh from source.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Publisher domain',
        },
        force: {
          type: 'boolean',
          description: 'Force refresh from source (default: false)',
          default: false,
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_domain_info',
    description:
      'Get comprehensive domain information (ads.txt + sellers.json status) in a single API call. Reduces API calls by 60-70%.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain to query',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_batch_domain_info',
    description:
      'Get information for multiple domains (up to 50) in a single request. Reduces API calls by 90%+.',
    inputSchema: {
      type: 'object',
      properties: {
        domains: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of domains to query (max 50)',
          minItems: 1,
          maxItems: 50,
        },
      },
      required: ['domains'],
    },
  },
  {
    name: 'get_sellers_json',
    description:
      'Get full sellers.json data for an advertising system domain. Includes all seller records, contact information, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Ad system domain (e.g., google.com)',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_sellers_json_metadata',
    description:
      'Get sellers.json metadata only (no seller list). Fast check for availability, seller count, and contact information.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Ad system domain',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'search_sellers_batch',
    description:
      'High-performance batch search for multiple seller IDs in a single domain. Up to 100 IDs per request.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Ad system domain',
        },
        seller_ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of seller IDs to search (max 100)',
          minItems: 1,
          maxItems: 100,
        },
      },
      required: ['domain', 'seller_ids'],
    },
  },
  {
    name: 'get_seller_by_id',
    description:
      'Search for a specific seller ID in an ad system\'s sellers.json. Returns seller details including type and confidentiality status.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Ad system domain',
        },
        seller_id: {
          type: 'string',
          description: 'Seller ID to search',
        },
      },
      required: ['domain', 'seller_id'],
    },
  },
  {
    name: 'get_error_help',
    description:
      'Get detailed help information for ads.txt validation errors and warnings. Supports multiple languages (English, Japanese).',
    inputSchema: {
      type: 'object',
      properties: {
        errorCode: {
          type: 'string',
          description: 'Optional specific error code (e.g., "11010")',
        },
        language: {
          type: 'string',
          enum: ['en', 'ja'],
          description: 'Language for help content (default: en)',
          default: 'en',
        },
      },
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'validate_adstxt_quick':
        result = await validateAdsTxtQuick(args || {});
        break;

      case 'validate_adstxt':
        result = await validateAdsTxt(args || {});
        break;

      case 'optimize_adstxt':
        result = await optimizeAdsTxt(args || {});
        break;

      case 'get_adstxt_cache':
        result = await getAdsTxtCache(args || {});
        break;

      case 'get_domain_info':
        result = await getDomainInfo(args || {});
        break;

      case 'get_batch_domain_info':
        result = await getBatchDomainInfo(args || {});
        break;

      case 'get_sellers_json':
        result = await getSellersJson(args || {});
        break;

      case 'get_sellers_json_metadata':
        result = await getSellersJsonMetadata(args || {});
        break;

      case 'search_sellers_batch':
        result = await searchSellersBatch(args || {});
        break;

      case 'get_seller_by_id':
        result = await getSellerById(args || {});
        break;

      case 'get_error_help':
        result = await getErrorHelp(args || {});
        break;

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new McpError(ErrorCode.InternalError, errorMessage);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('Ads.txt Manager MCP Server running on stdio');
  console.error(`API Base URL: ${process.env.API_BASE_URL || 'https://adstxt-manager.jp'}`);
  console.error(`API Key: ${process.env.API_KEY ? '***configured***' : '***NOT SET***'}`);

  if (!process.env.API_KEY) {
    console.error('⚠️  WARNING: API_KEY environment variable is not set');
    console.error('⚠️  Most API calls will fail without authentication');
  }
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
