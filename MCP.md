# TypeDoc MCP Server Specification

## Overview

This document provides comprehensive specifications for building a generic Model Context Protocol (MCP) server that reads and serves TypeDoc-generated documentation. The server should be project-agnostic, allowing any TypeScript project to use it by pointing to their TypeDoc JSON output.

## Background Research

### What is MCP?

The Model Context Protocol (MCP) is an open standard by Anthropic that allows AI applications to access external data sources and tools in a standardized way. MCP servers expose:
- **Resources**: Data that can be loaded into context (like GET endpoints)
- **Tools**: Functions the AI can execute (like POST endpoints)
- **Prompts**: Reusable templates for AI interactions

### Why TypeDoc JSON?

TypeDoc can output documentation in two formats:
1. **HTML**: Human-readable documentation website
2. **JSON**: Machine-readable Abstract Syntax Tree (AST)

The JSON format is ideal for MCP because it preserves the complete TypeScript structure, including:
- Symbol types (class, interface, function, etc.)
- Inheritance relationships
- Type parameters and constraints
- JSDoc/TSDoc tags (@param, @returns, @example, etc.)
- Source file locations
- Access modifiers (public, private, protected)

## Server Architecture

### Core Components

```
typedoc-mcp-server/
├── src/
│   ├── server.ts          # MCP server setup
│   ├── parser/
│   │   ├── typedoc.ts     # TypeDoc JSON parser
│   │   ├── index.ts       # Index builder
│   │   └── cache.ts       # In-memory cache
│   ├── tools/
│   │   ├── findSymbol.ts
│   │   ├── getDocumentation.ts
│   │   ├── getExamples.ts
│   │   ├── getTypeDefinition.ts
│   │   ├── getMembers.ts
│   │   ├── getInheritance.ts
│   │   └── searchByTag.ts
│   ├── resources/
│   │   └── overview.ts    # Project overview resource
│   └── types/
│       └── typedoc.ts     # TypeDoc type definitions
├── package.json
├── tsconfig.json
└── README.md
```

### Configuration

The server should accept configuration through:
1. **Command-line arguments**
2. **Environment variables**
3. **Configuration file** (typedoc-mcp.json)

```typescript
interface ServerConfig {
  // Required: Path to TypeDoc JSON output
  docPath: string;
  
  // Optional: Server name (defaults to project name from docs)
  serverName?: string;
  
  // Optional: Cache settings
  cache?: {
    enabled: boolean;
    ttl?: number; // Time to live in seconds
  };
  
  // Optional: File watching
  watch?: boolean; // Auto-reload when docs change
  
  // Optional: Transport type
  transport?: 'stdio' | 'http';
  
  // Optional: HTTP server settings
  http?: {
    port: number;
    host: string;
  };
}
```

## TypeDoc JSON Structure

### Key Elements to Parse

```typescript
interface TypeDocJSON {
  name: string;              // Project name
  children?: DocNode[];      // Top-level exports
  groups?: Group[];          // Grouped by kind
  packageVersion?: string;   // Package version
  readme?: string;          // README content
}

interface DocNode {
  id: number;
  name: string;
  kind: number;              // Maps to TypeScript symbol kind
  kindString?: string;       // Human-readable kind
  flags?: Flags;
  children?: DocNode[];      // Nested members
  groups?: Group[];
  sources?: Source[];
  comment?: Comment;
  type?: Type;
  signatures?: Signature[];  // For functions/methods
  extendedTypes?: Type[];    // Inheritance
  implementedTypes?: Type[]; // Interfaces
  typeParameter?: TypeParameter[];
  defaultValue?: string;
}

interface Comment {
  shortText?: string;
  text?: string;
  tags?: CommentTag[];       // JSDoc tags
}

interface CommentTag {
  tag: string;               // @param, @returns, etc.
  text: string;
  param?: string;            // Parameter name for @param
}
```

### Kind Values (Important)

```typescript
enum ReflectionKind {
  Module = 1,
  Namespace = 2,
  Enum = 4,
  Variable = 32,
  Function = 64,
  Class = 128,
  Interface = 256,
  TypeAlias = 4194304,
  // ... more kinds
}
```

## MCP Tools Implementation

### 1. findSymbol

Find any symbol by name and optionally filter by kind.

