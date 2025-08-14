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
				'i18next/no-literal-string': 'off'
			}
		}
	],
	rules: {
		'i18next/no-literal-string': ['error', {
			markupOnly: true,
			ignoreAttribute: ['to', 'id', 'className']
		}],
		'import/no-unresolved': 'off'
	}
};


