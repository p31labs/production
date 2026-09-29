import js from '@eslint/js';
import typescript from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'import': importPlugin,
    },
    languageOptions: {
      parser: typescript.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-cycle': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'out/**',
      'node_modules/**',
      'public/**',
      'scripts/**',
      '**/*.test.*',
      '**/__tests__/**',
      'vite.config.*',
      'vitest.config.*',
      'eslint.config.*',
    ],
  },
];