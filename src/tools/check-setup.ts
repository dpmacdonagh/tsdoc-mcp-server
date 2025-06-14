/**
 * TypeDoc setup checking tool for MCP
 * 
 * @packageDocumentation
 * @module tools/check-setup
 * 
 * @remarks
 * This tool helps AI assistants detect if TypeDoc is properly installed and
 * configured in a TypeScript project, providing actionable recommendations.
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Setup status information
 * 
 * @interface SetupStatus
 */
export interface SetupStatus {
  /** Whether TypeDoc is installed */
  hasTypedoc: boolean;
  /** TypeDoc version if installed */
  typedocVersion?: string;
  /** Whether a typedoc.json config exists */
  hasConfig: boolean;
  /** Path to typedoc.json if it exists */
  configPath?: string;
  /** Whether TypeDoc JSON output exists */
  hasOutput: boolean;
  /** Path to TypeDoc JSON output if it exists */
  outputPath?: string;
  /** Whether the project has TypeScript */
  hasTypeScript: boolean;
  /** TypeScript version if installed */
  typeScriptVersion?: string;
  /** Detected source directories */
  sourceDirs: string[];
  /** Recommendations for next steps */
  recommendations: string[];
}

/**
 * Checks if TypeDoc is set up in a project
 * 
 * @param projectPath - Path to the TypeScript project
 * @returns Setup status with recommendations
 * 
 * @example
 * ```typescript
 * const status = await checkTypeDocSetup('/path/to/project');
 * if (!status.hasTypedoc) {
 *   console.log('TypeDoc not installed');
 *   console.log('Recommendations:', status.recommendations);
 * }
 * ```
 */
export async function checkTypeDocSetup(projectPath: string): Promise<SetupStatus> {
  const status: SetupStatus = {
    hasTypedoc: false,
    hasConfig: false,
    hasOutput: false,
    hasTypeScript: false,
    sourceDirs: [],
    recommendations: []
  };

  try {
    // Check package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check for TypeDoc
      const typedocVersion = packageJson.devDependencies?.typedoc || 
                           packageJson.dependencies?.typedoc;
      if (typedocVersion) {
        status.hasTypedoc = true;
        status.typedocVersion = typedocVersion;
      }
      
      // Check for TypeScript
      const tsVersion = packageJson.devDependencies?.typescript || 
                       packageJson.dependencies?.typescript;
      if (tsVersion) {
        status.hasTypeScript = true;
        status.typeScriptVersion = tsVersion;
      }
    } catch (error) {
      status.recommendations.push('No package.json found. Is this a Node.js project?');
    }

    // Check for typedoc.json
    const typedocConfigPath = path.join(projectPath, 'typedoc.json');
    try {
      await fs.access(typedocConfigPath);
      status.hasConfig = true;
      status.configPath = typedocConfigPath;
      
      // Try to read config to find output path
      try {
        const config = JSON.parse(await fs.readFile(typedocConfigPath, 'utf-8'));
        if (config.json) {
          const outputPath = path.join(projectPath, config.json);
          try {
            await fs.access(outputPath);
            status.hasOutput = true;
            status.outputPath = outputPath;
          } catch {
            // Output doesn't exist yet
          }
        }
      } catch {
        // Could not parse config
      }
    } catch {
      // No typedoc.json
    }

    // Check for common TypeDoc output locations if not found in config
    if (!status.hasOutput) {
      const commonPaths = [
        'docs/typedoc.json',
        'documentation/typedoc.json',
        'typedoc.json',
        'api-docs/typedoc.json'
      ];
      
      for (const outputPath of commonPaths) {
        const fullPath = path.join(projectPath, outputPath);
        try {
          await fs.access(fullPath);
          status.hasOutput = true;
          status.outputPath = fullPath;
          break;
        } catch {
          // Continue checking
        }
      }
    }

    // Detect source directories
    const possibleSrcDirs = ['src', 'lib', 'source', 'app'];
    for (const dir of possibleSrcDirs) {
      const dirPath = path.join(projectPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory()) {
          // Check if it contains TypeScript files
          const files = await fs.readdir(dirPath);
          if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
            status.sourceDirs.push(dir);
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }

    // Generate recommendations
    if (!status.hasTypeScript) {
      status.recommendations.push('TypeScript is not installed. Run: npm install --save-dev typescript');
    }

    if (!status.hasTypedoc) {
      status.recommendations.push('TypeDoc is not installed. Run: npm install --save-dev typedoc');
    } else if (!status.hasConfig) {
      status.recommendations.push('No typedoc.json found. Create one with appropriate settings.');
      if (status.sourceDirs.length > 0) {
        status.recommendations.push(`Detected source directories: ${status.sourceDirs.join(', ')}`);
      }
    } else if (!status.hasOutput) {
      status.recommendations.push('TypeDoc configuration exists but no output found. Run: npx typedoc');
    }

    if (status.hasOutput) {
      status.recommendations.push(`TypeDoc output found at: ${status.outputPath}`);
      status.recommendations.push('Ready to serve documentation!');
    }

  } catch (error) {
    status.recommendations.push(`Error checking project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return status;
}

/**
 * MCP tool wrapper for checkTypeDocSetup
 * 
 * @param input - Tool input parameters
 * @returns MCP tool response
 * 
 * @internal
 */
export async function checkTypeDocSetupTool(input: { projectPath: string }) {
  try {
    const status = await checkTypeDocSetup(input.projectPath);
    
    const sections = [
      `## TypeDoc Setup Status for ${input.projectPath}`,
      '',
      `**TypeScript**: ${status.hasTypeScript ? `✅ Installed (${status.typeScriptVersion})` : '❌ Not installed'}`,
      `**TypeDoc**: ${status.hasTypedoc ? `✅ Installed (${status.typedocVersion})` : '❌ Not installed'}`,
      `**Configuration**: ${status.hasConfig ? `✅ Found at ${status.configPath}` : '❌ No typedoc.json'}`,
      `**Documentation**: ${status.hasOutput ? `✅ Found at ${status.outputPath}` : '❌ Not generated'}`,
      ''
    ];

    if (status.sourceDirs.length > 0) {
      sections.push(`**Detected source directories**: ${status.sourceDirs.join(', ')}`, '');
    }

    if (status.recommendations.length > 0) {
      sections.push('## Recommendations', '');
      status.recommendations.forEach(rec => {
        sections.push(`- ${rec}`);
      });
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
          text: `Error checking TypeDoc setup: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
}