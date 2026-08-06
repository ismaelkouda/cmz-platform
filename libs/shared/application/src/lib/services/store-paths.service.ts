import { Service, inject, signal } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

@Service()
export class StorePathsService {
    private readonly storage = inject(StoragePort);
    private readonly STORAGE_KEY = 'paths_data';

    private readonly _paths = signal<string[] | null>(null);
    readonly paths = this._paths.asReadonly();

    constructor() {
        void this.load();
    }

    private async load(): Promise<void> {
        this._paths.set(
            await this.storage.getObfuscated<string[]>(this.STORAGE_KEY)
        );
    }

    async setPaths(paths: string[]): Promise<void> {
        await this.storage.saveObfuscated(this.STORAGE_KEY, paths);
        this._paths.set(paths);
    }
}
