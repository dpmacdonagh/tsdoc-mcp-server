/**
 * TypeDoc JSON parser module
 * 
 * @packageDocumentation
 * @module parser
 * 
 * @remarks
 * This module provides the core parsing functionality for TypeDoc JSON files.
 * It creates multiple indices for efficient symbol lookup and navigation.
 */

import { promises as fs } from 'fs';
import { TypeDocJSON, Reflection, ReflectionKind } from '../types/typedoc.js';

/**
 * Parsed symbol with metadata
 * 
 * @remarks
 * This interface represents a symbol that has been parsed and indexed,
 * including its full path and a reference to the original reflection data.
 */
export interface ParsedSymbol {
  /** TypeDoc ID of the symbol */
  id: number;
  /** Symbol name */
  name: string;
  /** Human-readable kind (e.g., "Class", "Interface") */
  kind: string;
  /** Full dot-separated path (e.g., "MyNamespace.MyClass.myMethod") */
  path: string;
  /** Original reflection data */
  reflection: Reflection;
}

/**
 * TypeDoc JSON parser with multi-index support
 * 
 * @remarks
 * The parser creates multiple indices for efficient symbol lookup:
 * - ID index for direct access
 * - Name index for searching by symbol name
 * - Path index for hierarchical navigation
 * - Kind index for filtering by symbol type
 * 
 * @example
 * ```typescript
 * const parser = new TypeDocParser('./docs/typedoc.json');
 * await parser.parse();
 * 
 * // Find all classes
 * const classes = parser.findByKind(ReflectionKind.Class);
 * 
 * // Find symbol by name
 * const symbols = parser.findByName('MyClass');
 * 
 * // Get symbol by path
 * const method = parser.findByPath('MyClass.myMethod');
 * ```
 */
export class TypeDocParser {
  /** Main index mapping IDs to reflections */
  private index = new Map<number, Reflection>();
  /** Index mapping names to arrays of IDs (multiple symbols can have same name) */
  private nameIndex = new Map<string, number[]>();
  /** Index mapping full paths to IDs (paths are unique) */
  private pathIndex = new Map<string, number>();
  /** Index mapping reflection kinds to arrays of IDs */
  private kindIndex = new Map<number, number[]>();
  /** Parsed TypeDoc JSON document */
  private doc: TypeDocJSON | null = null;

  /**
   * Creates a new TypeDoc parser
   * 
   * @param docPath - Path to TypeDoc JSON file
   */
  constructor(private docPath: string) {}

  /**
   * Parses the TypeDoc JSON file and builds indices
   * 
   * @remarks
   * This method reads the JSON file, validates it, and builds multiple
   * indices for efficient symbol lookup. Must be called before using
   * any search methods.
   * 
   * @throws Error if the file cannot be read or parsed
   * 
   * @example
   * ```typescript
   * const parser = new TypeDocParser('./docs/typedoc.json');
   * try {
   *   await parser.parse();
   *   console.log('Documentation loaded successfully');
   * } catch (error) {
   *   console.error('Failed to parse documentation:', error);
   * }
   * ```
   */
  async parse(): Promise<void> {
    const content = await fs.readFile(this.docPath, 'utf-8');
    this.doc = JSON.parse(content);
    
    if (!this.doc) {
      throw new Error('Failed to parse TypeDoc JSON');
    }

    // Build indices
    this.buildIndex(this.doc as Reflection, '');
  }

  /**
   * Recursively builds indices for all reflections
   * 
   * @param node - Current reflection node
   * @param parentPath - Path of parent node
   * 
   * @internal
   */
  private buildIndex(node: Reflection, parentPath: string): void {
    // Add to main index
    this.index.set(node.id, node);

    // Build full path
    const fullPath = parentPath ? `${parentPath}.${node.name}` : node.name;
    
    // Add to path index
    this.pathIndex.set(fullPath, node.id);

    // Add to name index
    const nameIds = this.nameIndex.get(node.name) || [];
    nameIds.push(node.id);
    this.nameIndex.set(node.name, nameIds);

    // Add to kind index
    if (node.kind) {
      const kindIds = this.kindIndex.get(node.kind) || [];
      kindIds.push(node.id);
      this.kindIndex.set(node.kind, kindIds);
    }

    // Recursively index children
    if (node.children) {
      for (const child of node.children) {
        this.buildIndex(child, fullPath);
      }
    }

    // Index signatures
    if (node.signatures) {
      for (const signature of node.signatures) {
        this.buildIndex(signature as Reflection, fullPath);
      }
    }
  }

