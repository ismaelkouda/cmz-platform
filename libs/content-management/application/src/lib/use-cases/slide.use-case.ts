import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    SlideCreateContract,
    SlideDeleteContract,
    SlideDisableContract,
    SlideEntity,
    SlideEnableContract,
    SlideFilterContract,
    SlideRepository,
    SlideUpdateContract,
    slideCreateVo,
    slideDeleteVo,
    slideDisableVo,
    slideEnableVo,
    slideFilterEntity,
    slideFilterVo,
    slideUpdateVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class SlideUseCase {
    private readonly repository = inject(SlideRepository);

    execute(
        contract: SlideFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<SlideEntity>> {
        return defer(() =>
            this.repository.execute(
                slideFilterEntity(slideFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: SlideCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(slideCreateVo(contract)));
    }

    update(contract: SlideUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(slideUpdateVo(contract)));
    }

    delete(contract: SlideDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(slideDeleteVo(contract)));
    }

    enable(contract: SlideEnableContract): Observable<MessageEntity> {
        return defer(() => this.repository.enable(slideEnableVo(contract)));
    }

    disable(contract: SlideDisableContract): Observable<MessageEntity> {
        return defer(() => this.repository.disable(slideDisableVo(contract)));
    }
}
