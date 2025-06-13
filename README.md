# TypeDoc MCP Server

A Model Context Protocol (MCP) server that serves TypeDoc-generated documentation to AI agents. This server enables AI assistants to understand and navigate TypeScript codebases through their documentation.

## Features

- **Fast symbol search** - Find classes, interfaces, functions, and more by name
- **Complete documentation access** - Get full documentation including descriptions, parameters, return types, and examples
- **Member inspection** - List all members of classes and interfaces with inheritance support
- **JSDoc tag search** - Find symbols by their JSDoc tags (e.g., @deprecated, @beta, @example)
- **Project overview** - Get high-level statistics and information about the documented codebase

## Installation

### Quick Start with npx

The easiest way to use the TypeDoc MCP Server is with npx:

```json
{
  "mcpServers": {
    "typedoc": {
      "command": "npx",
      "args": [
        "-y",
        "tsdoc-mcp-server",
        "--doc-path",
        "/path/to/your/typedoc.json"
      ]
    }
  }
}
```

### Local Installation

You can also install the server locally:

```bash
npm install -g tsdoc-mcp-server
```

Then add it to your MCP configuration:

```json
{
  "mcpServers": {
    "typedoc": {
      "command": "tsdoc-mcp-server",
      "args": [
        "--doc-path",
        "/path/to/your/typedoc.json"
      ]
    }
  }
}
```

### From Source

1. Clone this repository:
```bash
git clone https://github.com/dpmacdonagh/tsdoc-mcp-server.git
cd tsdoc-mcp-server
```

2. Install dependencies and build:
```bash
npm install
npm run build
```

3. Add to your MCP configuration:
```json
{
  "mcpServers": {
    "typedoc": {
      "command": "node",
      "args": [
        "/path/to/tsdoc-mcp-server/dist/index.js",
        "--doc-path",
        "/path/to/your/typedoc.json"
      ]
    }
  }
}
```

## Generating TypeDoc Documentation

Before using this server, you need to generate TypeDoc documentation for your TypeScript project:

1. Install TypeDoc in your project:
```bash
npm install --save-dev typedoc
```

2. Create a `typedoc.json` configuration file:
```json
{
  "entryPoints": ["./src"],
  "entryPointStrategy": "expand",
  "out": "./docs",
  "json": "./docs/typedoc.json"
}
```

**Important**: Use `"entryPointStrategy": "expand"` to ensure all modules and internal symbols are documented.

3. Generate the documentation:
```bash
npx typedoc
```

This will create both HTML documentation and a `typedoc.json` file that the MCP server uses.

## Usage

Once configured, the TypeDoc MCP Server provides the following tools to AI assistants:

### findSymbol
Search for symbols by name with optional kind filtering.

```typescript
// Find all symbols named "MyClass"
findSymbol({ name: "MyClass" })

// Find all classes containing "Service" 
findSymbol({ name: "Service", kind: "class", exact: false })
```

### getDocumentation
Get complete documentation for a symbol by ID or path.

```typescript
// Get docs by symbol ID
getDocumentation({ symbolId: 123 })

// Get docs by path
getDocumentation({ symbolPath: "MyNamespace.MyClass.myMethod" })
```

### getMembers
List all members of a class or interface.

```typescript
// Get all members
getMembers({ symbolId: 123 })

// Get only methods, including inherited
getMembers({ 
  symbolId: 123, 
  memberType: "method",
  includeInherited: true 
})
```

### searchByTag
Find symbols by their JSDoc tags.

```typescript
// Find all deprecated symbols
searchByTag({ tag: "deprecated" })

// Find symbols with specific tag values
searchByTag({ tag: "since", value: "2.0.0" })
```

### Resources

The server also provides a `typedoc://overview` resource that gives a high-level view of the documented project, including statistics about the number of modules, classes, interfaces, functions, and other symbols.

## Development

### Prerequisites

- Node.js 18 or higher
- TypeScript 5.0 or higher

### Building

```bash
npm install
npm run build
```

### Running in Development

```bash
npm run dev -- --doc-path ./docs/typedoc.json
```

### Testing

```bash
npm test
```

### Generating Self-Documentation

This project documents itself! To regenerate the documentation:

```bash
npm run docs
```

## Configuration

The server accepts the following command-line arguments:

- `--doc-path` (required): Path to the TypeDoc JSON file

Example:
```bash
tsdoc-mcp-server --doc-path /path/to/typedoc.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.