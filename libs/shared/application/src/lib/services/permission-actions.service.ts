import { Service, computed, inject, signal, type Signal } from '@angular/core';
import { STORAGE_PORT } from '../tokens/storage-port.token';

type PermissionMap = Record<string, string[]>;

@Service()
export class PermissionActionsService {
    private readonly storage = inject(STORAGE_PORT);
    private readonly _permissions = signal<PermissionMap>({});
    readonly permissions = this._permissions.asReadonly();

    constructor() {
        void this.load();
    }

    private async load(): Promise<void> {
        // T3-7 (2026-08-13, même famille que SessionService.loadToken()/
        // StorePathsService.load()) : sans ce `catch`, une exception de
        // `getObfuscated` (payload corrompu, tag AES-GCM invalide) fuirait
        // hors de `void this.load()` (constructeur) — unhandled promise
        // rejection. Fail-closed déjà correct par construction ici :
        // `_permissions` reste à son défaut `{}` (posé à la déclaration du
        // signal) si `load()` échoue avant `.set()`, donc `can()` continue
        // de répondre `false` pour toute route — aucun changement de
        // comportement sécurité, seulement absorption + trace de l'erreur.
        try {
            const data =
                await this.storage.getObfuscated<PermissionMap>(
                    'permissionsActions'
                );
            this._permissions.set(data ?? {});
        } catch (error) {
            console.error(
                'PermissionActionsService: permissions illisibles au démarrage',
                error
            );
        }
    }

    can(route: string, action: string): Signal<boolean> {
        return computed(
            () => this._permissions()[route]?.includes(action) ?? false
        );
    }
}
