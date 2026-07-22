import { FormControl } from '@angular/forms';
import { RESOURCES_FORM_KEYS } from '@pages/seos-reference/presentation/constants/resources/resources-form-keys.constant';

export interface ResourcesFormControl {
    [RESOURCES_FORM_KEYS.CODE]: FormControl<string | undefined>;
    [RESOURCES_FORM_KEYS.NAME]: FormControl<string | undefined>;
    [RESOURCES_FORM_KEYS.DESCRIPTION]: FormControl<string | undefined>;
}
