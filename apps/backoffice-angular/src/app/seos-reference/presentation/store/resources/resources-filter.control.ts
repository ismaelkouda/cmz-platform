import { FormControl } from '@angular/forms';
import { RESOURCES_FILTER_KEYS } from '@pages/seos-reference/presentation/constants/resources/resources-filter-keys.constant';

export interface ResourcesFilterControl {
    [RESOURCES_FILTER_KEYS.SEARCH]: FormControl<string | undefined>;
    [RESOURCES_FILTER_KEYS.START_DATE]: FormControl<Date | undefined>;
    [RESOURCES_FILTER_KEYS.END_DATE]: FormControl<Date | undefined>;
}
