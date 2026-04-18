const tsparser = require('@typescript-eslint/parser');
const base = require('../../eslint.config.base');

module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      globals: {
        node: true,
        jest: true,
      },
    },
    plugins: base.plugins,
    rules: base.rules,
  },
];