```typescript
interface FindSymbolParams {
  name: string;
  kind?: 'class' | 'interface' | 'function' | 'type' | 'enum' | 'variable';
  exact?: boolean; // Exact match vs contains
}

interface FindSymbolResult {
  symbols: Array<{
    name: string;
    kind: string;
    path: string;         // Full path like "NodeService.createNode"
    id: number;           // TypeDoc ID for further queries
    source?: {
      fileName: string;
      line: number;
    };
  }>;
}
```

### 2. getDocumentation

Get complete documentation for a symbol.

```typescript
interface GetDocumentationParams {
  symbolId: number;  // TypeDoc ID
  // OR
  symbolPath: string; // Full path
}

interface GetDocumentationResult {
  name: string;
  kind: string;
  description: string;
  examples?: string[];
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    optional: boolean;
    default?: string;
  }>;
  returns?: {
    type: string;
    description: string;
  };
  throws?: Array<{
    type: string;
    description: string;
  }>;
  see?: string[];
  deprecated?: string;
  since?: string;
  access?: 'public' | 'protected' | 'private';
  source?: {
    fileName: string;
    line: number;
    url?: string; // GitHub URL if available
  };
}
```

### 3. getExamples

Extract code examples for a symbol.

```typescript
interface GetExamplesParams {
  symbolId: number;
  includeInherited?: boolean; // Include examples from parent classes
}

interface GetExamplesResult {
  examples: Array<{
    code: string;
    language: string; // Usually 'typescript'
    description?: string;
    source: string; // Which symbol this example comes from
  }>;
}
```

### 4. getTypeDefinition

Get the complete type definition.

```typescript
interface GetTypeDefinitionParams {
  symbolId: number;
  expanded?: boolean; // Expand type aliases
}

interface GetTypeDefinitionResult {
  definition: string; // Full TypeScript type definition
  dependencies?: string[]; // Other types this depends on
}
```

### 5. getMembers

Get all members of a class/interface.

```typescript
interface GetMembersParams {
  symbolId: number;
  memberType?: 'property' | 'method' | 'accessor';
  access?: 'public' | 'protected' | 'private';
  static?: boolean;
  inherited?: boolean;
}

interface GetMembersResult {
  members: Array<{
    name: string;
    kind: string;
    type: string;
    access: string;
    static: boolean;
    abstract: boolean;
    optional: boolean;
    inherited: boolean;
    inheritedFrom?: string;
    description?: string;
  }>;
}
```

### 6. getInheritance

Get inheritance chain and hierarchy.

```typescript
interface GetInheritanceParams {
  symbolId: number;
  direction?: 'up' | 'down' | 'both'; // Parents, children, or both
}

interface GetInheritanceResult {
  parents?: string[];        // Direct parents
  children?: string[];       // Direct children
  implements?: string[];     // Interfaces implemented
  implementedBy?: string[];  // Classes implementing this interface
  fullHierarchy?: {         // Complete tree
    [symbolName: string]: {
      parents: string[];
      children: string[];
    };
  };
}
```

### 7. searchByTag

Search symbols by JSDoc tags.

```typescript
interface SearchByTagParams {
  tag: string; // @deprecated, @beta, @internal, etc.
  value?: string; // Optional tag value to match
}

interface SearchByTagResult {
  symbols: Array<{
    name: string;
    kind: string;
    path: string;
    tagValue: string; // The actual tag content
    source?: {
      fileName: string;
      line: number;
    };
  }>;
}
```

## MCP Resources

### Project Overview Resource

Expose a resource that provides project overview.

```typescript
interface ProjectOverview {
  name: string;
  version?: string;
  description?: string;
  stats: {
    modules: number;
    classes: number;
    interfaces: number;
    functions: number;
    types: number;
    enums: number;
  };
  readme?: string; // First section of README
  mainExports: string[]; // Top-level exports
}
```

## Implementation Guidelines

### 1. Parser Implementation

