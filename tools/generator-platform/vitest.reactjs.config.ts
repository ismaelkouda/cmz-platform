import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: false,
        include: [
            resolve(
                workspaceRoot,
                'tools/generator-platform/stack-tests/reactjs/**/*.spec.ts'
            ),
        ],
        reporters: ['verbose'],
        sequence: { concurrent: false },
    },
});
