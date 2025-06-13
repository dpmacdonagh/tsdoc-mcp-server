/**
 * Find symbol tool for MCP
 * 
 * @packageDocumentation
 * @module tools/find-symbol
 * 
 * @remarks
 * This tool provides symbol search functionality for TypeDoc documentation,
 * allowing AI agents to find classes, interfaces, functions, and other symbols
 * by name with optional kind filtering.
 */

import { TypeDocParser } from '../parser/index.js';
import { ReflectionKind } from '../types/typedoc.js';

/**
 * Parameters for find symbol function
 */
export interface FindSymbolParams {
  /** Symbol name to search for */
  name: string;
  /** Filter by symbol kind */
  kind?: 'class' | 'interface' | 'function' | 'type' | 'enum' | 'variable';
  /** Use exact match (true) or partial match (false) */
  exact?: boolean;
}

/**
 * Mapping from human-readable kinds to TypeDoc reflection kinds
 * 
 * @internal
 */
const kindMap: Record<string, ReflectionKind> = {
  class: ReflectionKind.Class,
  interface: ReflectionKind.Interface,
  function: ReflectionKind.Function,
  type: ReflectionKind.TypeAlias,
  enum: ReflectionKind.Enum,
  variable: ReflectionKind.Variable,
};

/**
 * Finds symbols in TypeDoc documentation by name
 * 
 * @param parser - The TypeDoc parser instance
 * @param params - Search parameters
 * @returns Object containing array of matching symbols
 * 
 * @remarks
 * This function searches for TypeScript symbols by name with support for:
 * - Exact or partial matching (case-insensitive for partial)
 * - Optional filtering by symbol kind (class, interface, function, etc.)
 * - Source file location information when available
 * 
 * @example
 * ```typescript
 * // Find all symbols named "MyClass"
 * const result = await findSymbol(parser, { name: 'MyClass' });
 * 
 * // Find all classes containing "Service"
 * const services = await findSymbol(parser, {
 *   name: 'Service',
 *   kind: 'class',
 *   exact: false
 * });
 * ```
 */
export async function findSymbol(parser: TypeDocParser, params: FindSymbolParams) {
  const exact = params.exact ?? true;
  let symbols = parser.findByName(params.name, exact);
  
  // Filter by kind if specified
  if (params.kind && symbols.length > 0) {
    const targetKind = kindMap[params.kind];
    symbols = symbols.filter(s => s.reflection.kind === targetKind);
  }
  
  return {
    symbols: symbols.map(s => ({
      name: s.name,
      kind: s.kind,
      path: s.path,
      id: s.id,
      source: s.reflection.sources?.[0] ? {
        fileName: s.reflection.sources[0].fileName,
        line: s.reflection.sources[0].line,
      } : undefined,
    })),
  };
}