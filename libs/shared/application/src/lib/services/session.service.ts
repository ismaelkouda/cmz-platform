import { Service, inject } from '@angular/core';
import {
    AuthToken,
    CurrentUser,
    NavigationPort,
    StoragePort,
} from '@cmz/shared-domain';

@Service()
export class SessionService {
    private readonly storage = inject(StoragePort);
    private readonly navigation = inject(NavigationPort);

    async save(user: CurrentUser, token: AuthToken): Promise<void> {
        await this.storage.saveEncrypted('user_data', user);
        await this.storage.saveEncrypted('token_data', token);
        await this.storage.saveEncrypted('menu', user.permissions);
        await this.storage.saveEncrypted('permissionsActions', user.actions);
    }

    async clear(): Promise<void> {
        this.storage.clearAll();
        this.navigation.reload();
    }
}
