import reactHooks from 'eslint-plugin-react-hooks';
import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: reactHooks.configs.flat.recommended.plugins,
        rules: reactHooks.configs.flat.recommended.rules,
    },
];
