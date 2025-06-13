/**
 * TypeDoc JSON output type definitions
 * 
 * @packageDocumentation
 * @module types/typedoc
 * 
 * @remarks
 * This module contains TypeScript interfaces that map to TypeDoc's JSON output format.
 * These types are essential for parsing and understanding TypeDoc-generated documentation.
 * 
 * @see {@link https://typedoc.org/api/modules/JSONOutput.html | TypeDoc JSONOutput API}
 */

/**
 * Root TypeDoc JSON structure representing an entire TypeScript project
 * 
 * @remarks
 * This is the top-level structure returned when TypeDoc generates JSON output.
 * It contains all the documentation data for a TypeScript project.
 * 
 * @example
 * ```typescript
 * import { TypeDocJSON } from './types/typedoc';
 * 
 * const docData: TypeDocJSON = JSON.parse(fs.readFileSync('typedoc.json', 'utf-8'));
 * console.log(`Project: ${docData.name} v${docData.packageVersion}`);
 * ```
 */
export interface TypeDocJSON {
  /** The name of the documented project */
  name: string;
  /** Unique identifier for this reflection */
  id: number;
  /** Numeric kind identifier (see {@link ReflectionKind}) */
  kind: number;
  /** Human-readable kind string (e.g., "Module", "Class") */
  kindString?: string;
  /** Reflection flags indicating visibility and modifiers */
  flags?: Flags;
  /** Child reflections (modules, classes, functions, etc.) */
  children?: Reflection[];
  /** Grouped organization of children by kind */
  groups?: Group[];
  /** Source file information */
  sources?: Source[];
  /** Documentation comment data */
  comment?: Comment;
  /** README content if available */
  readme?: CommentDisplayPart[];
  /** Version from package.json */
  packageVersion?: string;
  /** Name from package.json */
  packageName?: string;
}

/**
 * Core reflection interface representing any documented TypeScript symbol
 * 
 * @remarks
 * This is the fundamental building block of TypeDoc's JSON output.
 * Every documented element (class, interface, function, property, etc.) 
 * is represented as a Reflection.
 * 
 * @example
 * ```typescript
 * function processReflection(ref: Reflection) {
 *   console.log(`${ref.name} (${ref.kindString})`);
 *   if (ref.children) {
 *     ref.children.forEach(child => processReflection(child));
 *   }
 * }
 * ```
 */
export interface Reflection {
  /** Unique numeric identifier for this reflection */
  id: number;
  /** The name of the symbol */
  name: string;
  /** Numeric kind identifier (see {@link ReflectionKind}) */
  kind: number;
  /** Human-readable kind string */
  kindString?: string;
  /** Reflection flags for modifiers and visibility */
  flags?: Flags;
  /** Child reflections (e.g., class members) */
  children?: Reflection[];
  /** Grouped organization of children */
  groups?: Group[];
  /** Source file locations */
  sources?: Source[];
  /** Documentation comment */
  comment?: Comment;
  /** Type information */
  type?: Type;
  /** Function/method signatures */
  signatures?: Signature[];
  /** Types this reflection extends */
  extendedTypes?: Type[];
  /** Interfaces this reflection implements */
  implementedTypes?: Type[];
  /** Generic type parameters */
  typeParameters?: TypeParameter[];
  /** Function/constructor parameters */
  parameters?: Parameter[];
  /** Default value as string */
  defaultValue?: string;
  /** Type this reflection overwrites */
  overwrites?: Type;
  /** Type this reflection inherits from */
  inheritedFrom?: Type;
  /** Types that extend this reflection */
  extendedBy?: Type[];
  /** Types that implement this reflection */
  implementedBy?: Type[];
  /** Getter signature for properties */
  getSignature?: Signature;
  /** Setter signature for properties */
  setSignature?: Signature;
  /** Index signature for indexed types */
  indexSignature?: Signature;
  /** Variant discriminator */
  variant?: 'declaration' | 'signature';
}

/**
 * Flags indicating various modifiers and visibility levels
 * 
 * @remarks
 * These boolean flags provide information about access modifiers,
 * static members, abstract classes, and other TypeScript features.
 * 
 * @example
 * ```typescript
 * if (reflection.flags?.isPrivate) {
 *   console.log('This is a private member');
 * }
 * ```
 */
