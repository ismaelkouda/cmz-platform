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
        const data =
            await this.storage.getObfuscated<PermissionMap>(
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
