#!/usr/bin/env node
/**
 * TypeDoc MCP Server
 * 
 * @packageDocumentation
 * @module typedoc-mcp-server
 * 
 * @remarks
 * This is the main entry point for the TypeDoc Model Context Protocol (MCP) server.
 * It provides AI agents with structured access to TypeScript documentation through
 * standardized tools and resources.
 * 
 * The server implements the MCP specification to expose TypeDoc-generated documentation
 * in a way that AI assistants can understand and navigate efficiently.
 * 
 * @see {@link https://modelcontextprotocol.io | Model Context Protocol}
 * @see {@link https://typedoc.org | TypeDoc}
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TypeDocParser } from './parser/index.js';
import { getProjectOverview } from './resources/overview.js';
import {
  findSymbol,
  getDocumentation,
  getMembers,
  searchByTag,
} from './tools/index.js';

/**
 * Configuration options for the TypeDoc MCP server
 * 
 * @interface ServerConfig
 */
interface ServerConfig {
  /** Path to the TypeDoc JSON output file */
  docPath: string;
  /** Optional custom name for the server */
  serverName?: string;
}

/**
 * Main TypeDoc MCP Server implementation
 * 
 * @remarks
 * This class sets up the MCP server with all available tools and resources,
 * handles incoming requests, and manages the TypeDoc parser instance.
 * 
 * The server provides the following capabilities:
 * - **Tools**: findSymbol, getDocumentation, getMembers, searchByTag
 * - **Resources**: Project overview with statistics
 * 
 * @example
 * ```typescript
 * const config: ServerConfig = {
 *   docPath: './docs/typedoc.json',
 *   serverName: 'My Project Docs'
 * };
 * 
 * const server = new TypeDocMCPServer(config);
 * await server.start();
 * ```
 */
class TypeDocMCPServer {
  /** MCP server instance */
  private server: Server;
  /** TypeDoc parser for processing documentation */
  private parser: TypeDocParser;
  /** Server configuration */
  private config: ServerConfig;

  /**
   * Creates a new TypeDoc MCP server instance
   * 
   * @param config - Server configuration options
   */
  constructor(config: ServerConfig) {
    this.config = config;
    this.parser = new TypeDocParser(config.docPath);
    
    this.server = new Server(
      {
        name: config.serverName || 'TypeDoc MCP Server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Sets up request handlers for MCP protocol operations
   * 
   * @remarks
   * This method registers handlers for:
   * - Listing available tools
   * - Executing tool calls
   * - Listing available resources
   * - Reading resource content
   * 
   * @internal
   */
  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'findSymbol',
          description: 'Find symbols by name and optionally filter by kind',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Symbol name to search for' },
              kind: { 
                type: 'string', 
                enum: ['class', 'interface', 'function', 'type', 'enum', 'variable'],
                description: 'Filter by symbol kind' 
              },
              exact: { 
                type: 'boolean', 
                default: true,
                description: 'Use exact match (true) or partial match (false)' 
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'getDocumentation',
          description: 'Get complete documentation for a symbol',
          inputSchema: {
            type: 'object',
            properties: {
              symbolId: { type: 'number', description: 'TypeDoc ID of the symbol' },
              symbolPath: { type: 'string', description: 'Full path to the symbol (e.g., "MyClass.myMethod")' },
            },
          },
        },
        {
          name: 'getMembers',
          description: 'Get all members of a class or interface',
          inputSchema: {
            type: 'object',
            properties: {
              symbolId: { type: 'number', description: 'TypeDoc ID of the class or interface' },
              memberType: { 
                type: 'string',
                enum: ['property', 'method', 'all'],
                default: 'all',
                description: 'Filter by member type' 
              },
              includeInherited: { 
                type: 'boolean',
                default: false,
                description: 'Include inherited members' 
              },
            },
            required: ['symbolId'],
          },
        },
        {
          name: 'searchByTag',
          description: 'Search symbols by JSDoc tags',
          inputSchema: {
            type: 'object',
            properties: {
              tag: { type: 'string', description: 'JSDoc tag to search for (without @ prefix, e.g., "deprecated", "beta", "internal")' },
              value: { type: 'string', description: 'Optional tag value to match' },
            },
            required: ['tag'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'findSymbol': {
            const result = await findSymbol(this.parser, args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'getDocumentation': {
            const result = await getDocumentation(this.parser, args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'getMembers': {
            const result = await getMembers(this.parser, args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'searchByTag': {
            const result = await searchByTag(this.parser, args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'typedoc://overview',
          name: 'Project Overview',
          description: 'Overview of the TypeScript project documentation',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'typedoc://overview') {
        const overview = await getProjectOverview(this.parser);
        return {
          contents: [
            {
              uri: overview.uri,
              mimeType: overview.mimeType,
              text: JSON.stringify(overview.content, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  /**
   * Starts the MCP server
   * 
   * @remarks
   * This method:
   * 1. Loads and parses the TypeDoc JSON file
   * 2. Initializes the stdio transport
   * 3. Connects the server to the transport
   * 
   * @throws Error if the documentation cannot be loaded or parsed
   */
  async start() {
    // Parse TypeDoc JSON
    console.error(`Loading TypeDoc documentation from ${this.config.docPath}...`);
    await this.parser.parse();
    console.error('Documentation loaded successfully!');

    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('TypeDoc MCP Server started');
  }
}

/**
 * Parses command line arguments
 * 
 * @param args - Array of command line arguments
 * @returns Parsed configuration object
 * 
 * @internal
 */
function parseArgs(args: string[]): { docPath?: string; serverName?: string; help: boolean } {
  let docPath: string | undefined;
  let serverName: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--doc-path':
      case '-d':
        docPath = args[++i];
        break;
      case '--name':
      case '-n':
        serverName = args[++i];
        break;
      case '--help':
      case '-h':
        help = true;
        break;
    }
  }

  return { docPath, serverName, help };
}

/**
 * Shows usage information
 * 
 * @internal
 */
function showHelp(): void {
  console.log(`
TypeDoc MCP Server

Usage:
  typedoc-mcp-server --doc-path <path> [options]

Options:
  --doc-path, -d <path>    Path to TypeDoc JSON output (required)
  --name, -n <name>        Server name (optional)
  --help, -h               Show this help message

Example:
  typedoc-mcp-server --doc-path ./docs/typedoc.json
  `);
}

/**
 * Main entry point
 * 
 * @remarks
 * This function:
 * 1. Parses command line arguments
 * 2. Validates required parameters
 * 3. Creates and starts the MCP server
 * 4. Sets up graceful shutdown handlers
 * 
 * @internal
 */
async function main() {
  const { docPath, serverName, help } = parseArgs(process.argv.slice(2));

  if (help) {
    showHelp();
    process.exit(0);
  }

  if (!docPath) {
    console.error('Error: --doc-path is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  const config: ServerConfig = {
    docPath,
    serverName,
  };

  try {
    const server = new TypeDocMCPServer(config);
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\nShutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});