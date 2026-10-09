import js from '@eslint/js';
import tsParser from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tsParser.config(
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  ...tsParser.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  }
);
