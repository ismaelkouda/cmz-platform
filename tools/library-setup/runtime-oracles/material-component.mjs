import { runNode } from './support.mjs';

export function proveMaterialComponent(context) {
    runNode(
        context,
        [
            'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js',
            '-p',
            'tools/library-setup/runtime-fixtures/tsconfig.material.json',
        ],
        'compilation stricte du composant Material'
    );
}
