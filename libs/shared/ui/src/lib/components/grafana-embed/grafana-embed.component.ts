import {
    Component,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { TRUSTED_ORIGIN_PORT } from '../../tokens/trusted-origin-port.token';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Visionneuse Grafana générique — reconstruction de `shared/components/
 * dashboard-viewer` du source (utilisé par `monitoring` — 4 sections — et
 * référencé par `reporting`/`interactive-map`, non encore reconstruits).
 * Design-system pur (`--cmz-*`, sans dépendance à une lib UI tierce, comme
 * [[PaginationComponent]]) : pas de police d'icônes (`primeicons` n'est pas
 * une dépendance de ce monorepo — les classes `pi pi-*` du source, et donc
 * de `dashboard`, ne rendent en réalité aucune icône ; non corrigé ici, hors
 * périmètre de ce module) — icônes reconstruites en SVG inline.
 *
 * Écarts avec le source : pas de `BreadcrumbComponent`/`PageTitleComponent`
 * (aucun équivalent dans ce monorepo, breadcrumb jamais rendu — cf. doc
 * dashboard) ; le `console.log('this.grafanaLink: ', …)` de debug dans
 * `ngOnInit` n'est pas reproduit.
 */
@Component({
    selector: 'cmz-grafana-embed',
    imports: [SafeUrlPipe],
    template: `
        <section
            class="cmz-grafana-embed"
            [class.cmz-grafana-embed--fullscreen]="isFullscreen()"
        >
            <header class="cmz-grafana-embed__header">
                <h1 class="cmz-grafana-embed__title">{{ t(titleKey()) }}</h1>

                <div class="cmz-grafana-embed__actions">
                    <button
                        type="button"
                        class="cmz-grafana-embed__btn"
                        [disabled]="loading()"
                        [attr.aria-label]="t('COMMON.REFRESH')"
                        [title]="t('COMMON.REFRESH')"
                        (click)="refresh.emit()"
                    >
                        <svg
                            class="cmz-grafana-embed__icon"
                            [class.cmz-grafana-embed__icon--spin]="loading()"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                        >
                            <path
                                d="M20 11A8 8 0 0 0 6.3 6.3M4 13a8 8 0 0 0 13.7 4.7"
                            />
                            <path d="M20 4v7h-7M4 20v-7h7" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        class="cmz-grafana-embed__btn"
                        [attr.aria-label]="
                            isFullscreen()
                                ? t('COMMON.EXIT_FULLSCREEN')
                                : t('COMMON.ENTER_FULLSCREEN')
                        "
                        [title]="
                            isFullscreen()
                                ? t('COMMON.EXIT_FULLSCREEN')
                                : t('COMMON.ENTER_FULLSCREEN')
                        "
                        (click)="toggleFullscreen()"
                    >
                        <svg
                            class="cmz-grafana-embed__icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                        >
                            @if (isFullscreen()) {
                                <path
                                    d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"
                                />
                            } @else {
                                <path
                                    d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"
                                />
                            }
                        </svg>
                    </button>
                </div>
            </header>

            <div class="cmz-grafana-embed__body">
                @if (loading()) {
                    <div class="cmz-grafana-embed__state">
                        <span class="cmz-grafana-embed__spinner"></span>
                        <p class="cmz-grafana-embed__state-text">
                            {{ t(loadingLabelKey()) }}
                        </p>
                    </div>
                } @else if (error() || isBlocked()) {
                    <div class="cmz-grafana-embed__state">
                        <svg
                            class="cmz-grafana-embed__icon cmz-grafana-embed__icon--error"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                        >
                            <path
                                d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.5A1.5 1.5 0 0 0 3.9 20h16.2a1.5 1.5 0 0 0 1.3-2.5L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z"
                            />
                        </svg>
                        <p class="cmz-grafana-embed__state-text">
                            {{ t(errorLabelKey()) }}
                        </p>
                        <button
                            type="button"
                            class="cmz-grafana-embed__btn cmz-grafana-embed__btn--primary"
                            (click)="refresh.emit()"
                        >
                            {{ t('COMMON.RETRY') }}
                        </button>
                    </div>
                } @else if (grafanaLink(); as link) {
                    <iframe
                        class="cmz-grafana-embed__iframe"
                        [src]="link | safeUrl"
                        [title]="t(titleKey())"
                        frameborder="0"
                        allowfullscreen
                    ></iframe>
                }
            </div>
        </section>
    `,
    styles: `
        .cmz-grafana-embed {
            display: flex;
            flex-direction: column;
            gap: var(--cmz-space-4, 1rem);
            border: 1px solid var(--cmz-color-border, #e2e8f0);
            border-radius: var(--cmz-radius-lg, 0.75rem);
            background: var(--cmz-color-surface, #fff);
            overflow: hidden;
        }
        .cmz-grafana-embed--fullscreen {
            position: fixed;
            inset: 0;
            z-index: 1000;
            border-radius: 0;
        }
        .cmz-grafana-embed__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--cmz-space-3, 0.75rem);
            padding: var(--cmz-space-4, 1rem) var(--cmz-space-5, 1.25rem);
            border-bottom: 1px solid var(--cmz-color-border, #e2e8f0);
        }
        .cmz-grafana-embed__title {
            margin: 0;
            font-size: var(--cmz-font-size-lg, 1.125rem);
            font-weight: 600;
            color: var(--cmz-color-text, #0f172a);
        }
        .cmz-grafana-embed__actions {
            display: flex;
            gap: var(--cmz-space-2, 0.5rem);
        }
        .cmz-grafana-embed__btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.25rem;
            height: 2.25rem;
            border: 1px solid var(--cmz-color-border, #e2e8f0);
            border-radius: var(--cmz-radius, 0.375rem);
            background: var(--cmz-color-surface, #fff);
            color: var(--cmz-color-text, #0f172a);
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .cmz-grafana-embed__btn:hover:not(:disabled) {
            background: var(--cmz-color-surface-hover, #f1f5f9);
        }
        .cmz-grafana-embed__btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .cmz-grafana-embed__btn--primary {
            width: auto;
            padding: 0 var(--cmz-space-4, 1rem);
            background: var(--cmz-color-primary, #2563eb);
            border-color: var(--cmz-color-primary, #2563eb);
            color: var(--cmz-color-on-primary, #fff);
            font: inherit;
            font-weight: 500;
        }
        .cmz-grafana-embed__icon {
            width: 1.125rem;
            height: 1.125rem;
        }
        .cmz-grafana-embed__icon--spin {
            animation: cmz-grafana-embed-spin 1s linear infinite;
        }
        .cmz-grafana-embed__icon--error {
            width: 2.5rem;
            height: 2.5rem;
            color: var(--cmz-color-danger, #dc2626);
        }
        .cmz-grafana-embed__body {
            position: relative;
            min-height: 32rem;
        }
        .cmz-grafana-embed--fullscreen .cmz-grafana-embed__body {
            min-height: calc(100vh - 4.5rem);
        }
        .cmz-grafana-embed__iframe {
            width: 100%;
            height: 100%;
            min-height: inherit;
            border: none;
        }
        .cmz-grafana-embed__state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: var(--cmz-space-3, 0.75rem);
            min-height: inherit;
            padding: var(--cmz-space-6, 1.5rem);
            text-align: center;
        }
        .cmz-grafana-embed__state-text {
            margin: 0;
            color: var(--cmz-color-muted, #64748b);
            max-width: 26rem;
        }
        .cmz-grafana-embed__spinner {
            width: 2rem;
            height: 2rem;
            border: 3px solid var(--cmz-color-border, #e2e8f0);
            border-top-color: var(--cmz-color-primary, #2563eb);
            border-radius: 50%;
            animation: cmz-grafana-embed-spin 0.7s linear infinite;
        }
        @keyframes cmz-grafana-embed-spin {
            to {
                transform: rotate(360deg);
            }
        }
    `,
})
export class GrafanaEmbedComponent {
    readonly grafanaLink = input<string | undefined>(undefined);
    readonly titleKey = input.required<string>();
    readonly loadingLabelKey = input.required<string>();
    readonly errorLabelKey = input.required<string>();
    readonly loading = input.required<boolean>();
    readonly error = input.required<boolean>();
    readonly refresh = output<void>();

    private readonly i18n = inject(TranslocoService);
    private readonly trustedOrigin = inject(TRUSTED_ORIGIN_PORT);

    protected readonly isFullscreen = signal(false);

    /**
     * Audit I-14/I-15 : `grafanaLink` vient de la réponse backend, jamais
     * d'une constante de code — `SafeUrlPipe` bloque déjà le rendu de
     * l'iframe si l'origine n'est pas dans `APP_CONFIG.trustedFrameOrigins`
     * (c'est la barrière de sécurité réelle). Ce computed ne fait que piloter
     * l'affichage : montrer l'état d'erreur existant (réutilise
     * `errorLabelKey()`, pas de nouvelle clé i18n) plutôt qu'une iframe vide
     * sans `src` si le lien est bloqué.
     */
    protected readonly isBlocked = computed(() => {
        const link = this.grafanaLink();
        return !!link && !this.trustedOrigin.isTrustedFrameOrigin(link);
    });

    protected t(key: string): string {
        return this.i18n.translate(key);
    }

    protected toggleFullscreen(): void {
        this.isFullscreen.update((v) => !v);
    }
}
