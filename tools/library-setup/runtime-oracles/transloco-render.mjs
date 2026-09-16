import { runNode } from './support.mjs';

export function proveTranslocoRender(context) {
    runNode(
        context,
        ['tools/library-setup/runtime-fixtures/transloco-runtime-probe.mjs'],
        'rendu réel Transloco'
    );
}
