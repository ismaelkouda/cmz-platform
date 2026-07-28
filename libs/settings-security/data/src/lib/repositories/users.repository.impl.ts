import { Service, inject } from '@angular/core';
import {
    UsersCreateValidateContract,
    UsersDeleteValidateContract,
    UsersDisableValidateContract,
    UsersEntity,
    UsersFilterContract,
    UsersEnableValidateContract,
    UsersRepository,
    UsersUpdateValidateContract,
} from '@cmz/settings-security-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { usersCreateMapper } from '../mappers/users-create.mapper';
import { usersUpdateMapper } from '../mappers/users-update.mapper';
import { usersDeleteMapper } from '../mappers/users-delete.mapper';
import { usersEnableMapper } from '../mappers/users-enable.mapper';
import { usersDisableMapper } from '../mappers/users-disable.mapper';
import { UsersFilterMapper } from '../mappers/users-filter.mapper';
import { UsersMapper } from '../mappers/users.mapper';
import { UsersApi } from '../sources/users.api';

@Service()
export class UsersRepositoryImpl implements UsersRepository {
    private readonly api = inject(UsersApi);
    private readonly mapper = inject(UsersMapper);
    private readonly messageMapper = inject(MessageResultMapper);
    private readonly filterMapper = inject(UsersFilterMapper);

    execute(
        filter: UsersFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<UsersEntity>> {
        return this.api
            .readAll(this.filterMapper.mapContractToApi(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: UsersCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(usersCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: UsersUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(usersUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: UsersDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(usersDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: UsersEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(usersEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: UsersDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(usersDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
