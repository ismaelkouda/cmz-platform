import { Service, computed, inject, signal, type Signal } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

type PermissionMap = Record<string, string[]>;

@Service()
export class PermissionActionsService {
    private readonly storage = inject(StoragePort);
    private readonly _permissions = signal<PermissionMap>({});
    readonly permissions = this._permissions.asReadonly();

    constructor() {
        void this.load();
    }

    private async load(): Promise<void> {
        const data =
            await this.storage.getEncrypted<PermissionMap>(
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
