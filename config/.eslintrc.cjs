module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'i18next'],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react-hooks/recommended'
	],
	overrides: [
		{
			files: ['**/*.test.*', '**/__tests__/**', '**/scripts/**'],
			rules: {
				'i18next/no-literal-string': 'off',
				'@typescript-eslint/no-explicit-any': 'off'
			}
		},
		{
			// Services và utilities có thể dùng any hợp lý
			files: ['**/services/**', '**/utils/**', '**/lib/**', '**/types/**'],
			rules: {
				'@typescript-eslint/no-explicit-any': 'warn'
			}
		}
	],
	rules: {
		// I18n rules - chỉ cảnh báo thay vì lỗi để không block development
		'i18next/no-literal-string': ['warn', {
			markupOnly: true,
			ignoreAttribute: [
				'to',
				'id', 
				'className',
				'data-testid',
				'type',
				'name',
				'value',
				'placeholder',
				'aria-label',
				'href',
				'target',
				'rel'
			],
			ignore: [
				'✓',
				'✕',
				'⏰',
				'⚠️',
				'🏆',
				'📚',
				'💡',
				'🎮',
				'⏱️',
				'🔄',
				'📤',
				'👤',
				'🏠',
				'🎉',
				// Các ký tự đặc biệt và emoji khác
			]
		}],
		
		// TypeScript rules - tối ưu cho dự án thực tế
		'@typescript-eslint/no-explicit-any': 'warn', // Cảnh báo thay vì lỗi
		'@typescript-eslint/ban-types': 'warn',
		'@typescript-eslint/no-unused-vars': ['warn', {
			argsIgnorePattern: '^_',
			varsIgnorePattern: '^_'
		}],
		
		// General rules
		'no-empty': 'warn',
		'no-constant-condition': 'warn',
		'no-case-declarations': 'warn',
		'prefer-const': 'warn',
		'import/no-unresolved': 'off',
		
		// Disable các rule không cần thiết cho report
		'@typescript-eslint/no-unused-disable-directives': 'off'
	}
};


