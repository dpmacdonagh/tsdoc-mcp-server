/**
 * MCP tools for TypeDoc documentation
 * 
 * @packageDocumentation
 * @module tools
 * 
 * @remarks
 * This module exports all available MCP tools for interacting with TypeDoc documentation.
 * Each tool provides specific functionality for AI agents to query and understand TypeScript code.
 * 
 * Available tools:
 * - {@link findSymbol} - Search for symbols by name and kind
 * - {@link getDocumentation} - Retrieve complete documentation for a symbol
 * - {@link getMembers} - List members of classes and interfaces
 * - {@link searchByTag} - Find symbols by their documentation tags
 * - {@link checkTypeDocSetupTool} - Check TypeDoc installation and configuration status
 */

export * from './find-symbol.js';
export * from './get-documentation.js';
export * from './get-members.js';
export * from './search-by-tag.js';
export * from './check-setup.js';
export * from './generate-config.js';
export * from './run-generation.js';