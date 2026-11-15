import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      // Type information for the promise rules below
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A promise nobody awaits hides its failure; mark fire-and-forget calls with `void`
      '@typescript-eslint/no-floating-promises': 'error',
      // Async handlers (onClick, onSave) catch their own errors; a promise used as a condition is still a bug
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
  },
])
