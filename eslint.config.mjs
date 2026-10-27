// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-License-Identifier: GPL-3.0-or-later

// Based on https://gjs.guide/guides/gjs/style-guide.html#eslint

import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';

export default defineConfig([
    {
        files: ['eslint.config.mjs', 'src/**/*.js'],
        extends: [js.configs.recommended, jsdoc.configs['flat/recommended']],
        languageOptions: {
            globals: {
                log: 'readonly',
                logError: 'readonly',
                console: 'readonly',
                TextDecoder: 'readonly',
                TextEncoder: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                // GNOME Shell only
                global: 'readonly',
            },
        },
        rules: {
            //#region Possible problems
            // See https://eslint.org/docs/latest/rules/#possible-problems
            'array-callback-return': 'error',
            'no-await-in-loop': 'error',
            'no-constructor-return': 'error',
            'no-promise-executor-return': 'error',
            'no-self-compare': 'error',
            'no-template-curly-in-string': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unreachable-loop': 'error',
            'no-use-before-define': [
                'error',
                { functions: false, classes: true, variables: true, allowNamedExports: true },
            ],
            //#endregion
            //#region Suggestions
            // See https://eslint.org/docs/latest/rules/#suggestions
            'arrow-body-style': ['error', 'as-needed'],
            'block-scoped-var': 'error',
            'camelcase': ['error', { properties: 'never' }],
            'capitalized-comments': [
                'warn',
                'always',
                { ignoreConsecutiveComments: true, ignorePattern: 'prettier-ignore' },
            ],
            'complexity': 'warn',
            'consistent-return': 'error',
            'default-param-last': 'error',
            'eqeqeq': ['error', 'smart'],
            'no-array-constructor': 'error',
            'no-caller': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-extra-label': 'error',
            'no-iterator': 'error',
            'no-label-var': 'error',
            'no-loop-func': 'error',
            'no-multi-assign': 'warn',
            'no-new': 'error',
            'no-new-wrappers': 'error',
            'no-object-constructor': 'error',
            'no-proto': 'error',
            // 'no-shadow' flags the common GNOME syntax
            // `const Foo = GObject.registerClass({}, class Foo extends GObject {})`
            'no-shadow': 'off',
            'no-unused-expressions': ['error', { allowTernary: true }],
            'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
            'no-var': 'warn',
            'prefer-arrow-callback': 'error',
            'prefer-const': ['warn', { destructuring: 'all' }],
            'unicode-bom': 'error',
            //#endregion
            //#region JSDoc
            // See https://github.com/gajus/eslint-plugin-jsdoc#rules
            'jsdoc/no-undefined-types': ['warn', { definedTypes: ['ExtensionMetadata'] }],
            'jsdoc/require-description': 'warn',
            'jsdoc/require-jsdoc': [
                'error',
                { require: { ClassDeclaration: true }, exemptEmptyFunctions: true },
            ],
            'jsdoc/require-returns': 'error',
            'jsdoc/require-returns-check': 'error',
            //#endregion
            //#region GJS restrictions
            // See https://gitlab.gnome.org/World/javascript/gjs-guide/-/blob/main/src/guides/gjs/style-guide/eslint.config.js
            'no-restricted-globals': [
                'error',
                { name: 'log', message: 'Use console.log()' },
                { name: 'logError', message: 'Use console.warn() or console.error()' },
            ],
            'no-restricted-properties': [
                'error',
                { object: 'imports', property: 'format', message: 'Use template strings' },
                { object: 'pkg', property: 'initFormat', message: 'Use template strings' },
                { object: 'Lang', property: 'copyProperties', message: 'Use Object.assign()' },
                {
                    object: 'Lang',
                    property: 'bind',
                    message: 'Use arrow notation or Function.prototype.bind()',
                },
                { object: 'Lang', property: 'Class', message: 'Use ES6 classes' },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector:
                        'MethodDefinition[key.name="_init"] ' +
                        'CallExpression[arguments.length<=1]' +
                        '[callee.object.type="Super"]' +
                        '[callee.property.name="_init"]',
                    message: 'Use constructor() and super()',
                },
            ],
            //#endregion
        },
    },
    // Turns off ESLint rules that conflict with Prettier, so it must stay last
    eslintConfigPrettier,
]);
