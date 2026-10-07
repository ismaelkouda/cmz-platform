/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
    root: import.meta.dirname,
    cacheDir: '../../node_modules/.vite/apps/users-management-react-proof',
    server: {
        port: 4200,
        host: 'localhost',
    },
    preview: {
        port: 4300,
        host: 'localhost',
    },
    plugins: [react()],
    build: {
        outDir: '../../dist/apps/users-management-react-proof',
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: { transformMixedEsModules: true },
    },
    test: {
        name: 'users-management-react-proof',
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: [
            '{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
        reporters: ['default'],
        coverage: {
            reportsDirectory:
                '../../coverage/apps/users-management-react-proof',
            provider: 'v8' as const,
        },
    },
}));
