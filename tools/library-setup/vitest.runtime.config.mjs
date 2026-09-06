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
                'tools/library-setup/runtime-fixtures/**/*.spec.ts'
            ),
        ],
        setupFiles: [
            resolve(workspaceRoot, 'tools/vitest-setup-rxresource.ts'),
        ],
        reporters: ['verbose'],
        sequence: { concurrent: false },
    },
});
