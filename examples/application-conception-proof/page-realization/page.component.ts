import { Component, input, output } from '@angular/core';

type PageState = 'failed' | 'offline' | 'ready' | 'submitted';

@Component({
    selector: 'app-page-conception-proof',
    templateUrl: './page.component.html',
    styleUrl: './page.component.scss',
})
export class PageComponent {
    readonly state = input<PageState>('ready');
    readonly noteSubmitted = output<string>();

    submit(event: SubmitEvent, message: string): void {
        event.preventDefault();
        const normalized = message.trim();
        if (normalized.length > 0) this.noteSubmitted.emit(normalized);
    }
}
