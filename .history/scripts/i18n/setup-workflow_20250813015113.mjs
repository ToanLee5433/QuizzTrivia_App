#!/usr/bin/env node

/**
 * Setup script for i18n automation workflow
 * Initializes environment and installs dependencies
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Setup VS Code tasks for i18n workflow
 */
async function setupVSCodeTasks() {
  console.log('⚙️  Setting up VS Code tasks...');
  
  const vscodeDir = path.join(PROJECT_ROOT, '.vscode');
  const tasksFile = path.join(vscodeDir, 'tasks.json');
  
  await fs.ensureDir(vscodeDir);
  
  const tasks = {
    version: "2.0.0",
    tasks: [
      {
        label: "i18n: Extract Keys",
        type: "shell",
        command: "npm",
        args: ["run", "extract"],
        group: "build",
        options: {
          cwd: "${workspaceFolder}/scripts/i18n"
        },
        presentation: {
          echo: true,
          reveal: "always",
          focus: false,
          panel: "shared"
        },
        problemMatcher: []
      },
      {
        label: "i18n: Validate Translations",
        type: "shell",
        command: "npm",
        args: ["run", "validate"],
        group: "test",
        options: {
          cwd: "${workspaceFolder}/scripts/i18n"
        },
        presentation: {
          echo: true,
          reveal: "always",
          focus: false,
          panel: "shared"
        },
        problemMatcher: []
      },
      {
        label: "i18n: Fix Missing Keys",
        type: "shell",
        command: "npm",
        args: ["run", "fix-all"],
        group: "build",
        options: {
          cwd: "${workspaceFolder}/scripts/i18n"
        },
        presentation: {
          echo: true,
          reveal: "always",
          focus: false,
          panel: "shared"
        },
        problemMatcher: []
      },
      {
        label: "i18n: Full Audit",
        type: "shell",
        command: "npm",
        args: ["run", "full-audit"],
        group: "test",
        options: {
          cwd: "${workspaceFolder}/scripts/i18n"
        },
        presentation: {
          echo: true,
          reveal: "always",
          focus: false,
          panel: "shared"
        },
        problemMatcher: []
      }
    ]
  };

  // Merge with existing tasks if they exist
  if (await fs.pathExists(tasksFile)) {
    const existingTasks = await fs.readJSON(tasksFile);
    if (existingTasks.tasks) {
      // Remove existing i18n tasks and add new ones
      existingTasks.tasks = existingTasks.tasks.filter(task => 
        !task.label.startsWith('i18n:')
      );
      existingTasks.tasks.push(...tasks.tasks);
      await fs.writeJSON(tasksFile, existingTasks, { spaces: 2 });
    } else {
      await fs.writeJSON(tasksFile, tasks, { spaces: 2 });
    }
  } else {
    await fs.writeJSON(tasksFile, tasks, { spaces: 2 });
  }

  console.log('✅ VS Code tasks configured');
}

/**
 * Setup Git hooks for i18n validation
 */
async function setupGitHooks() {
  console.log('🔗 Setting up Git hooks...');
  
  const hooksDir = path.join(PROJECT_ROOT, '.git/hooks');
  
  if (!(await fs.pathExists(hooksDir))) {
    console.log('⚠️  No .git/hooks directory found. Skipping Git hooks setup.');
    return;
  }

  const preCommitHook = `#!/bin/sh
# i18n validation pre-commit hook
echo "🌐 Validating i18n translations..."

cd scripts/i18n
npm run validate --silent

if [ $? -ne 0 ]; then
  echo "❌ i18n validation failed. Run 'npm run fix-all' in scripts/i18n to fix issues."
  exit 1
fi

echo "✅ i18n validation passed"
`;

  const preCommitPath = path.join(hooksDir, 'pre-commit');
  
  // Append to existing pre-commit hook or create new one
  if (await fs.pathExists(preCommitPath)) {
    const existingHook = await fs.readFile(preCommitPath, 'utf8');
    if (!existingHook.includes('i18n validation')) {
      await fs.appendFile(preCommitPath, '\n' + preCommitHook);
    }
  } else {
    await fs.writeFile(preCommitPath, preCommitHook);
  }

  // Make executable
  try {
    await fs.chmod(preCommitPath, '755');
    console.log('✅ Git pre-commit hook configured');
  } catch (error) {
    console.log('⚠️  Could not make pre-commit hook executable:', error.message);
  }
}

/**
 * Setup package.json scripts in main project
 */
