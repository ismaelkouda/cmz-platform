import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ResourcesFilterDto } from '@pages/seos-reference/application/dto/resources/resources-filter.dto';
import { ResourcesFilterControl } from '@pages/seos-reference/presentation/store/resources/resources-filter.control';
import { RESOURCES_FILTER_KEYS } from '@pages/seos-reference/presentation/constants/resources/resources-filter-keys.constant';

@Injectable()
export class ResourcesFilterStore {
    private readonly fb = inject(FormBuilder);

    readonly form: FormGroup<ResourcesFilterControl> =
        this.fb.group<ResourcesFilterControl>({
            [RESOURCES_FILTER_KEYS.SEARCH]: new FormControl<string | undefined>(
                undefined,
                {
                    nonNullable: true,
                }
            ),
            [RESOURCES_FILTER_KEYS.START_DATE]: new FormControl<
                Date | undefined
            >(undefined, {
                nonNullable: true,
            }),
            [RESOURCES_FILTER_KEYS.END_DATE]: new FormControl<Date | undefined>(
                undefined,
                {
                    nonNullable: true,
                }
            ),
        });

    reset(): void {
        this.form.reset();
    }

    get value(): ResourcesFilterDto {
        const raw = this.form.getRawValue();
        return {
            [RESOURCES_FILTER_KEYS.SEARCH]:
                raw[RESOURCES_FILTER_KEYS.SEARCH] || undefined,
            [RESOURCES_FILTER_KEYS.START_DATE]:
                raw[RESOURCES_FILTER_KEYS.START_DATE] || undefined,
            [RESOURCES_FILTER_KEYS.END_DATE]:
                raw[RESOURCES_FILTER_KEYS.END_DATE] || undefined,
        };
    }
}
