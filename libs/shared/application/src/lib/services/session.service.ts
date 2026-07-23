import { Service, inject } from '@angular/core';
import { EncodingDataService } from '@cmz/shared-infra';

@Service()
export class SessionService {
    private readonly encoding = inject(EncodingDataService);

    clear(): void {
        this.encoding.removeKeysWithPrefix('token_data');
        this.encoding.removeKeysWithPrefix('user_data');
        this.encoding.clearEncryptedData();
        localStorage.clear();
        sessionStorage.clear();
        globalThis.location.reload();
    }
}
