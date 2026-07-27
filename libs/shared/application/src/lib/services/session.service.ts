import { Service, inject } from '@angular/core';
import { AuthToken, CurrentUser, StoragePort } from '@cmz/shared-domain';

/**
 * Écriture/effacement de la session — port symétrique. `save()` complète
 * `clear()` (posé en Phase 05, consommé par `UiFeedbackService` sur
 * `UnauthorizedError`) : seul `login` l'appelle, sur succès. Mêmes clés que
 * `clear()` efface et que `PermissionActionsService` lit déjà
 * (`permissionsActions`) — pas de nouvelle convention de clé introduite.
 */
@Service()
export class SessionService {
    private readonly storage = inject(StoragePort);

    async save(user: CurrentUser, token: AuthToken): Promise<void> {
        await this.storage.saveEncrypted('user_data', user);
        await this.storage.saveEncrypted('token_data', token);
        await this.storage.saveEncrypted('menu', user.permissions);
        await this.storage.saveEncrypted('permissionsActions', user.actions);
    }

    async clear(): Promise<void> {
        await this.storage.removeKeysWithPrefix('token_data');
        await this.storage.removeKeysWithPrefix('user_data');
        await this.storage.clearEncrypted();
        localStorage.clear();
        sessionStorage.clear();
        globalThis.location.reload();
    }
}
