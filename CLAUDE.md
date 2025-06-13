# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeDoc MCP Server is a Model Context Protocol (MCP) server that exposes TypeDoc-generated documentation to AI agents. It allows AI assistants to search, navigate, and understand TypeScript codebases through their documentation.

## Key Commands

```bash
# Build TypeScript code
npm run build

# Run in development mode with hot reload
npm run dev -- --doc-path ./docs/typedoc.json

# Generate documentation
npm run docs                    # Generate HTML and JSON docs
npm run docs:json              # Generate only JSON output
npm run docs:watch             # Watch mode for documentation

# Code quality
npm run lint                   # Run ESLint
npm run typecheck             # Type checking without emit
npm test                      # Run tests (vitest)

# Start the server
node dist/index.js --doc-path ./docs/typedoc.json
```

## Architecture

### Core Components

1. **Parser Module** (`src/parser/index.ts`)
   - `TypeDocParser` class creates multiple indices for efficient symbol lookup
   - Indices: ID index, name index, path index, kind index
   - Handles the entire TypeDoc JSON structure recursively

2. **MCP Tools** (`src/tools/`)
   - Each tool is a separate module with its own interface
   - Tools operate on the parser instance to query documentation
   - JSON Schema definitions are inline in `src/index.ts` (not using Zod schemas)

3. **Server** (`src/index.ts`)
   - Main entry point that sets up MCP protocol handlers
   - Maps tool calls to tool functions
   - Handles stdio transport for MCP communication

### Critical Configuration

**TypeDoc Configuration** (`typedoc.json`):
- Must use `"entryPointStrategy": "expand"` to generate complete documentation
- Entry point should be `"./src"` directory, not individual files
- This ensures all modules and internal symbols are documented

**MCP Tool Schemas**:
- Tool input schemas must be JSON Schema format, not Zod schemas
- Format: `{ type: 'object', properties: {...}, required: [...] }`
- The MCP SDK expects this specific structure

## Current Development Status

### What We're Currently Doing

We're debugging the MCP server implementation after successfully fixing the TypeDoc JSON generation issue. The server was initially only generating documentation for the root module, which we resolved by:

1. Changing TypeDoc configuration to use `"entryPointStrategy": "expand"`
2. Pointing entry points to `"./src"` directory instead of `"./src/index.ts"`
3. Removing unnecessary exports (we don't need to export everything for documentation)

Now the tools are working correctly and can find symbols, but we're debugging a runtime error in the overview resource.

### Active Debugging Issue

The `typedoc://overview` resource has a runtime error:
```
MCP error -32603: info.readme.substring is not a function
```

This occurs in `src/resources/overview.ts` line 75. The `readme` field from TypeDoc JSON might not be a string in all cases.

**Next debugging steps:**
1. Check the actual type of `info.readme` in the TypeDoc JSON
2. Add type checking before calling `substring()`
3. Handle cases where readme might be undefined, null, or not a string

### Working Features
- ✅ findSymbol tool - searches symbols by name with optional kind filtering
- ✅ getDocumentation tool - retrieves full documentation for a symbol
- ✅ getMembers tool - lists class/interface members
- ✅ searchByTag tool - finds symbols by JSDoc tags

### Testing the MCP Server

1. Build and generate docs:
```bash
npm run build
npm run docs
```

2. Test locally with the self-documenting setup:
```bash
# The .mcp.json file points to our own documentation
node dist/index.js --doc-path ./docs/typedoc.json
```

3. In Claude Desktop, you can test with:
```typescript
// Find the parser class
mcp__typedoc-server__findSymbol({ name: "TypeDocParser", exact: true })

// Get its documentation
mcp__typedoc-server__getDocumentation({ symbolId: <id-from-above> })

// List its members
mcp__typedoc-server__getMembers({ symbolId: <id-from-above> })
```

## Important Implementation Details

1. **Private Member Access**: The `searchByTag` tool accesses private parser members (`parser['index']`). This is a temporary solution - production code should add public iterator methods.

2. **Error Handling**: All tools wrap responses in try-catch blocks and return error messages as text content for graceful degradation.

3. **Path Building**: Symbol paths are built hierarchically (e.g., "MyNamespace.MyClass.myMethod") during index construction for easy navigation.

4. **TypeDoc JSON Structure**: The parser handles nested structures including signatures, type parameters, and inherited members.