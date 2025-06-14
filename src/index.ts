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

import { promises as fs } from 'fs';
import path from 'path';
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
import { checkTypeDocSetupTool } from './tools/check-setup.js';
import { generateTypeDocConfigTool } from './tools/generate-config.js';
import { runTypeDocGenerationTool } from './tools/run-generation.js';

/**
 * Configuration options for the TypeDoc MCP server
 * 
 * @interface ServerConfig
 */
interface ServerConfig {
  /** Path to the TypeDoc JSON output file */
  docPath?: string;
  /** Path to the TypeScript project (alternative to docPath) */
  projectPath?: string;
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
    // Parser will be initialized in start() after we determine the doc path
    this.parser = null as any;
    
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
        {
          name: 'checkTypeDocSetup',
          description: 'Check if TypeDoc is properly installed and configured in a TypeScript project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the TypeScript project directory' },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'generateTypeDocConfig',
          description: 'Generate a TypeDoc configuration file for a TypeScript project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the TypeScript project directory' },
              entryPoints: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Entry points for documentation (e.g., ["./src"]). Auto-detected if not provided.' 
              },
              outputPath: { type: 'string', description: 'Output directory for documentation (default: "./docs")' },
            },
            required: ['projectPath'],
          },
        },
        {
          name: 'runTypeDocGeneration',
          description: 'Run TypeDoc to generate documentation for a TypeScript project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to the TypeScript project directory' },
              configPath: { type: 'string', description: 'Path to typedoc.json config file (default: "./typedoc.json")' },
              install: { 
                type: 'boolean', 
                default: false,
                description: 'Install TypeDoc if not present' 
              },
            },
            required: ['projectPath'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check if tool requires parser
        const parserRequiredTools = ['findSymbol', 'getDocumentation', 'getMembers', 'searchByTag'];
        if (parserRequiredTools.includes(name)) {
          const loaded = await this.ensureParserLoaded();
          if (!loaded) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: Documentation not available. Use --doc-path to specify a TypeDoc JSON file, or use the setup tools to generate documentation.',
                },
              ],
            };
          }
        }

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

          case 'checkTypeDocSetup': {
            return await checkTypeDocSetupTool(args as any);
          }

          case 'generateTypeDocConfig': {
            return await generateTypeDocConfigTool(args as any);
          }

          case 'runTypeDocGeneration': {
            return await runTypeDocGenerationTool(args as any);
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
        const loaded = await this.ensureParserLoaded();
        if (!loaded) {
          return {
            contents: [
              {
                uri: 'typedoc://overview',
                mimeType: 'text/plain',
                text: 'Error: Documentation not available. Use setup tools to generate documentation first.',
              },
            ],
          };
        }
        
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
   * Ensures the parser is initialized and documentation is loaded
   * 
   * @internal
   */
  private async ensureParserLoaded(): Promise<boolean> {
    // If parser not initialized, try to find docs
    if (!this.parser) {
      // If we have a project path, check for generated docs
      if (this.config.projectPath) {
        const possiblePaths = [
          path.join(this.config.projectPath, 'docs', 'typedoc.json'),
          path.join(this.config.projectPath, 'documentation', 'typedoc.json'),
          path.join(this.config.projectPath, 'typedoc.json'),
        ];
        
        for (const docPath of possiblePaths) {
          try {
            await fs.access(docPath);
            console.error(`Found documentation at ${docPath}`);
            this.parser = new TypeDocParser(docPath);
            this.config.docPath = docPath; // Update config
            break;
          } catch {
            // Continue checking
          }
        }
      }
      
      if (!this.parser) {
        return false;
      }
    }

    // Check if already parsed by looking at the stats
    const stats = this.parser.getStats();
    if (stats.total > 0) {
      // Already parsed
      return true;
    }
    
    // Not parsed yet, parse now
    try {
      console.error(`Loading TypeDoc documentation from ${this.config.docPath}...`);
      await this.parser.parse();
      console.error('Documentation loaded successfully!');
      return true;
    } catch (error) {
      console.error(`Failed to load documentation: ${error}`);
      return false;
    }
  }

  /**
   * Starts the MCP server
   * 
   * @remarks
   * This method only starts the server transport.
   * Documentation loading happens on-demand through tool calls.
   */
  async start() {
    // Initialize parser if doc-path was provided
    if (this.config.docPath) {
      this.parser = new TypeDocParser(this.config.docPath);
      // Note: We do NOT parse the file here - that happens on first tool use
    }

    // Store project path for setup tools
    if (this.config.projectPath) {
      // Project path is available for setup tools to use
      console.error(`Project path configured: ${this.config.projectPath}`);
    }

    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('TypeDoc MCP Server started');
    
    if (!this.config.docPath && !this.config.projectPath) {
      console.error('No --doc-path or --project-path specified.');
      console.error('Use setup tools to configure TypeDoc for a project.');
    }
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
function parseArgs(args: string[]): ServerConfig & { help: boolean } {
  let docPath: string | undefined;
  let projectPath: string | undefined;
  let serverName: string | undefined;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--doc-path':
      case '-d':
        docPath = args[++i];
        break;
      case '--project-path':
      case '-p':
        projectPath = args[++i];
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

  return { docPath, projectPath, serverName, help };
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
  typedoc-mcp-server [options]

Options:
  --doc-path, -d <path>      Path to TypeDoc JSON output
  --project-path, -p <path>  Path to TypeScript project (alternative to --doc-path)
  --name, -n <name>          Server name (optional)
  --help, -h                 Show this help message

Examples:
  # Use existing TypeDoc JSON
  typedoc-mcp-server --doc-path ./docs/typedoc.json

  # Point to a project (setup tools will be available)
  typedoc-mcp-server --project-path /path/to/project

  # Start without any path (use setup tools via AI)
  typedoc-mcp-server
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
  const config = parseArgs(process.argv.slice(2));

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  // No required arguments anymore - server can start without doc-path
  // and use setup tools to configure

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