export interface Flags {
  /** Indicates private visibility */
  isPrivate?: boolean;
  /** Indicates protected visibility */
  isProtected?: boolean;
  /** Indicates public visibility */
  isPublic?: boolean;
  /** Indicates static member */
  isStatic?: boolean;
  /** Indicates exported symbol */
  isExported?: boolean;
  /** Indicates external declaration */
  isExternal?: boolean;
  /** Indicates optional parameter/property */
  isOptional?: boolean;
  /** Indicates rest parameter */
  isRest?: boolean;
  /** Indicates abstract class/member */
  isAbstract?: boolean;
  /** Indicates const declaration */
  isConst?: boolean;
  /** Indicates readonly property */
  isReadonly?: boolean;
}

/**
 * Grouping structure for organizing reflections by kind
 * 
 * @remarks
 * Groups help organize large numbers of reflections into logical sections
 * like "Classes", "Interfaces", "Functions", etc.
 */
export interface Group {
  /** Group title (e.g., "Classes", "Functions") */
  title: string;
  /** Optional categories within the group */
  categories?: Category[];
  /** IDs of reflections in this group */
  children?: number[];
}

/**
 * Category within a group for further organization
 */
export interface Category {
  /** Category title */
  title: string;
  /** IDs of reflections in this category */
  children?: number[];
}

/**
 * Source file location information
 * 
 * @remarks
 * Provides exact location in source files where symbols are defined,
 * useful for generating source links in documentation.
 * 
 * @example
 * ```typescript
 * const source = reflection.sources?.[0];
 * if (source) {
 *   console.log(`Defined in ${source.fileName}:${source.line}`);
 * }
 * ```
 */
export interface Source {
  /** Relative path to source file */
  fileName: string;
  /** Line number (1-based) */
  line: number;
  /** Character position on line (0-based) */
  character: number;
  /** Optional URL to source (e.g., GitHub) */
  url?: string;
}

/**
 * Documentation comment structure
 * 
 * @remarks
 * Represents parsed TSDoc/JSDoc comments with support for
 * summary text, block tags, and modifier tags.
 */
export interface Comment {
  /** Summary text parts */
  summary?: CommentDisplayPart[];
  /** Block tags like @param, @returns, @example */
  blockTags?: CommentTag[];
  /** Modifier tags like @public, @readonly */
  modifierTags?: string[];
}

/**
 * Part of a comment's text content
 * 
 * @remarks
 * Comments are broken into parts to preserve formatting
 * and handle different content types (text, code, links).
 */
export interface CommentDisplayPart {
  /** Kind of content (e.g., "text", "code") */
  kind: string;
  /** The actual text content */
  text: string;
}

/**
 * TSDoc/JSDoc tag within a comment
 * 
 * @example
 * ```typescript
 * // Represents tags like:
 * // @param name - The user's name
 * // @returns The greeting message
 * ```
 */
export interface CommentTag {
  /** Tag name (e.g., "@param", "@returns") */
  tag: string;
  /** Tag content parts */
  content: CommentDisplayPart[];
  /** Parameter name for @param tags */
  name?: string;
}

/**
 * Type representation in TypeDoc
 * 
 * @remarks
 * This interface represents TypeScript types in all their complexity,
 * including primitives, references, unions, intersections, and more.
 * 
 * @example
 * ```typescript
 * function formatType(type: Type): string {
 *   switch (type.type) {
 *     case 'intrinsic': return type.name || 'any';
 *     case 'reference': return type.name || 'unknown';
 *     case 'array': return `${formatType(type.elementType)}[]`;
 *     default: return 'unknown';
 *   }
 * }
 * ```
 */
export interface Type {
  /** Type kind (e.g., "intrinsic", "reference", "union") */
  type: string;
  /** Type name */
  name?: string;
  /** Reference ID for named types */
  id?: number;
  /** Type arguments for generics */
  typeArguments?: Type[];
  /** Component types for unions/intersections */
  types?: Type[];
  /** Element type for arrays */
  elementType?: Type;
  /** Literal value */
  value?: string;
  /** Target type reference */
  target?: number | Type;
  /** Package name for external types */
  package?: string;
  /** Type parameter constraint */
  constraint?: Type;
  /** Conditional type structure */
  conditionalType?: ConditionalType;
  /** Index type for keyof */
  indexType?: Type;
  /** Object type for typeof */
  objectType?: Type;
  /** Inline type declaration */
  declaration?: Reflection;
  /** Type operator (e.g., "keyof", "typeof") */
  operator?: string;
  /** Target type for operators */
  targetType?: Type;
  /** Check type for conditionals */
  checkType?: Type;
  /** Extends type for conditionals */
  extendsType?: Type;
  /** True branch of conditional */
  trueType?: Type;
  /** False branch of conditional */
  falseType?: Type;
}

