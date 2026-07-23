import { Service, inject, signal } from '@angular/core';
import { EncodingDataService } from '@cmz/shared-infra';

/**
 * Stocke la liste des chemins autorisés (persistée chiffrée).
 *
 * Modernisé : `signal` (au lieu de BehaviorSubject) + chargement **async**
 * (Web Crypto). Défauts source non reproduits : `OnInit`/`OnDestroy` sur un
 * service root (jamais déclenchés) supprimés ; double injection dédupliquée.
 */
@Service()
export class StorePathsService {
    private readonly encoding = inject(EncodingDataService);
    private readonly STORAGE_KEY = 'paths_data';

    private readonly _paths = signal<string[] | null>(null);
    readonly paths = this._paths.asReadonly();

    constructor() {
        void this.load();
    }

    private async load(): Promise<void> {
        this._paths.set(
            await this.encoding.getEncrypted<string[]>(this.STORAGE_KEY)
        );
    }

    async setPaths(paths: string[]): Promise<void> {
        await this.encoding.saveEncrypted(this.STORAGE_KEY, paths);
        this._paths.set(paths);
    }
}
