import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import i18next from 'eslint-plugin-i18next';
import eslintConfigPrettier from "eslint-config-prettier"
// import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat['jsx-runtime'],
  eslintConfigPrettier,
  i18next.configs['flat/recommended'],
  // eslintPluginPrettierRecommended,
  {
    rules: {
      // 'max-len': 200,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'i18next/no-literal-string': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        parser: '@babel/eslint-parser',
        project: './tsconfig.json',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.integration-test.*', '**/*.test.*'],
    languageOptions: {
      globals: globals.jest,
    },
  },
]
