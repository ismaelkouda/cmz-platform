import { Service, inject, signal } from '@angular/core';
import { STORAGE_PORT } from '../tokens/storage-port.token';

/**
 * Pages autorisées (`CurrentUser.paths`) — miroir legacy `StorePathsService`.
 *
 * `paths()` est `null` tant que le load Crypto n'a pas fini, **ou** si aucune
 * valeur n'a jamais été persistée. Les guards path doivent attendre
 * `whenReady()` puis interpréter `null`/listes via fail-closed.
 */
@Service()
export class StorePathsService {
    private readonly storage = inject(STORAGE_PORT);
    private readonly STORAGE_KEY = 'paths_data';

    private readonly _paths = signal<string[] | null>(null);
    readonly paths = this._paths.asReadonly();

    private readonly _ready = signal(false);
    readonly ready = this._ready.asReadonly();

    private readonly readyGate: Promise<void>;
    private resolveReady!: () => void;

    constructor() {
        this.readyGate = new Promise<void>((resolve) => {
            this.resolveReady = resolve;
        });
        void this.load();
    }

    whenReady(): Promise<void> {
        return this.readyGate;
    }

    private async load(): Promise<void> {
        try {
            this._paths.set(
                await this.storage.getObfuscated<string[]>(this.STORAGE_KEY)
            );
        } catch (error) {
            // T3-7 (2026-08-13) — même défaut et même choix que
            // `SessionService.loadToken()` (voir sa docstring pour le
            // raisonnement complet) : absorbe l'exception pour éviter un
            // unhandled promise rejection, `console.error` en filet minimal
            // sans introduire de nouveau token `LoggerPort` dans
            // `type:application`.
            console.error(
                'StorePathsService: paths illisibles au démarrage',
                error
            );
        } finally {
            this._ready.set(true);
            this.resolveReady();
        }
    }

    async setPaths(paths: string[]): Promise<void> {
        await this.storage.saveObfuscated(this.STORAGE_KEY, paths);
        this._paths.set(paths);
    }
}
