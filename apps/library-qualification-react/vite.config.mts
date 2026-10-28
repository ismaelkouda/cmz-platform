/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nxReadySignal } from '@nx/vite/plugins/nx-ready-signal.plugin';

export default defineConfig(() => ({
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/library-qualification-react',
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
        outDir: '../../dist/apps/library-qualification-react',
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: { transformMixedEsModules: true },
    },
    test: {
        name: 'library-qualification-react',
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: [
            '{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../coverage/apps/library-qualification-react',
            provider: 'v8' as const,
        },
    },
}));
