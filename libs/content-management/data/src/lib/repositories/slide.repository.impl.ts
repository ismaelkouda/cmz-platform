import { Service, inject } from '@angular/core';
import {
    SlideCreateProps,
    SlideDeleteValidateContract,
    SlideDisableValidateContract,
    SlideEnableValidateContract,
    SlideEntity,
    SlideFilterContract,
    SlideRepository,
    SlideUpdateProps,
} from '@cmz/content-management-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { SlideCreateMapper } from '../mappers/slide-create.mapper';
import { SlideUpdateMapper } from '../mappers/slide-update.mapper';
import { slideDeleteMapper } from '../mappers/slide-delete.mapper';
import { slideEnableMapper } from '../mappers/slide-enable.mapper';
import { slideDisableMapper } from '../mappers/slide-disable.mapper';
import { slideFilterMapper } from '../mappers/slide-filter.mapper';
import { SlideMapper } from '../mappers/slide.mapper';
import { SlideApi } from '../sources/slide.api';

@Service()
export class SlideRepositoryImpl implements SlideRepository {
    private readonly api = inject(SlideApi);
    private readonly mapper = inject(SlideMapper);
    private readonly createMapper = inject(SlideCreateMapper);
    private readonly updateMapper = inject(SlideUpdateMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: SlideFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SlideEntity>> {
        return this.api
            .readAll(slideFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(props: SlideCreateProps): Observable<MessageEntity> {
        return this.api
            .create(this.createMapper.map(props))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(props: SlideUpdateProps): Observable<MessageEntity> {
        return this.api
            .update(this.updateMapper.map(props))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: SlideDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(slideDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: SlideEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(slideEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: SlideDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(slideDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
