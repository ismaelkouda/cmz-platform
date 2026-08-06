import { Service, inject, signal } from '@angular/core';
import {
    AuthToken,
    CurrentUser,
    NavigationPort,
    StoragePort,
} from '@cmz/shared-domain';
import { StorePathsService } from './store-paths.service';

const TOKEN_STORAGE_KEY = 'token_data';

/**
 * Session utilisateur — écrit/efface le stockage chiffré **et** expose le
 * jeton courant en signal, pour les consommateurs synchrones (intercepteur
 * HTTP, guards) qui ne peuvent pas attendre une promesse à chaque requête.
 *
 * Même limite assumée que `PermissionActionsService`/`StorePathsService`
 * (cf. `application-scope.md`) : le déchiffrement Web Crypto est asynchrone,
 * le signal démarre donc à `null` puis se remplit. Un signal encore vide est
 * traité comme « pas de session » par les consommateurs — refus par sécurité,
 * jamais par défaut permissif.
 *
 * **Bug réel trouvé et corrigé (audit `audit-workspace-2026-08-02-revue-finale.md`,
 * I-7) : `user.paths` (liste des pages autorisées, wire fidèle au legacy —
 * `CurrentUser.paths: string[]`) n'était jamais persisté.** `StorePathsService`
 * existait déjà (porté depuis `StorePathsService`/`PagesGuard` du legacy) mais
 * `setPaths()` n'était appelé nulle part — un port entièrement câblé côté
 * lecture, jamais côté écriture. Conséquence avant ce correctif : tout guard
 * qui aurait un jour consommé `StorePathsService.paths()` aurait vu une valeur
 * figée à `null` pour toute session réelle, indétectable en dev (`isDevMode()`
 * contourne `PermissionActionsService` via `provideDevPermissions()`, mais ne
 * couvre pas `StorePathsService`).
 */
@Service()
export class SessionService {
    private readonly storage = inject(StoragePort);
    private readonly navigation = inject(NavigationPort);
    private readonly storePaths = inject(StorePathsService);

    private readonly _token = signal<AuthToken | null>(null);
    /** Jeton courant, ou `null` si absent — ou pas encore déchiffré. */
    readonly token = this._token.asReadonly();

    constructor() {
        void this.loadToken();
    }

    private async loadToken(): Promise<void> {
        this._token.set(
            await this.storage.getObfuscated<AuthToken>(TOKEN_STORAGE_KEY)
        );
    }

    async save(user: CurrentUser, token: AuthToken): Promise<void> {
        await this.storage.saveObfuscated('user_data', user);
        await this.storage.saveObfuscated(TOKEN_STORAGE_KEY, token);
        await this.storage.saveObfuscated('menu', user.permissions);
        await this.storage.saveObfuscated('permissionsActions', user.actions);
        await this.storePaths.setPaths(user.paths);
        this._token.set(token);
    }

    async clear(): Promise<void> {
        this._token.set(null);
        this.storage.clearAll();
        this.navigation.reload();
    }
}
