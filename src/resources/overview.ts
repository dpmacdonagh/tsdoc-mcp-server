/**
 * Project overview resource for MCP
 * 
 * @packageDocumentation
 * @module resources/overview
 * 
 * @remarks
 * This module provides a resource that gives AI agents a high-level overview
 * of the documented TypeScript project, including statistics and metadata.
 */

import { TypeDocParser } from '../parser/index.js';
import { CommentDisplayPart } from '../types/typedoc.js';

/**
 * Formats readme content from CommentDisplayPart array to plain text
 * 
 * @param readme - Array of comment display parts
 * @param maxLength - Maximum length of the output string
 * @returns Formatted readme text, truncated if necessary
 * 
 * @internal
 */
function formatReadme(readme: CommentDisplayPart[], maxLength: number): string {
  // Concatenate all text parts
  const fullText = readme.map(part => part.text).join('');
  
  // Truncate if necessary
  if (fullText.length > maxLength) {
    return fullText.substring(0, maxLength) + '...';
  }
  
  return fullText;
}

/**
 * Gets a comprehensive overview of the documented project
 * 
 * @param parser - The TypeDoc parser instance with loaded documentation
 * @returns MCP resource object containing project overview
 * 
 * @remarks
 * This function creates an MCP resource that provides:
 * - Project name and version
 * - Brief description from README
 * - Statistics about documented symbols (classes, interfaces, functions, etc.)
 * 
 * This overview helps AI agents understand the scope and structure of the
 * codebase before diving into specific symbols.
 * 
 * @example
 * ```typescript
 * const parser = new TypeDocParser('./docs/typedoc.json');
 * await parser.parse();
 * 
 * const overview = await getProjectOverview(parser);
 * console.log(`Project: ${overview.content.name}`);
 * console.log(`Classes: ${overview.content.stats.classes}`);
 * ```
 * 
 * @see {@link https://modelcontextprotocol.io/docs/concepts/resources | MCP Resources}
 */
export async function getProjectOverview(parser: TypeDocParser) {
  const info = parser.getProjectInfo();
  const stats = parser.getStats();
  
  return {
    /**
     * Resource URI following MCP convention
     * @internal
     */
    uri: 'typedoc://overview',
    
    /**
     * Human-readable resource name
     * @internal
     */
    name: 'Project Overview',
    
    /**
     * MIME type for the resource content
     * @internal
     */
    mimeType: 'application/json',
    
    /**
     * The actual overview content
     */
    content: {
      /** Project name from package.json or TypeDoc configuration */
      name: info?.name || 'Unknown Project',
      
      /** Project version from package.json */
      version: info?.version,
      
      /** Truncated README content for brief description */
      description: info?.readme ? formatReadme(info.readme, 500) : undefined,
      
      /** Statistics about documented symbols */
      stats: {
        /** Total number of documented symbols */
        totalSymbols: stats.total,
        /** Number of modules/namespaces */
        modules: stats.modules,
        /** Number of classes */
        classes: stats.classes,
        /** Number of interfaces */
        interfaces: stats.interfaces,
        /** Number of functions */
        functions: stats.functions,
        /** Number of type aliases */
        types: stats.types,
        /** Number of enums */
        enums: stats.enums,
        /** Number of variables */
        variables: stats.variables,
      },
    },
  };
}