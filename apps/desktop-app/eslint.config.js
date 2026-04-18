const tsparser = require('@typescript-eslint/parser');
const base = require('../../eslint.config.base');

module.exports = [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        sourceType: 'module',
      },
      globals: {
        window: true,
        document: true,
        console: true,
        process: true,
      },
    },
    plugins: base.plugins,
    rules: base.rules,
  },
];
