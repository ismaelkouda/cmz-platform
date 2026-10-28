/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';

export default defineConfig(() => ({
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/workspace-react-proof',
    server: {
        port: 4200,
        host: '127.0.0.1',
    },
    preview: {
        port: 4300,
        host: '127.0.0.1',
    },
    plugins: [react(), nxReadySignal()],
    build: {
        outDir: '../../dist/apps/workspace-react-proof',
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
    },
    test: {
        name: 'workspace-react-proof',
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: [
            '{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../coverage/apps/workspace-react-proof',
            provider: 'v8' as const,
        },
    },
}));
