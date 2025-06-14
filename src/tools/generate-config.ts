/**
 * TypeDoc configuration generation tool for MCP
 * 
 * @packageDocumentation
 * @module tools/generate-config
 * 
 * @remarks
 * This tool helps AI assistants generate appropriate TypeDoc configuration
 * files based on project structure and existing TypeScript configuration.
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * TypeDoc configuration options
 * 
 * @interface TypeDocConfig
 */
export interface TypeDocConfig {
  entryPoints: string[];
  entryPointStrategy: 'expand' | 'resolve' | 'packages';
  out?: string;
  json?: string;
  exclude?: string[];
  includeVersion?: boolean;
  readme?: string;
  tsconfig?: string;
  plugin?: string[];
  theme?: string;
  name?: string;
  excludePrivate?: boolean;
  excludeProtected?: boolean;
  excludeInternal?: boolean;
  githubPages?: boolean;
}

/**
 * Configuration generation result
 * 
 * @interface ConfigResult
 */
export interface ConfigResult {
  success: boolean;
  configPath?: string;
  config?: TypeDocConfig;
  message: string;
  warnings?: string[];
}

/**
 * Generates a TypeDoc configuration for a project
 * 
 * @param projectPath - Path to the TypeScript project
 * @param options - Optional configuration overrides
 * @returns Configuration generation result
 * 
 * @example
 * ```typescript
 * const result = await generateTypeDocConfig('/path/to/project');
 * if (result.success) {
 *   console.log('Config created at:', result.configPath);
 * }
 * ```
 */
export async function generateTypeDocConfig(
  projectPath: string,
  options?: {
    entryPoints?: string[];
    outputPath?: string;
    jsonPath?: string;
  }
): Promise<ConfigResult> {
  try {
    // Check if typedoc.json already exists
    const configPath = path.join(projectPath, 'typedoc.json');
    try {
      await fs.access(configPath);
      return {
        success: false,
        message: 'typedoc.json already exists. Delete it first or use the existing configuration.',
        configPath
      };
    } catch {
      // Good, file doesn't exist
    }

    // Detect entry points if not provided
    let entryPoints = options?.entryPoints;
    const warnings: string[] = [];

    if (!entryPoints) {
      entryPoints = [];
      
      // Check for common source directories
      const possibleDirs = ['src', 'lib', 'source', 'app'];
      for (const dir of possibleDirs) {
        const dirPath = path.join(projectPath, dir);
        try {
          const stat = await fs.stat(dirPath);
          if (stat.isDirectory()) {
            // Check if it contains TypeScript files
            const files = await fs.readdir(dirPath);
            if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
              entryPoints.push(`./${dir}`);
            }
          }
        } catch {
          // Directory doesn't exist
        }
      }

      // If no directories found, check for index.ts in root
      if (entryPoints.length === 0) {
        try {
          await fs.access(path.join(projectPath, 'index.ts'));
          entryPoints.push('./index.ts');
        } catch {
          // No index.ts
        }
      }

      // Check for src/index.ts as fallback
      if (entryPoints.length === 0) {
        try {
          await fs.access(path.join(projectPath, 'src', 'index.ts'));
          entryPoints.push('./src/index.ts');
        } catch {
          // No src/index.ts
        }
      }
    }

    if (entryPoints.length === 0) {
      return {
        success: false,
        message: 'Could not detect any TypeScript entry points. Please specify them manually.'
      };
    }

    // Check for tsconfig.json
    let tsconfig: string | undefined;
    try {
      await fs.access(path.join(projectPath, 'tsconfig.json'));
      tsconfig = './tsconfig.json';
    } catch {
      warnings.push('No tsconfig.json found. TypeDoc will use default TypeScript settings.');
    }

    // Check for README
    let readme: string | undefined;
    for (const readmeName of ['README.md', 'readme.md', 'README.markdown']) {
      try {
        await fs.access(path.join(projectPath, readmeName));
        readme = `./${readmeName}`;
        break;
      } catch {
        // Continue checking
      }
    }

    // Try to get project name from package.json
    let projectName: string | undefined;
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
      );
      projectName = packageJson.name;
    } catch {
      // No package.json or couldn't parse it
    }

    // Build configuration
    const config: TypeDocConfig = {
      entryPoints,
      entryPointStrategy: 'expand', // Important for complete documentation
      out: options?.outputPath || './docs',
      json: options?.jsonPath || './docs/typedoc.json',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      includeVersion: true,
      excludePrivate: false, // Include private members for complete docs
      excludeProtected: false,
      excludeInternal: false,
      githubPages: false
    };

    if (tsconfig) {
      config.tsconfig = tsconfig;
    }

    if (readme) {
      config.readme = readme;
    }

    if (projectName) {
      config.name = projectName;
    }

    // Write configuration
    const configContent = JSON.stringify(config, null, 2);
    await fs.writeFile(configPath, configContent, 'utf-8');

    return {
      success: true,
      configPath,
      config,
      message: `TypeDoc configuration created successfully at ${configPath}`,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      success: false,
      message: `Error generating configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * MCP tool wrapper for generateTypeDocConfig
 * 
 * @param input - Tool input parameters
 * @returns MCP tool response
 * 
 * @internal
 */
export async function generateTypeDocConfigTool(input: {
  projectPath: string;
  entryPoints?: string[];
  outputPath?: string;
}) {
  try {
    const result = await generateTypeDocConfig(input.projectPath, {
      entryPoints: input.entryPoints,
      outputPath: input.outputPath,
      jsonPath: input.outputPath ? path.join(input.outputPath, 'typedoc.json') : undefined
    });

    const sections = [
      `## TypeDoc Configuration Generation`,
      '',
      result.success ? '✅ **Status**: Success' : '❌ **Status**: Failed',
      `**Message**: ${result.message}`,
      ''
    ];

    if (result.config && result.success) {
      sections.push('### Generated Configuration', '');
      sections.push('```json');
      sections.push(JSON.stringify(result.config, null, 2));
      sections.push('```', '');
    }

    if (result.warnings && result.warnings.length > 0) {
      sections.push('### Warnings', '');
      result.warnings.forEach(warning => {
        sections.push(`- ⚠️ ${warning}`);
      });
      sections.push('');
    }

    if (result.success) {
      sections.push('### Next Steps', '');
      sections.push('1. Review the generated configuration');
      sections.push('2. Run `npx typedoc` to generate documentation');
      sections.push('3. Use the generated JSON file with this MCP server');
    }

    return {
      content: [
        {
          type: 'text',
          text: sections.join('\n')
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating TypeDoc configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
}