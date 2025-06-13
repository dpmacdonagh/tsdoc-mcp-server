/**
 * Get documentation tool for MCP
 * 
 * @packageDocumentation
 * @module tools/get-documentation
 * 
 * @remarks
 * This tool provides comprehensive documentation retrieval for TypeScript symbols,
 * including descriptions, parameters, return types, examples, and metadata.
 */

import { TypeDocParser } from '../parser/index.js';
import { Reflection, Parameter, Signature } from '../types/typedoc.js';

/**
 * Parameters for get documentation function
 */
export interface GetDocumentationParams {
  /** TypeDoc ID of the symbol */
  symbolId?: number;
  /** Full path to the symbol (e.g., "MyClass.myMethod") */
  symbolPath?: string;
}

/**
 * Retrieves complete documentation for a TypeScript symbol
 * 
 * @param parser - The TypeDoc parser instance
 * @param params - Parameters specifying which symbol to document
 * @returns Comprehensive documentation object
 * 
 * @throws Error if the symbol is not found
 * 
 * @remarks
 * This function extracts all available documentation from a TypeScript symbol including:
 * - Basic information (name, kind, description)
 * - Function signatures with parameters and return types
 * - Code examples from @example tags
 * - Metadata (deprecation, version info, access modifiers)
 * - Source file location
 * 
 * @example
 * ```typescript
 * // Get documentation by ID
 * const doc = await getDocumentation(parser, { symbolId: 123 });
 * 
 * // Get documentation by path
 * const methodDoc = await getDocumentation(parser, { 
 *   symbolPath: 'MyClass.myMethod' 
 * });
 * ```
 */
export async function getDocumentation(parser: TypeDocParser, params: GetDocumentationParams) {
  if (params.symbolId === undefined && params.symbolPath === undefined) {
    throw new Error('Either symbolId or symbolPath must be provided');
  }

  let reflection: Reflection | null = null;
  
  if (params.symbolId !== undefined) {
    reflection = parser.getById(params.symbolId);
  } else if (params.symbolPath) {
    const symbol = parser.findByPath(params.symbolPath);
    reflection = symbol?.reflection || null;
  }
  
  if (!reflection) {
    throw new Error('Symbol not found');
  }
  
  const doc: any = {
    name: reflection.name,
    kind: reflection.kindString || 'Unknown',
    description: getDescription(reflection),
  };
  
  // Add examples if present
  const examples = getExamples(reflection);
  if (examples.length > 0) {
    doc.examples = examples;
  }
  
  // For functions/methods, add parameters and return type
  if (reflection.signatures && reflection.signatures.length > 0) {
    const signature = reflection.signatures[0];
    
    if (signature.parameters) {
      doc.parameters = signature.parameters.map(p => ({
        name: p.name,
        type: getTypeString(p.type),
        description: getDescription(p),
        optional: p.flags?.isOptional || false,
        default: p.defaultValue,
      }));
    }
    
    if (signature.type) {
      doc.returns = {
        type: getTypeString(signature.type),
        description: getReturnsDescription(signature),
      };
    }
  }
  
  // Add deprecation info
  const deprecated = getTagContent(reflection, 'deprecated');
  if (deprecated) {
    doc.deprecated = deprecated;
  }
  
  // Add since info
  const since = getTagContent(reflection, 'since');
  if (since) {
    doc.since = since;
  }
  
  // Add access modifier
  if (reflection.flags) {
    if (reflection.flags.isPrivate) doc.access = 'private';
    else if (reflection.flags.isProtected) doc.access = 'protected';
    else doc.access = 'public';
  }
  
  // Add source location
  if (reflection.sources && reflection.sources.length > 0) {
    const source = reflection.sources[0];
    doc.source = {
      fileName: source.fileName,
      line: source.line,
      url: source.url,
    };
  }
  
  return doc;
}

/**
 * Extracts description from a reflection's comment
 * 
 * @param reflection - The reflection or parameter to get description from
 * @returns The description text or empty string
 * 
 * @internal
 */
function getDescription(reflection: Reflection | Parameter): string {
  if (!reflection.comment) return '';
  
  const parts: string[] = [];
  
  if (reflection.comment.summary) {
    parts.push(reflection.comment.summary.map(p => p.text).join(''));
  }
  
  return parts.join('\n').trim();
}

/**
 * Extracts example code blocks from a reflection
 * 
 * @param reflection - The reflection to extract examples from
 * @returns Array of example code strings
 * 
 * @internal
 */
function getExamples(reflection: Reflection): string[] {
  if (!reflection.comment?.blockTags) return [];
  
  return reflection.comment.blockTags
    .filter(tag => tag.tag === '@example')
    .map(tag => tag.content.map(p => p.text).join('').trim());
}

/**
 * Gets content of a specific documentation tag
 * 
 * @param reflection - The reflection to search in
 * @param tagName - Tag name without @ prefix
 * @returns Tag content or undefined if not found
 * 
 * @internal
 */
function getTagContent(reflection: Reflection, tagName: string): string | undefined {
  if (!reflection.comment?.blockTags) return undefined;
  
  const tag = reflection.comment.blockTags.find(t => t.tag === `@${tagName}`);
  if (!tag) return undefined;
  
  return tag.content.map(p => p.text).join('').trim();
}

/**
 * Extracts return value description from a signature
 * 
 * @param signature - The signature to extract from
 * @returns Return description or empty string
 * 
 * @internal
 */
function getReturnsDescription(signature: Signature): string {
  if (!signature.comment?.blockTags) return '';
  
  const returnsTag = signature.comment.blockTags.find(t => t.tag === '@returns');
  if (!returnsTag) return '';
  
  return returnsTag.content.map(p => p.text).join('').trim();
}

/**
 * Converts TypeDoc type objects to readable strings
 * 
 * @param type - The type object to convert
 * @returns Human-readable type string
 * 
 * @remarks
 * Handles various TypeScript type constructs including:
 * - Primitive types (string, number, boolean, etc.)
 * - Reference types (classes, interfaces)
 * - Array types
 * - Union and intersection types
 * - Literal types
 * - Object types
 * 
 * @internal
 */
function getTypeString(type: any): string {
  if (!type) return 'any';
  
  switch (type.type) {
    case 'intrinsic':
      return type.name || 'any';
    case 'reference':
      return type.name || 'unknown';
    case 'array':
      return `${getTypeString(type.elementType)}[]`;
    case 'union':
      return type.types?.map(getTypeString).join(' | ') || 'unknown';
    case 'intersection':
      return type.types?.map(getTypeString).join(' & ') || 'unknown';
    case 'literal':
      return JSON.stringify(type.value);
    case 'reflection':
      return 'object';
    default:
      return type.name || 'unknown';
  }
}