```typescript
class TypeDocParser {
  private index: Map<number, DocNode> = new Map();
  private nameIndex: Map<string, number[]> = new Map();
  private pathIndex: Map<string, number> = new Map();
  
  constructor(private docPath: string) {}
  
  async parse(): Promise<void> {
    const json = await fs.readFile(this.docPath, 'utf-8');
    const doc = JSON.parse(json);
    this.buildIndex(doc);
  }
  
  private buildIndex(node: DocNode, path: string = ''): void {
    // 1. Add to main index
    this.index.set(node.id, node);
    
    // 2. Add to name index (multiple symbols can have same name)
    const existing = this.nameIndex.get(node.name) || [];
    existing.push(node.id);
    this.nameIndex.set(node.name, existing);
    
    // 3. Add to path index (paths are unique)
    const fullPath = path ? `${path}.${node.name}` : node.name;
    this.pathIndex.set(fullPath, node.id);
    
    // 4. Recursively index children
    if (node.children) {
      for (const child of node.children) {
        this.buildIndex(child, fullPath);
      }
    }
  }
}
```

### 2. MCP Server Setup

```typescript
import { McpServer, StdioServerTransport } from '@modelcontextprotocol/sdk';

class TypeDocMcpServer {
  private server: McpServer;
  private parser: TypeDocParser;
  
  constructor(config: ServerConfig) {
    this.parser = new TypeDocParser(config.docPath);
    this.server = new McpServer({
      name: config.serverName || 'TypeDoc MCP Server',
      version: '1.0.0'
    });
    
    this.registerTools();
    this.registerResources();
  }
  
  private registerTools(): void {
    this.server.tool(
      'findSymbol',
      'Find symbols by name and kind',
      {
        name: z.string(),
        kind: z.enum(['class', 'interface', 'function', 'type', 'enum']).optional(),
        exact: z.boolean().optional()
      },
      async (params) => this.findSymbol(params)
    );
    
    // Register other tools...
  }
  
  async start(): Promise<void> {
    await this.parser.parse();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

### 3. Caching Strategy

```typescript
class DocumentationCache {
  private cache = new Map<string, CacheEntry>();
  private ttl: number;
  
