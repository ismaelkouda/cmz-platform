import { Service } from '@angular/core';
import { NavigationPort } from '@cmz/shared-domain';

@Service()
export class BrowserNavigationAdapter implements NavigationPort {
    reload(): void {
        globalThis.location.reload();
    }
}
