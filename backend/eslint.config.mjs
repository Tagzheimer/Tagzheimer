import js from '@eslint/js';
export default [
  js.configs.recommended,
  {
    languageOptions: { globals: { console: 'readonly', process: 'readonly', module: 'readonly', require: 'readonly', Buffer: 'readonly', __dirname: 'readonly', fetch: 'readonly', AbortController: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', clearTimeout: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] }
  },
  { ignores: ['node_modules/**', 'coverage/**', 'tests/**'] },
];
