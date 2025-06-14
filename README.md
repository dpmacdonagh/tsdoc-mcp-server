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

### Automated Setup (Recommended)

The TypeDoc MCP Server can help set up TypeDoc automatically through AI assistants. Simply start the server with your project path:

```json
{
  "mcpServers": {
    "typedoc": {
      "command": "npx",
      "args": [
        "-y",
        "tsdoc-mcp-server",
        "--project-path",
        "/path/to/your/typescript/project"
      ]
    }
  }
}
```

Then ask your AI assistant to:
1. Check the TypeDoc setup status
2. Generate a TypeDoc configuration if needed
3. Run TypeDoc to generate documentation

The AI will use the setup tools to configure everything automatically!

### Manual Setup

If you prefer to set up TypeDoc manually:

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

## Usage with AI Assistants

Once configured, the TypeDoc MCP Server enables powerful documentation exploration through AI assistants. Here are example prompts you can use:

### Example Prompts for Exploring Documentation

**Getting Started:**
- "Show me an overview of this TypeScript project"
- "What are the main classes in this codebase?"
- "Find all interfaces in the project"

**Searching for Symbols:**
- "Find the UserService class"
- "Show me all classes that contain 'Controller'"
- "Find all functions that start with 'handle'"

**Understanding Code:**
- "Explain the AuthenticationManager class and its methods"
- "Show me the documentation for the login method"
- "What parameters does the createUser function accept?"

**Exploring Class Members:**
- "List all methods in the DatabaseConnection class"
- "Show me only the public properties of the User interface"
- "What methods does the Repository class inherit?"

**Finding Special Code:**
- "Find all deprecated methods in the codebase"
- "Show me all beta features (marked with @beta)"
- "Find all code examples in the documentation"

### Example Prompts for Setting Up Documentation

If your project doesn't have TypeDoc configured yet:

**Initial Setup:**
- "Check if TypeDoc is set up in my project at /path/to/project"
- "Help me set up TypeDoc for my TypeScript project"
- "Generate TypeDoc configuration for my project"

**Generating Documentation:**
- "Generate documentation for my TypeScript project"
- "Install TypeDoc and create documentation"
- "My project has JSDoc comments but no generated docs - help me create them"

### Documentation Tools

#### findSymbol
Search for symbols by name with optional kind filtering.

```typescript
// Find all symbols named "MyClass"
findSymbol({ name: "MyClass" })

// Find all classes containing "Service" 
findSymbol({ name: "Service", kind: "class", exact: false })
```

#### getDocumentation
Get complete documentation for a symbol by ID or path.

```typescript
// Get docs by symbol ID
getDocumentation({ symbolId: 123 })

// Get docs by path
getDocumentation({ symbolPath: "MyNamespace.MyClass.myMethod" })
```

#### getMembers
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

#### searchByTag
Find symbols by their JSDoc tags.

```typescript
// Find all deprecated symbols
searchByTag({ tag: "deprecated" })

// Find symbols with specific tag values
searchByTag({ tag: "since", value: "2.0.0" })
```

### Setup Tools

The server includes powerful setup tools that AI assistants can use to help configure TypeDoc for your project:

#### checkTypeDocSetup
Check if TypeDoc is properly installed and configured in a TypeScript project.

```typescript
checkTypeDocSetup({ projectPath: "/path/to/project" })

// Returns status including:
// - TypeDoc installation status
// - Configuration file presence
// - Generated documentation existence
// - Detected source directories
// - Actionable recommendations
```

#### generateTypeDocConfig
Generate a TypeDoc configuration file for a TypeScript project.

```typescript
generateTypeDocConfig({ 
  projectPath: "/path/to/project",
  entryPoints: ["./src"],  // Optional, auto-detected if not provided
  outputPath: "./docs"     // Optional, defaults to "./docs"
})

// Creates typedoc.json with optimal settings
```

#### runTypeDocGeneration
Run TypeDoc to generate documentation for a TypeScript project.

```typescript
runTypeDocGeneration({ 
  projectPath: "/path/to/project",
  install: true,  // Install TypeDoc if not present
  configPath: "./typedoc.json"  // Optional
})

// Installs TypeDoc if needed and generates documentation
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

- `--doc-path`: Path to the TypeDoc JSON file (for existing documentation)
- `--project-path`: Path to TypeScript project directory (for setup tools)
- `--name`: Custom server name (optional)

Examples:
```bash
# Use existing documentation
tsdoc-mcp-server --doc-path /path/to/typedoc.json

# Point to a project (enables setup tools)
tsdoc-mcp-server --project-path /path/to/project

# Start with no arguments (use setup tools via AI)
tsdoc-mcp-server
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.