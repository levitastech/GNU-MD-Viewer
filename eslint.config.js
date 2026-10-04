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
    files: ['src/**/*.ts', 'src/**/*.svelte'],
    languageOptions: {
      globals: {
        document: 'readonly',
        DOMParser: 'readonly',
        Element: 'readonly',
        getComputedStyle: 'readonly',
        HTMLDivElement: 'readonly',
        Image: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['src/lib/contracts/**/*.ts', 'src/lib/markdown/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@tauri-apps/*', '*.svelte', '**/*.svelte'],
              message:
                'Les contrats et le moteur Markdown restent indépendants de Tauri et Svelte.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['src/lib/platform/L04WebviewHarness.svelte'],
    rules: {
      // Ce harness vérifie précisément le point d'insertion après sanitisation.
      'svelte/no-dom-manipulating': 'off',
    },
  },
);
