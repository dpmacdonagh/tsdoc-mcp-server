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

### Latest Updates (2025-01-13)

The TypeDoc MCP Server is now fully functional with automated setup capabilities:

1. **Fixed Overview Resource** - The `readme` field is now correctly handled as an array of `CommentDisplayPart` objects
2. **Added Setup Tools** - Three new tools for automated TypeDoc configuration:
   - `checkTypeDocSetup` - Detects TypeDoc installation and configuration
   - `generateTypeDocConfig` - Creates optimal typedoc.json files
   - `runTypeDocGeneration` - Installs TypeDoc and generates documentation
3. **Lazy Loading** - Documentation loads on-demand, not at startup
4. **Auto-Detection** - When using `--project-path`, the server automatically finds generated docs

### All Features Working
- ✅ findSymbol tool - searches symbols by name with optional kind filtering
- ✅ getDocumentation tool - retrieves full documentation for a symbol
- ✅ getMembers tool - lists class/interface members with inheritance
- ✅ searchByTag tool - finds symbols by JSDoc tags
- ✅ checkTypeDocSetup tool - checks TypeDoc installation status
- ✅ generateTypeDocConfig tool - creates TypeDoc configuration
- ✅ runTypeDocGeneration tool - runs TypeDoc generation
- ✅ Overview resource - provides project statistics and information

### Key Implementation Details

1. **Zero Automatic Actions**: The server never does anything automatically on startup - all actions are initiated through tool calls
2. **Smart Path Detection**: When using `--project-path`, the server looks for docs in common locations (./docs/typedoc.json, etc.)
3. **Immediate Availability**: After generating docs with `runTypeDocGeneration`, they're immediately available without restart

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