  constructor(ttl: number = 3600) { // 1 hour default
    this.ttl = ttl * 1000; // Convert to milliseconds
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
}
```

### 4. File Watching

```typescript
import { watch } from 'fs/promises';

class FileWatcher {
  async watchDocs(docPath: string, onChange: () => void): Promise<void> {
    const watcher = watch(docPath);
    
    for await (const event of watcher) {
      if (event.eventType === 'change') {
        console.log('Documentation updated, reloading...');
        await onChange();
      }
    }
  }
}
```

## Usage Examples

### 1. Basic Setup

```bash
# Install globally
npm install -g typedoc-mcp-server

# Run with TypeDoc JSON
typedoc-mcp-server --doc-path ./docs/typedoc.json

# Or with config file
typedoc-mcp-server --config ./typedoc-mcp.json
```

### 2. Configuration File

```json
{
  "docPath": "./docs/typedoc.json",
  "serverName": "My Project Docs",
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "watch": true
}
```

### 3. Integration with AI Clients

```json
// Claude Desktop config
{
  "mcpServers": {
    "my-project-docs": {
      "command": "typedoc-mcp-server",
      "args": ["--doc-path", "/path/to/docs/typedoc.json"]
    }
  }
}
```

### 4. CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate TypeDoc JSON
  run: npx typedoc --json docs/typedoc.json
  
- name: Upload docs artifact
  uses: actions/upload-artifact@v3
  with:
    name: typedoc-json
    path: docs/typedoc.json
```

## Advanced Features

### 1. Multi-Project Support

```typescript
interface MultiProjectConfig {
  projects: Array<{
    name: string;
    docPath: string;
    prefix?: string; // Prefix for symbols, e.g., "frontend."
  }>;
}
```

### 2. Custom Indexing

```typescript
interface CustomIndex {
  // Index by decorator
  decoratorIndex: Map<string, number[]>;
  
  // Index by file
  fileIndex: Map<string, number[]>;
  
  // Index by inheritance
  inheritanceIndex: Map<number, number[]>;
}
```

### 3. Query Language

Support natural language queries that map to tool calls:
- "show me all deprecated functions" → searchByTag({ tag: '@deprecated' })
- "what does NodeService.createNode do" → getDocumentation({ symbolPath: 'NodeService.createNode' })
- "find all classes that implement Repository" → getInheritance + filter

### 4. Performance Optimizations

1. **Lazy Loading**: Don't parse entire JSON upfront, use streaming parser
2. **Incremental Updates**: When watching, only re-index changed parts
3. **Memory Management**: Implement LRU cache for large projects
4. **Parallel Processing**: Use worker threads for indexing

## Testing Strategy

### 1. Unit Tests

```typescript
describe('TypeDocParser', () => {
  it('should parse simple class', () => {
    const mockDoc = {
      id: 1,
      name: 'TestClass',
      kind: 128, // Class
      children: [...]
    };
    
    const parser = new TypeDocParser();
    parser.parseNode(mockDoc);
    
    expect(parser.findByName('TestClass')).toBeDefined();
  });
});
```

### 2. Integration Tests

Test with real TypeDoc output from sample projects:
- Simple project (few files)
- Complex project (100+ files)
- Project with complex inheritance
- Project with many JSDoc tags

### 3. Performance Tests

```typescript
describe('Performance', () => {
  it('should handle large documentation', async () => {
    const start = Date.now();
    const parser = new TypeDocParser('./test/large-docs.json');
    await parser.parse();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Under 1 second
  });
});
```

## Error Handling

### 1. Graceful Degradation

```typescript
class ErrorHandler {
  handleToolError(error: Error, params: any): ToolResult {
    if (error instanceof SymbolNotFoundError) {
      return {
        content: [{
          type: 'text',
          text: `Symbol not found. Did you mean: ${this.suggestSimilar(params.name)}?`
        }]
      };
    }
    
    // Log error but return helpful message
    console.error('Tool error:', error);
    return {
      content: [{
        type: 'text',
        text: 'An error occurred. Please check the symbol name and try again.'
      }]
    };
  }
}
```

### 2. Validation

```typescript
class Validator {
  validateDocJson(doc: any): void {
    if (!doc.name || !doc.kind) {
      throw new Error('Invalid TypeDoc JSON format');
    }
    
    if (!doc.children && !doc.groups) {
      console.warn('Documentation appears to be empty');
    }
  }
}
```

## Security Considerations

1. **Path Validation**: Ensure docPath is within allowed directories
2. **JSON Size Limits**: Implement max file size to prevent DoS
3. **Rate Limiting**: For HTTP transport, implement rate limiting
4. **Sanitization**: Sanitize any user-provided symbol names

## Deployment Options

### 1. Standalone Binary

Use `pkg` or similar to create single executable:
```bash
pkg . --targets node18-linux-x64,node18-macos-x64,node18-win-x64
```

### 2. Docker Container

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENTRYPOINT ["node", "dist/server.js"]
```

### 3. NPM Package

Publish to npm for easy installation:
```json
{
  "name": "typedoc-mcp-server",
  "bin": {
    "typedoc-mcp-server": "./dist/cli.js"
  }
}
```

## Future Enhancements

1. **GraphQL API**: Expose documentation via GraphQL for web clients
2. **Incremental Indexing**: Only re-index changed symbols
3. **Cross-Project References**: Link symbols across multiple projects
4. **AI Training Data**: Export documentation in formats suitable for fine-tuning
5. **IDE Integration**: VSCode extension that uses the MCP server
6. **Documentation Coverage**: Report on undocumented symbols
7. **Change Detection**: Track API changes between versions

## Resources and References

### TypeDoc
- [TypeDoc Documentation](https://typedoc.org/)
- [TypeDoc JSON Schema](https://github.com/TypeStrong/typedoc/blob/master/src/lib/serialization/schema.ts)
- [TypeDoc API](https://typedoc.org/api/)

### MCP
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)

### Related Projects
- [TSDoc Specification](https://tsdoc.org/)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [API Extractor](https://api-extractor.com/)

## Conclusion

This TypeDoc MCP Server specification provides a comprehensive blueprint for building a powerful documentation server that understands TypeScript semantics. By parsing TypeDoc's JSON output directly, the server can provide precise, type-aware responses that go far beyond simple text search.

The generic design ensures any TypeScript project can benefit from this tool by simply generating their TypeDoc JSON and pointing the server to it. This approach eliminates the need for expensive embedding models while providing superior accuracy for technical documentation queries.

---

*Specification Version: 1.0*  
*Last Updated: 2025-01-13*  
*Purpose: Reference implementation guide for TypeDoc MCP Server*