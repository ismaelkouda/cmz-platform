import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
    resolve: {
        alias: {
            '@cmz/core': resolve(workspaceRoot, 'libs/core/src/index.ts'),
            '@cmz/shared-application': resolve(
                workspaceRoot,
                'libs/shared/application/src/index.ts'
            ),
            '@cmz/shared-constants': resolve(
                workspaceRoot,
                'libs/shared/constants/src/index.ts'
            ),
            '@cmz/shared-data': resolve(
                workspaceRoot,
                'libs/shared/data/src/index.ts'
            ),
            '@cmz/shared-domain': resolve(
                workspaceRoot,
                'libs/shared/domain/src/index.ts'
            ),
        },
    },
    test: {
        environment: 'jsdom',
        globals: false,
        include: [
            resolve(
                workspaceRoot,
                'tools/generator-platform/stack-tests/angular/**/*.spec.ts'
            ),
        ],
        setupFiles: [
            resolve(workspaceRoot, 'tools/vitest-setup-rxresource.ts'),
        ],
        reporters: ['verbose'],
        sequence: { concurrent: false },
    },
});
