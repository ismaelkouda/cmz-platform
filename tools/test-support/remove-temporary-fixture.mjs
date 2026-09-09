import assert from 'node:assert/strict';
import { existsSync, lstatSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname } from 'node:path';

/**
 * Supprime une fixture Git temporaire sans transformer un ENOTEMPTY transitoire
 * du filesystem Linux en échec métier.
 *
 * Le bornage est volontairement strict : seul un vrai dossier créé directement
 * sous le répertoire temporaire de l'OS, avec le préfixe attendu par le test,
 * peut être supprimé. Les retries sont ceux de fs.rm ; ils restent bornés et un
 * résidu persistant fait toujours échouer le hook.
 */
export function removeTemporaryFixture(root, expectedPrefix) {
    assert.equal(
        realpathSync(dirname(root)),
        realpathSync(tmpdir()),
        'la fixture à supprimer doit être un enfant direct du tmpdir canonique'
    );
    assert.ok(
        basename(root).startsWith(expectedPrefix),
        `préfixe de fixture inattendu : ${basename(root)}`
    );
    assert.equal(
        lstatSync(root).isDirectory(),
        true,
        'la fixture à supprimer doit être un vrai dossier'
    );
    rmSync(root, {
        recursive: true,
        force: true,
        maxRetries: 20,
        retryDelay: 100,
    });
    assert.equal(
        existsSync(root),
        false,
        'la fixture doit être intégralement supprimée'
    );
}
