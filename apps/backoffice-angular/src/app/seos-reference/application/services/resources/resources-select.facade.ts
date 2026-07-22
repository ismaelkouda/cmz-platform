import { inject, Injectable } from '@angular/core';
import { ResourcesSelectUseCase } from '@pages/seos-reference/application/use-cases/resources/resources-select.use-case';
import { ArrayBaseFacade } from '@shared/application/services/array-base-facade';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { UiFeedbackService } from '@shared/domain/services/ui-feedback.service';
import { FetchOptions } from '@shared/interface/fetch-options.interface';

@Injectable({
    providedIn: 'root',
})
export class ResourcesSelectFacade extends ArrayBaseFacade<SelectOption, void> {
    private readonly uiFeedback = inject(UiFeedbackService);
    private readonly useCase = inject(ResourcesSelectUseCase);

    readAll(options: FetchOptions = {}): void {
        this.fetchWithFilter(
            null,
            this.useCase.readAll.bind(this.useCase, options),
            this.uiFeedback
        );
    }
}
