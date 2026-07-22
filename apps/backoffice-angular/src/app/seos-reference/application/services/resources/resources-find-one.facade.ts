import { inject, Injectable } from '@angular/core';
import { ResourcesFindOneFilterDto } from '@pages/seos-reference/application/dto/resources/resources-find-one-filter.dto';
import { ResourcesFindOneQuery } from '@pages/seos-reference/application/queries/resources/resources-find-one.query';
import { ResourcesFindOneBus } from '@pages/seos-reference/application/queries-bus/resources/resources-find-one.bus';
import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { ObjectBaseFacade } from '@shared/application/services/object-base-facade';
import { UiFeedbackService } from '@shared/domain/services/ui-feedback.service';
import { FetchOptions } from '@shared/interface/fetch-options.interface';

@Injectable({
    providedIn: 'root',
})
export class ResourcesFindOneFacade extends ObjectBaseFacade<
    ResourcesFindOneEntity,
    ResourcesFindOneFilterDto
> {
    private readonly ui = inject(UiFeedbackService);
    private readonly bus = inject(ResourcesFindOneBus);

    read(filter: ResourcesFindOneFilterDto, options: FetchOptions = {}): void {
        const command = new ResourcesFindOneQuery(filter.uniqId);
        const fetch$ = this.bus.dispatch(command, options);
        this.fetch(filter, fetch$, this.ui);
    }
}
