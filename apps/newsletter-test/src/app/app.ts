import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ActionRequestCommands } from '@cmz/newsletter-angular';

type SubmissionState =
    | { readonly kind: 'idle' }
    | { readonly kind: 'pending' }
    | {
          readonly kind: 'success';
          readonly subscriptionId: string;
          readonly message: string;
      }
    | { readonly kind: 'error'; readonly message: string };

@Component({
    imports: [FormsModule, TranslocoDirective],
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    private readonly commands = inject(ActionRequestCommands);
    protected readonly transloco = inject(TranslocoService);

    protected email = '';
    protected readonly state = signal<SubmissionState>({ kind: 'idle' });

    protected switchLanguage(lang: string): void {
        this.transloco.setActiveLang(lang);
    }

    protected submit(): void {
        this.state.set({ kind: 'pending' });
        this.commands.subscribeNewsletter({ email: this.email }).subscribe({
            next: (result) =>
                this.state.set({
                    kind: 'success',
                    subscriptionId: result.subscription_id,
                    message: result.message,
                }),
            error: (error: unknown) =>
                this.state.set({
                    kind: 'error',
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Échec inconnu',
                }),
        });
    }
}