/**
 * Conditional type structure (T extends U ? X : Y)
 * 
 * @example
 * ```typescript
 * type IsString<T> = T extends string ? true : false;
 * ```
 */
export interface ConditionalType {
  /** The type being checked (T) */
  checkType: Type;
  /** The constraint type (U) */
  extendsType: Type;
  /** Type if condition is true (X) */
  trueType: Type;
  /** Type if condition is false (Y) */
  falseType: Type;
}

/**
 * Function or method signature
 * 
 * @remarks
 * Represents the signature of functions, methods, constructors,
 * and other callable symbols including their parameters and return types.
 */
export interface Signature {
  /** Unique identifier */
  id: number;
  /** Signature name */
  name: string;
  /** Always 'signature' for signatures */
  variant: 'signature';
  /** Numeric kind identifier */
  kind: number;
  /** Human-readable kind string */
  kindString?: string;
  /** Signature flags */
  flags?: Flags;
  /** Documentation comment */
  comment?: Comment;
  /** Source locations */
  sources?: Source[];
  /** Generic type parameters */
  typeParameter?: TypeParameter[];
  /** Function parameters */
  parameters?: Parameter[];
  /** Return type */
  type?: Type;
  /** Overwritten signature */
  overwrites?: Type;
  /** Inherited from */
  inheritedFrom?: Type;
}

/**
 * Function or method parameter
 * 
 * @remarks
 * Represents individual parameters in function signatures,
 * including their types, default values, and documentation.
 */
export interface Parameter {
  /** Unique identifier */
  id: number;
  /** Parameter name */
  name: string;
  /** Always 'param' for parameters */
  variant: 'param';
  /** Numeric kind identifier */
  kind: number;
  /** Human-readable kind string */
  kindString?: string;
  /** Parameter flags (optional, rest, etc.) */
  flags?: Flags;
  /** Documentation comment */
  comment?: Comment;
  /** Parameter type */
  type?: Type;
  /** Default value as string */
  defaultValue?: string;
}

/**
 * Generic type parameter
 * 
 * @remarks
 * Represents type parameters in generic declarations like
 * `class MyClass<T extends string = 'default'>`
 * 
 * @example
 * ```typescript
 * interface Container<T extends object = {}> {
 *   value: T;
 * }
 * ```
 */
export interface TypeParameter {
  /** Unique identifier */
  id: number;
  /** Type parameter name (e.g., "T", "K") */
  name: string;
  /** Variant discriminator */
  variant?: 'typeParam';
  /** Numeric kind identifier */
  kind: number;
  /** Human-readable kind string */
  kindString?: string;
  /** Type constraint (extends clause) */
  constraint?: Type;
  /** Default type */
  default?: Type;
}

/**
 * Enumeration of all possible reflection kinds
 * 
 * @remarks
 * These numeric values identify the type of TypeScript symbol
 * being documented. They can be combined as bit flags.
 * 
 * @example
 * ```typescript
 * // Check if a reflection is a class or interface
 * if (reflection.kind === ReflectionKind.Class || 
 *     reflection.kind === ReflectionKind.Interface) {
 *   console.log('This is a type definition');
 * }
 * ```
 */
export enum ReflectionKind {
  /** Project root */
  Project = 1,
  /** ES Module */
  Module = 2,
  /** Namespace */
  Namespace = 4,
  /** Enum declaration */
  Enum = 8,
  /** Enum member */
  EnumMember = 16,
  /** Variable declaration */
  Variable = 32,
  /** Function declaration */
  Function = 64,
  /** Class declaration */
  Class = 128,
  /** Interface declaration */
  Interface = 256,
  /** Constructor */
  Constructor = 512,
  /** Property declaration */
  Property = 1024,
  /** Method declaration */
  Method = 2048,
  /** Call signature */
  CallSignature = 4096,
  /** Index signature */
  IndexSignature = 8192,
  /** Constructor signature */
  ConstructorSignature = 16384,
  /** Function parameter */
  Parameter = 32768,
  /** Type literal */
  TypeLiteral = 65536,
  /** Type parameter */
  TypeParameter = 131072,
  /** Property accessor */
  Accessor = 262144,
  /** Getter signature */
  GetSignature = 524288,
  /** Setter signature */
  SetSignature = 1048576,
  /** Type alias declaration */
  TypeAlias = 2097152,
  /** Module reference */
  Reference = 4194304,
  /** All kinds combined */
  All = 8388607
}