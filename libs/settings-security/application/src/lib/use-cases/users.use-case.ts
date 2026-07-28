import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    UsersCreateContract,
    UsersDeleteContract,
    UsersDisableContract,
    UsersEnableContract,
    UsersEntity,
    UsersFilterContract,
    UsersRepository,
    UsersUpdateContract,
    usersCreateVo,
    usersDeleteVo,
    usersDisableVo,
    usersEnableVo,
    usersFilterVo,
    usersUpdateVo,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class UsersUseCase {
    private readonly repository = inject(UsersRepository);

    execute(
        contract: UsersFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<UsersEntity>> {
        return defer(() =>
            this.repository.execute(usersFilterVo(contract), page, options)
        );
    }

    create(contract: UsersCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(usersCreateVo(contract)));
    }

    update(contract: UsersUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(usersUpdateVo(contract)));
    }

    delete(contract: UsersDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(usersDeleteVo(contract)));
    }

    enable(contract: UsersEnableContract): Observable<MessageEntity> {
        return defer(() => this.repository.enable(usersEnableVo(contract)));
    }

    disable(contract: UsersDisableContract): Observable<MessageEntity> {
        return defer(() => this.repository.disable(usersDisableVo(contract)));
    }
}
