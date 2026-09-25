import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
    imports: [TranslocoPipe],
    selector: 'app-page-66666666',
    template: `
        <main tabindex="-1">
            <h1>{{ 'page_6666666666666666.title' | transloco }}</h1>
            <p>{{ 'page_6666666666666666.pending' | transloco }}</p>
        </main>
    `,
})
export class PageComponent {}
