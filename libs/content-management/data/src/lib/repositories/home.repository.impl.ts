import { Service, inject } from '@angular/core';
import {
    HomeCreateProps,
    HomeDeleteValidateContract,
    HomeDisableValidateContract,
    HomeEnableValidateContract,
    HomeEntity,
    HomeFilterContract,
    HomeRepository,
    HomeUpdateProps,
} from '@cmz/content-management-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { HomeCreateMapper } from '../mappers/home-create.mapper';
import { HomeUpdateMapper } from '../mappers/home-update.mapper';
import { homeDeleteMapper } from '../mappers/home-delete.mapper';
import { homeEnableMapper } from '../mappers/home-enable.mapper';
import { homeDisableMapper } from '../mappers/home-disable.mapper';
import { homeFilterMapper } from '../mappers/home-filter.mapper';
import { HomeMapper } from '../mappers/home.mapper';
import { HomeApi } from '../sources/home.api';

@Service()
export class HomeRepositoryImpl implements HomeRepository {
    private readonly api = inject(HomeApi);
    private readonly mapper = inject(HomeMapper);
    private readonly createMapper = inject(HomeCreateMapper);
    private readonly updateMapper = inject(HomeUpdateMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: HomeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<HomeEntity>> {
        return this.api
            .readAll(homeFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(props: HomeCreateProps): Observable<MessageEntity> {
        return this.api
            .create(this.createMapper.map(props))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(props: HomeUpdateProps): Observable<MessageEntity> {
        return this.api
            .update(this.updateMapper.map(props))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: HomeDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(homeDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: HomeEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(homeEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: HomeDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(homeDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
