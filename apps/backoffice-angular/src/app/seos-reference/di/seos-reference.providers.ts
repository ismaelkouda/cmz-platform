import { Provider } from '@angular/core';

import { resourcesFindOneProviders } from '@pages/seos-reference/di/resources/resources-find-one.providers';
import { resourcesSelectProviders } from '@pages/seos-reference/di/resources/resources-select.providers';
import { resourcesProviders } from '@pages/seos-reference/di/resources/resources.providers';

export const provideSeosReference = (): Provider[] => [
    ...resourcesProviders,
    ...resourcesFindOneProviders,
    ...resourcesSelectProviders,
];
