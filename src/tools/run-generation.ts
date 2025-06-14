/**
 * TypeDoc generation execution tool for MCP
 * 
 * @packageDocumentation
 * @module tools/run-generation
 * 
 * @remarks
 * This tool helps AI assistants run TypeDoc to generate documentation
 * for TypeScript projects, including installing TypeDoc if needed.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Generation result information
 * 
 * @interface GenerationResult
 */
export interface GenerationResult {
  success: boolean;
  message: string;
  outputPath?: string;
  jsonPath?: string;
  duration?: number;
  installedTypedoc?: boolean;
  warnings?: string[];
  errors?: string[];
}

/**
 * Runs a command and captures output
 * 
 * @param command - Command to run
 * @param args - Command arguments
 * @param cwd - Working directory
 * @returns Command output
 * 
 * @internal
 */
async function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });

    proc.on('error', (error) => {
      stderr += error.message;
      resolve({ stdout, stderr, code: 1 });
    });
  });
}

/**
 * Checks if a command exists
 * 
 * @param command - Command to check
 * @returns Whether the command exists
 * 
 * @internal
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    const { code } = await runCommand('which', [command], process.cwd());
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * Runs TypeDoc generation for a project
 * 
 * @param projectPath - Path to the TypeScript project
 * @param options - Generation options
 * @returns Generation result
 * 
 * @example
 * ```typescript
 * const result = await runTypeDocGeneration('/path/to/project', {
 *   install: true
 * });
 * if (result.success) {
 *   console.log('Documentation generated at:', result.outputPath);
 * }
 * ```
 */
export async function runTypeDocGeneration(
  projectPath: string,
  options?: {
    configPath?: string;
    install?: boolean;
  }
): Promise<GenerationResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  let installedTypedoc = false;

  try {
    // Check if we're in a valid project directory
    try {
      await fs.access(path.join(projectPath, 'package.json'));
    } catch {
      return {
        success: false,
        message: 'No package.json found. Is this a Node.js project?'
      };
    }

    // Check for TypeDoc installation
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
    );
    
    const hasTypedoc = packageJson.devDependencies?.typedoc || 
                      packageJson.dependencies?.typedoc;

    if (!hasTypedoc && options?.install) {
      // Install TypeDoc
      console.log('Installing TypeDoc...');
      const npmExists = await commandExists('npm');
      if (!npmExists) {
        return {
          success: false,
          message: 'npm is not installed. Please install Node.js and npm first.'
        };
      }

      const { stdout, stderr, code } = await runCommand(
        'npm',
        ['install', '--save-dev', 'typedoc'],
        projectPath
      );

      if (code !== 0) {
        return {
          success: false,
          message: 'Failed to install TypeDoc',
          errors: [stderr || stdout]
        };
      }

      installedTypedoc = true;
      warnings.push('TypeDoc was installed as a dev dependency');
    } else if (!hasTypedoc) {
      return {
        success: false,
        message: 'TypeDoc is not installed. Run with install: true to install it automatically.'
      };
    }

    // Check for TypeDoc configuration
    const configPath = options?.configPath || path.join(projectPath, 'typedoc.json');
    let hasConfig = false;
    let config: any = {};

    try {
      await fs.access(configPath);
      hasConfig = true;
      config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    } catch {
      warnings.push('No typedoc.json found. Using default settings.');
    }

    // Run TypeDoc
    console.log('Running TypeDoc...');
    const typedocArgs = hasConfig ? ['--options', configPath] : [];
    
    // Add default arguments if no config
    if (!hasConfig) {
      typedocArgs.push(
        '--entryPoints', './src',
        '--entryPointStrategy', 'expand',
        '--out', './docs',
        '--json', './docs/typedoc.json'
      );
    }

    const { stdout, stderr, code } = await runCommand(
      'npx',
      ['typedoc', ...typedocArgs],
      projectPath
    );

    if (code !== 0) {
      return {
        success: false,
        message: 'TypeDoc generation failed',
        errors: [stderr || stdout],
        duration: Date.now() - startTime
      };
    }

    // Parse output to find generated paths
    let outputPath = config.out || './docs';
    let jsonPath = config.json || './docs/typedoc.json';

    // Make paths absolute
    outputPath = path.join(projectPath, outputPath);
    jsonPath = path.join(projectPath, jsonPath);

    // Verify output was created
    try {
      await fs.access(jsonPath);
    } catch {
      warnings.push('JSON output file not found at expected location');
    }

    // Parse TypeDoc output for any warnings
    const outputLines = stdout.split('\n');
    outputLines.forEach(line => {
      if (line.includes('Warning:')) {
        warnings.push(line);
      }
    });

    return {
      success: true,
      message: 'Documentation generated successfully',
      outputPath,
      jsonPath,
      duration: Date.now() - startTime,
      installedTypedoc,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      success: false,
      message: `Error running TypeDoc: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - startTime,
      errors: [error instanceof Error ? error.stack || error.message : 'Unknown error']
    };
  }
}

/**
 * MCP tool wrapper for runTypeDocGeneration
 * 
 * @param input - Tool input parameters
 * @returns MCP tool response
 * 
 * @internal
 */
export async function runTypeDocGenerationTool(input: {
  projectPath: string;
  configPath?: string;
  install?: boolean;
}) {
  try {
    const result = await runTypeDocGeneration(input.projectPath, {
      configPath: input.configPath,
      install: input.install
    });

    const sections = [
      `## TypeDoc Generation`,
      '',
      result.success ? '✅ **Status**: Success' : '❌ **Status**: Failed',
      `**Message**: ${result.message}`,
      ''
    ];

    if (result.duration) {
      sections.push(`**Duration**: ${(result.duration / 1000).toFixed(2)}s`, '');
    }

    if (result.installedTypedoc) {
      sections.push('📦 **TypeDoc installed**: Added as dev dependency', '');
    }

    if (result.success && result.outputPath) {
      sections.push('### Output Locations', '');
      sections.push(`- **HTML Documentation**: ${result.outputPath}`);
      sections.push(`- **JSON Documentation**: ${result.jsonPath}`);
      sections.push('');
      sections.push('### Next Steps', '');
      sections.push(`1. Use the JSON file with this MCP server:`);
      sections.push('   ```bash');
      sections.push(`   npx tsdoc-mcp-server --doc-path "${result.jsonPath}"`);
      sections.push('   ```');
      sections.push(`2. View HTML documentation by opening: ${result.outputPath}/index.html`);
    }

    if (result.warnings && result.warnings.length > 0) {
      sections.push('', '### Warnings', '');
      result.warnings.forEach(warning => {
        sections.push(`- ⚠️ ${warning}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      sections.push('', '### Errors', '');
      result.errors.forEach(error => {
        sections.push(`- ❌ ${error}`);
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
          text: `Error running TypeDoc generation: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
}