  /**
   * Finds symbols by name
   * 
   * @param name - Symbol name to search for
   * @param exact - Whether to use exact match (default: true)
   * @returns Array of matching symbols
   * 
   * @example
   * ```typescript
   * // Exact match
   * const symbols = parser.findByName('MyClass');
   * 
   * // Partial match (case-insensitive)
   * const partialMatches = parser.findByName('my', false);
   * ```
   */
  findByName(name: string, exact = true): ParsedSymbol[] {
    const results: ParsedSymbol[] = [];
    
    if (exact) {
      const ids = this.nameIndex.get(name) || [];
      for (const id of ids) {
        const reflection = this.index.get(id);
        if (reflection) {
          results.push(this.createParsedSymbol(reflection));
        }
      }
    } else {
      // Partial match
      for (const [symbolName, ids] of this.nameIndex) {
        if (symbolName.toLowerCase().includes(name.toLowerCase())) {
          for (const id of ids) {
            const reflection = this.index.get(id);
            if (reflection) {
              results.push(this.createParsedSymbol(reflection));
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Finds a symbol by its full path
   * 
   * @param path - Dot-separated path (e.g., "MyNamespace.MyClass.myMethod")
   * @returns The symbol if found, null otherwise
   * 
   * @example
   * ```typescript
   * const method = parser.findByPath('MyClass.myMethod');
   * if (method) {
   *   console.log(`Found ${method.kind}: ${method.name}`);
   * }
   * ```
   */
  findByPath(path: string): ParsedSymbol | null {
    const id = this.pathIndex.get(path);
    if (!id) return null;
    
    const reflection = this.index.get(id);
    if (!reflection) return null;
    
    return this.createParsedSymbol(reflection);
  }

  /**
   * Finds all symbols of a specific kind
   * 
   * @param kind - The reflection kind to filter by
   * @returns Array of symbols matching the specified kind
   * 
   * @example
   * ```typescript
   * // Find all classes
   * const classes = parser.findByKind(ReflectionKind.Class);
   * 
   * // Find all interfaces
   * const interfaces = parser.findByKind(ReflectionKind.Interface);
   * ```
   */
  findByKind(kind: ReflectionKind): ParsedSymbol[] {
    const ids = this.kindIndex.get(kind) || [];
    const results: ParsedSymbol[] = [];
    
    for (const id of ids) {
      const reflection = this.index.get(id);
      if (reflection) {
        results.push(this.createParsedSymbol(reflection));
      }
    }
    
    return results;
  }

  /**
   * Gets a reflection by its ID
   * 
   * @param id - TypeDoc ID
   * @returns The reflection if found, null otherwise
   * 
   * @example
   * ```typescript
   * const reflection = parser.getById(123);
   * if (reflection) {
   *   console.log(`Found: ${reflection.name}`);
   * }
   * ```
   */
  getById(id: number): Reflection | null {
    return this.index.get(id) || null;
  }

  /**
   * Gets basic project information
   * 
   * @returns Project metadata or null if not parsed
   * 
   * @example
   * ```typescript
   * const info = parser.getProjectInfo();
   * console.log(`Project: ${info.name} v${info.version}`);
   * ```
   */
  getProjectInfo() {
    if (!this.doc) return null;
    
    return {
      name: this.doc.name,
      version: this.doc.packageVersion,
      readme: this.doc.readme,
    };
  }

  /**
   * Gets statistics about the parsed documentation
   * 
   * @returns Object containing counts of different symbol types
   * 
   * @example
   * ```typescript
   * const stats = parser.getStats();
   * console.log(`Total symbols: ${stats.total}`);
   * console.log(`Classes: ${stats.classes}`);
   * console.log(`Interfaces: ${stats.interfaces}`);
   * ```
   */
  getStats() {
    const stats = {
      total: this.index.size,
      classes: this.kindIndex.get(ReflectionKind.Class)?.length || 0,
      interfaces: this.kindIndex.get(ReflectionKind.Interface)?.length || 0,
      functions: this.kindIndex.get(ReflectionKind.Function)?.length || 0,
      variables: this.kindIndex.get(ReflectionKind.Variable)?.length || 0,
      types: this.kindIndex.get(ReflectionKind.TypeAlias)?.length || 0,
      enums: this.kindIndex.get(ReflectionKind.Enum)?.length || 0,
      modules: this.kindIndex.get(ReflectionKind.Module)?.length || 0,
    };
    
    return stats;
  }

  /**
   * Creates a ParsedSymbol from a Reflection
   * 
   * @param reflection - The reflection to convert
   * @returns ParsedSymbol with metadata
   * 
   * @internal
   */
  private createParsedSymbol(reflection: Reflection): ParsedSymbol {
    const path = this.getPath(reflection);
    return {
      id: reflection.id,
      name: reflection.name,
      kind: reflection.kindString || this.getKindString(reflection.kind),
      path,
      reflection,
    };
  }

  /**
   * Gets the full path for a reflection
   * 
   * @param reflection - The reflection to get path for
   * @returns Full dot-separated path
   * 
   * @internal
   */
  private getPath(reflection: Reflection): string {
    // Find path by looking up in pathIndex
    for (const [path, id] of this.pathIndex) {
      if (id === reflection.id) {
        return path;
      }
    }
    return reflection.name;
  }

  /**
   * Converts numeric kind to human-readable string
   * 
   * @param kind - Numeric reflection kind
   * @returns Human-readable kind string
   * 
   * @internal
   */
  private getKindString(kind: number): string {
    const kindMap: Record<number, string> = {
      [ReflectionKind.Module]: 'Module',
      [ReflectionKind.Namespace]: 'Namespace',
      [ReflectionKind.Enum]: 'Enum',
      [ReflectionKind.Variable]: 'Variable',
      [ReflectionKind.Function]: 'Function',
      [ReflectionKind.Class]: 'Class',
      [ReflectionKind.Interface]: 'Interface',
      [ReflectionKind.Constructor]: 'Constructor',
      [ReflectionKind.Property]: 'Property',
      [ReflectionKind.Method]: 'Method',
      [ReflectionKind.TypeAlias]: 'Type alias',
    };
    
    return kindMap[kind] || 'Unknown';
  }
}