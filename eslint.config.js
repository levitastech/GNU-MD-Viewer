import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'benchmarks/generated/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'src-tauri/gen/**',
      'src-tauri/target/**',
      'target/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
);
