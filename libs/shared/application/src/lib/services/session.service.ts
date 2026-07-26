import { Service, inject } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

@Service()
export class SessionService {
    private readonly storage = inject(StoragePort);

    async clear(): Promise<void> {
        await this.storage.removeKeysWithPrefix('token_data');
        await this.storage.removeKeysWithPrefix('user_data');
        await this.storage.clearEncrypted();
        localStorage.clear();
        sessionStorage.clear();
        globalThis.location.reload();
    }
}