async function setupMainProjectScripts() {
  console.log('📦 Setting up main project scripts...');
  
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  
  if (!(await fs.pathExists(packageJsonPath))) {
    console.log('⚠️  No package.json found in project root');
    return;
  }

  const packageJson = await fs.readJSON(packageJsonPath);
  
  const i18nScripts = {
    "i18n:extract": "cd scripts/i18n && npm run extract",
    "i18n:validate": "cd scripts/i18n && npm run validate",
    "i18n:fix": "cd scripts/i18n && npm run fix-all",
    "i18n:audit": "cd scripts/i18n && npm run full-audit",
    "i18n:setup": "cd scripts/i18n && npm install"
  };

  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  // Add i18n scripts
  Object.assign(packageJson.scripts, i18nScripts);

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
  
  console.log('✅ Main project scripts updated');
}

/**
 * Create workflow documentation
 */
async function createDocumentation() {
  console.log('📚 Creating workflow documentation...');
  
  const docContent = `# i18n Automation Workflow

## Overview
This directory contains automation tools for managing internationalization (i18n) in the QuizTrivia app.

## Quick Start

### 1. Setup
\`\`\`bash
cd scripts/i18n
npm install
\`\`\`

### 2. Available Commands

#### Core Commands
- \`npm run extract\` - Extract translation keys from source code
- \`npm run validate\` - Validate translation completeness
- \`npm run fix\` - Auto-fix missing translations
- \`npm run sync\` - Synchronize translation files

#### Component Management
- \`npm run update-components\` - Update i18n patterns in components
- \`npm run component-report\` - Generate component usage report

#### Translation Management
- \`npm run translate\` - Auto-translate missing keys
- \`npm run translate-report\` - Generate translation report

#### Workflow Commands
- \`npm run full-audit\` - Complete validation and reporting
- \`npm run fix-all\` - Fix all issues automatically
- \`npm run dev\` - Watch mode for development

## VS Code Integration

The following tasks are available in VS Code (Ctrl+Shift+P > "Tasks: Run Task"):
- \`i18n: Extract Keys\`
- \`i18n: Validate Translations\`
- \`i18n: Fix Missing Keys\`
- \`i18n: Full Audit\`

## Git Integration

A pre-commit hook validates i18n completeness before commits.

## File Structure

\`\`\`
scripts/i18n/
├── package.json              # Dependencies and scripts
├── i18n-scanner.mjs         # Core key extraction and validation
├── translate-missing.mjs    # Auto-translation utilities
├── update-components.mjs    # Component pattern updates
├── setup-workflow.mjs       # Workflow setup script
└── README.md               # This documentation
\`\`\`

## Translation Files

\`\`\`
public/locales/
├── vi/common.json          # Vietnamese translations
└── en/common.json          # English translations
\`\`\`

## Best Practices

### 1. Key Naming Convention
Use dot notation for nested keys:
\`\`\`
auth.login
auth.register
quiz.create.title
\`\`\`

### 2. Component Usage
\`\`\`tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('quiz.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
\`\`\`

### 3. With Parameters
\`\`\`tsx
// Translation: "Hello {{name}}, you have {{count}} messages"
{t('welcome.message', { name: 'John', count: 5 })}
\`\`\`

## Development Workflow

### Adding New Features
1. Write components with \`t()\` calls
2. Run \`npm run extract\` to find new keys
3. Add translations to locale files
4. Run \`npm run validate\` to verify

### Maintenance
- Run \`npm run full-audit\` weekly
- Use \`npm run fix-all\` for bulk fixes
- Review auto-translations manually

## CI/CD Integration

Add to your CI pipeline:
\`\`\`yaml
- name: Validate i18n
  run: |
    cd scripts/i18n
    npm install
    npm run ci
\`\`\`

## Troubleshooting

### Missing Keys
Run \`npm run fix\` to auto-generate placeholders.

### Component Issues
Run \`npm run update-components\` to standardize patterns.

### Translation Quality
Review auto-translations in reports and update manually.
`;

  await fs.writeFile('./README.md', docContent);
  console.log('✅ Documentation created');
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Setting up i18n automation workflow...\n');

  try {
    await setupVSCodeTasks();
    await setupGitHooks();
    await setupMainProjectScripts();
    await createDocumentation();

    console.log('\n✅ i18n automation workflow setup complete!');
    console.log('\n📖 Next steps:');
    console.log('1. Run: npm install (in this directory)');
    console.log('2. Run: npm run full-audit (to check current status)');
    console.log('3. Run: npm run fix-all (to fix any issues)');
    console.log('4. Check the README.md for detailed usage');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
