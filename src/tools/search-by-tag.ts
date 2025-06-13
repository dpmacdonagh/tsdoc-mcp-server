/**
 * Search by tag tool for MCP
 * 
 * @packageDocumentation
 * @module tools/search-by-tag
 * 
 * @remarks
 * This tool enables searching TypeScript symbols by their TSDoc/JSDoc tags,
 * useful for finding deprecated APIs, beta features, or internal implementations.
 */

import { TypeDocParser } from '../parser/index.js';

/**
 * Parameters for search by tag function
 */
export interface SearchByTagParams {
  /** JSDoc tag to search for (without @ prefix, e.g., "deprecated", "beta", "internal") */
  tag: string;
  /** Optional tag value to match */
  value?: string;
}

/**
 * Searches for symbols by their documentation tags
 * 
 * @param parser - The TypeDoc parser instance
 * @param params - Search parameters including tag name and optional value
 * @returns Object containing array of matching symbols
 * 
 * @remarks
 * This function searches through all documented symbols to find those
 * containing specific TSDoc/JSDoc tags. Common use cases include:
 * - Finding all deprecated APIs (@deprecated)
 * - Locating beta features (@beta)
 * - Identifying internal APIs (@internal)
 * - Finding symbols added in specific versions (@since)
 * 
 * The search supports partial matching of tag values when specified.
 * 
 * @example
 * ```typescript
 * // Find all deprecated symbols
 * const deprecated = await searchByTag(parser, { tag: 'deprecated' });
 * 
 * // Find symbols deprecated with a specific reason
 * const specificDeprecated = await searchByTag(parser, { 
 *   tag: 'deprecated',
 *   value: 'Use NewAPI instead'
 * });
 * 
 * // Find all beta features
 * const betaFeatures = await searchByTag(parser, { tag: 'beta' });
 * ```
 */
export async function searchByTag(parser: TypeDocParser, params: SearchByTagParams) {
  const results: any[] = [];
  const tagName = params.tag.startsWith('@') ? params.tag : `@${params.tag}`;
  
  // Search through all reflections
  // Note: We access private members here for efficiency
  // In a production version, we'd add a public iterator method to the parser
  for (const [, reflection] of parser['index']) {
    if (!reflection.comment?.blockTags) continue;
    
    const matchingTag = reflection.comment.blockTags.find(t => t.tag === tagName);
    if (!matchingTag) continue;
    
    const tagContent = matchingTag.content.map(p => p.text).join('').trim();
    
    // If value filter is specified, check if it matches
    if (params.value && !tagContent.includes(params.value)) continue;
    
    const path = parser['getPath'](reflection);
    
    results.push({
      name: reflection.name,
      kind: reflection.kindString || parser['getKindString'](reflection.kind),
      path,
      tagValue: tagContent,
      source: reflection.sources?.[0] ? {
        fileName: reflection.sources[0].fileName,
        line: reflection.sources[0].line,
      } : undefined,
    });
  }
  
  return { symbols: results };
}