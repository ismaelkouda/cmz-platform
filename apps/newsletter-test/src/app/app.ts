import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ActionRequestCommands } from '@cmz/newsletter-angular-application';

// Note conformité Angular 22 / Transloco v8 (audit 2026-08-27, voir
// docs/architecture/i18n-generator-scope.md) : la directive structurelle
// *transloco="let t" reste le pattern OFFICIELLEMENT RECOMMANDÉ par la doc
// Transloco pour le template ("the recommended approach as it is DRY and
// efficient... single subscription per template") — donc conservée ici pour
// t(). Seul transloco.activeLang (Signal natif exposé par TranslocoService
// depuis v8) remplace l'appel impératif getActiveLang() : ce dernier était
// ré-évalué à chaque cycle de détection de changement au lieu de s'intégrer
// nativement au graphe de Signals, incohérent avec le reste du composant
// (state ci-dessous est déjà un signal()).

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
    private readonly transloco = inject(TranslocoService);
    protected readonly activeLang = this.transloco.activeLang;

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
