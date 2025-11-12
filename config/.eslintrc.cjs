module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'i18next'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '*.config.*',
    'scripts',
    'public',
    '*.d.ts',
    '*.test.*',
    '*.spec.*'
  ],
  overrides: [
    {
      // Turn off i18n for admin/internal tools only
      files: [
        'src/pages/Admin/**/*.{ts,tsx}',
        'src/pages/Creator/**/*.{ts,tsx}',
        'src/features/admin/**/*.{ts,tsx}',
        'src/features/creator/**/*.{ts,tsx}',
        'src/shared/components/AdminStats/**/*.{ts,tsx}',
        'src/shared/components/ImageUploader/**/*.{ts,tsx}',
        'src/pages/AIGeneratorPage/**/*.{ts,tsx}',
        'src/pages/BuildIndexPage/**/*.{ts,tsx}',
        'src/test/**/*.{ts,tsx}'
      ],
      rules: {
        'i18next/no-literal-string': 'off'
      }
    },
    {
      // Development and debug components
      files: [
        '**/Debug*.{ts,tsx}',
        '**/Test*.{ts,tsx}',
        '**/Mock*.{ts,tsx}',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}'
      ],
      rules: {
        'i18next/no-literal-string': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      // Config files and scripts
      files: ['*.config.{js,ts}', '*.cjs', 'scripts/**/*'],
      rules: {
        'i18next/no-literal-string': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      files: ['**/*.test.*', '**/__tests__/**', '**/scripts/**'],
      rules: {
        'i18next/no-literal-string': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      // Services và utilities - allow any for flexibility but warn
      files: ['**/services/**', '**/utils/**', '**/lib/**', '**/types/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ],
  rules: {
    // I18n rules - enable to find remaining hardcoded strings
    'i18next/no-literal-string': ['warn', {
      markupOnly: false, // Check all strings, not just markup
      onlyAttribute: [],
      ignoreAttribute: [
        'data-testid', 'type', 'id', 'name', 'className',
        'style', 'src', 'alt', 'href', 'target', 'rel', 
        'method', 'action', 'to', 'variant', 'size', 
        'color', 'width', 'height', 'viewBox', 'fill',
        'stroke', 'strokeLinecap', 'strokeLinejoin', 'strokeWidth',
        'd', 'clipRule', 'fillRule', 'xmlns', 'role', 'aria-label'
      ],
      ignore: [
        // Numbers and symbols
        '^[0-9]+$',
        '^[0-9.,\\s]+$',
        '^[\\s]+$',
        // Single emojis
        '^[\\u{1F300}-\\u{1F9FF}]$',
        // Technical strings
        'UTF-8', 'px', 'rem', 'em', '%', 'ID', 'UTC', 'GMT',
        // Paths
        '^https?://', '^/', '\\./', '../'
      ]
    }],
    
    // TypeScript rules - keep warnings for code quality
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    
    // General rules - keep only critical ones
    'no-empty': 'off',
    'no-constant-condition': 'off',
    'no-case-declarations': 'off',
    'prefer-const': 'off',
    'import/no-unresolved': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react-hooks/rules-of-hooks': 'error',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-disable-directives': 'off'
  }
};


