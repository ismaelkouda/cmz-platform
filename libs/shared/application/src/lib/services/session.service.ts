import { Service, inject, signal } from '@angular/core';
import { AuthToken, CurrentUser, StoragePort } from '@cmz/shared-domain';
import { NAVIGATION_PORT } from '../tokens/navigation-port.token';
import { StorePathsService } from './store-paths.service';

const TOKEN_STORAGE_KEY = 'token_data';

/**
 * Session utilisateur — écrit/efface le stockage chiffré **et** expose le
 * jeton courant en signal, pour les consommateurs synchrones (intercepteur
 * HTTP, guards) qui ne peuvent pas attendre une promesse à chaque requête.
 *
 * Limite Web Crypto : le déchiffrement est asynchrone. `token()` démarre
 * à `null` puis se remplit. Les **guards** doivent attendre `whenReady()`
 * avant de décider (auth.guard / paths.guard) — sinon un full reload
 * (Playwright `page.goto`, F5) refuse toute session encore chiffrée en
 * storage. Les consommateurs hot-path (intercepteur HTTP) gardent le
 * modèle « null = pas de session » par sécurité s'ils ne pollent pas.
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
    private readonly navigation = inject(NAVIGATION_PORT);
    private readonly storePaths = inject(StorePathsService);

    private readonly _token = signal<AuthToken | null>(null);
    /** Jeton courant, ou `null` si absent — ou pas encore déchiffré. */
    readonly token = this._token.asReadonly();

    private readonly _ready = signal(false);
    /**
     * `true` une fois le premier `loadToken()` terminé (succès ou absence).
     * Ne repasse jamais à `false` après hydratation initiale.
     */
    readonly ready = this._ready.asReadonly();

    private readonly readyGate: Promise<void>;
    private resolveReady!: () => void;

    constructor() {
        this.readyGate = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });
        void this.loadToken();
    }

    /** Attend la fin du déchiffrement initial (guards route). */
    whenReady(): Promise<void> {
        return this.readyGate;
    }

    private async loadToken(): Promise<void> {
        try {
            this._token.set(
                await this.storage.getObfuscated<AuthToken>(TOKEN_STORAGE_KEY)
            );
        } finally {
            this._ready.set(true);
            this.resolveReady();
        }
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
