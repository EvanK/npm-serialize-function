import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import mochaPlugin from 'eslint-plugin-mocha';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
  mochaPlugin.configs.recommended,
  { files: ['src/*.{js,mjs,cjs}'], plugins: { js }, extends: ['js/recommended'] },
  { files: ['src/*.js'], languageOptions: { sourceType: 'script' } },
  { files: ['src/*.{js,mjs,cjs}'], languageOptions: { globals: {...globals.browser, ...globals.node} } },
  {
    files: ['src/*.{js,mjs,cjs}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-multiple-empty-lines': ['warn'],
      '@stylistic/eol-last': ['error', 'always'],
    },
  }
]);
