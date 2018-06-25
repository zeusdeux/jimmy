module.exports = {
  env: {
    browser: true,
    node: true,
    commonjs: true
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true
    },
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'prettier/react'
  ],
  rules: {
    'no-unused-vars': [
      'error',
      { vars: 'all', varsIgnorePattern: '^_', args: 'all', argsIgnorePattern: '^_' }
    ]
  }
}
