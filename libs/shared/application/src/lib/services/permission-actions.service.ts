import { Service, computed, inject, signal, type Signal } from '@angular/core';
import { EncodingDataService } from '@cmz/shared-infra';

type PermissionMap = Record<string, string[]>;

/**
 * Permissions d'action par route, lues depuis le stockage chiffré.
 *
 * La lecture est **asynchrone** (Web Crypto) : le signal s'initialise vide puis
 * se remplit après déchiffrement — `can()` réagit automatiquement.
 */
@Service()
export class PermissionActionsService {
    private readonly encoding = inject(EncodingDataService);
    private readonly _permissions = signal<PermissionMap>({});
    readonly permissions = this._permissions.asReadonly();

    constructor() {
        void this.load();
    }

    private async load(): Promise<void> {
        const data =
            await this.encoding.getEncrypted<PermissionMap>(
                'permissionsActions'
            );
        this._permissions.set(data ?? {});
    }

    can(route: string, action: string): Signal<boolean> {
        return computed(
            () => this._permissions()[route]?.includes(action) ?? false
        );
    }
}
