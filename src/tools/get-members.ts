/**
 * Get members tool for MCP
 * 
 * @packageDocumentation
 * @module tools/get-members
 * 
 * @remarks
 * This tool provides functionality to list all members (properties and methods)
 * of classes and interfaces, with filtering and inheritance options.
 */

import { TypeDocParser } from '../parser/index.js';
import { Reflection, ReflectionKind } from '../types/typedoc.js';

/**
 * Parameters for get members function
 */
export interface GetMembersParams {
  /** TypeDoc ID of the class or interface */
  symbolId: number;
  /** Filter by member type */
  memberType?: 'property' | 'method' | 'all';
  /** Include inherited members */
  includeInherited?: boolean;
}

/**
 * Gets all members of a class or interface
 * 
 * @param parser - The TypeDoc parser instance
 * @param params - Parameters for member retrieval
 * @returns Object containing array of members
 * 
 * @throws Error if symbol not found or not a class/interface
 * 
 * @remarks
 * This function retrieves all members of a class or interface with:
 * - Filtering by member type (properties, methods, or all)
 * - Optional inclusion of inherited members
 * - Complete member metadata including types, modifiers, and descriptions
 * 
 * @example
 * ```typescript
 * // Get all members of a class
 * const allMembers = await getMembers(parser, { symbolId: 123 });
 * 
 * // Get only methods, including inherited ones
 * const methods = await getMembers(parser, { 
 *   symbolId: 123,
 *   memberType: 'method',
 *   includeInherited: true
 * });
 * ```
 */
export async function getMembers(parser: TypeDocParser, params: GetMembersParams) {
  const reflection = parser.getById(params.symbolId);
  
  if (!reflection) {
    throw new Error('Symbol not found');
  }
  
  if (reflection.kind !== ReflectionKind.Class && reflection.kind !== ReflectionKind.Interface) {
    throw new Error('Symbol must be a class or interface');
  }
  
  const memberType = params.memberType ?? 'all';
  const includeInherited = params.includeInherited ?? false;
  const members: any[] = [];
  
  if (reflection.children) {
    for (const child of reflection.children) {
      // Filter by member type
      if (memberType !== 'all') {
        if (memberType === 'property' && child.kind !== ReflectionKind.Property) continue;
        if (memberType === 'method' && child.kind !== ReflectionKind.Method) continue;
      }
      
      // Skip inherited members if not requested
      if (!includeInherited && child.inheritedFrom) continue;
      
      const member = {
        name: child.name,
        kind: child.kindString || getKindString(child.kind),
        type: getTypeString(child),
        access: getAccessLevel(child),
        static: child.flags?.isStatic || false,
        abstract: child.flags?.isAbstract || false,
        optional: child.flags?.isOptional || false,
        readonly: child.flags?.isReadonly || false,
        inherited: !!child.inheritedFrom,
        inheritedFrom: child.inheritedFrom ? getInheritedFromString(child.inheritedFrom) : undefined,
        description: getDescription(child),
      };
      
      members.push(member);
    }
  }
  
  return { members };
}

/**
 * Converts reflection kind to human-readable string
 * 
 * @param kind - Numeric reflection kind
 * @returns Human-readable kind string
 * 
 * @internal
 */
function getKindString(kind: number): string {
  switch (kind) {
    case ReflectionKind.Property: return 'property';
    case ReflectionKind.Method: return 'method';
    case ReflectionKind.Accessor: return 'accessor';
    default: return 'unknown';
  }
}

/**
 * Determines access level of a member
 * 
 * @param reflection - The member reflection
 * @returns Access level string (public, protected, or private)
 * 
 * @internal
 */
function getAccessLevel(reflection: Reflection): string {
  if (reflection.flags?.isPrivate) return 'private';
  if (reflection.flags?.isProtected) return 'protected';
  return 'public';
}

/**
 * Gets the type string for a member
 * 
 * @param reflection - The member reflection
 * @returns Type string representation
 * 
 * @remarks
 * For properties, returns the type directly.
 * For methods, returns the full signature including parameters and return type.
 * 
 * @internal
 */
function getTypeString(reflection: Reflection): string {
  if (reflection.type) {
    return formatType(reflection.type);
  }
  
  if (reflection.signatures && reflection.signatures.length > 0) {
    const sig = reflection.signatures[0];
    const params = sig.parameters?.map(p => `${p.name}: ${formatType(p.type)}`).join(', ') || '';
    const returnType = formatType(sig.type);
    return `(${params}) => ${returnType}`;
  }
  
  return 'unknown';
}

/**
 * Formats a type object into a readable string
 * 
 * @param type - The type object to format
 * @returns Formatted type string
 * 
 * @internal
 */
function formatType(type: any): string {
  if (!type) return 'any';
  
  switch (type.type) {
    case 'intrinsic':
      return type.name || 'any';
    case 'reference':
      return type.name || 'unknown';
    case 'array':
      return `${formatType(type.elementType)}[]`;
    case 'union':
      return type.types?.map(formatType).join(' | ') || 'unknown';
    case 'intersection':
      return type.types?.map(formatType).join(' & ') || 'unknown';
    case 'literal':
      return JSON.stringify(type.value);
    default:
      return type.name || 'unknown';
  }
}

/**
 * Extracts the inherited from information as a string
 * 
 * @param inheritedFrom - The inherited from object
 * @returns Name of the parent class/interface
 * 
 * @internal
 */
function getInheritedFromString(inheritedFrom: any): string {
  if (typeof inheritedFrom === 'object' && inheritedFrom.name) {
    return inheritedFrom.name;
  }
  return 'unknown';
}

/**
 * Extracts description from a member's comment
 * 
 * @param reflection - The member reflection
 * @returns Description text or empty string
 * 
 * @internal
 */
function getDescription(reflection: Reflection): string {
  if (!reflection.comment?.summary) return '';
  return reflection.comment.summary.map(p => p.text).join('').trim();
}