import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TRANSLATION_PORT } from '@cmz/shared-application';
import {
    CmzConfirmDialogService,
    CmzNotificationService,
    DialogOutletComponent,
    ToastOutletComponent,
} from '@cmz/shared-ui';

/**
 * T12-3 (P2, 2026-08-13) — `ToastOutletComponent`/`DialogOutletComponent`
 * n'avaient jamais de test de comportement (seulement mentionnés en passant
 * dans `app.spec.ts`, qui vérifie juste que l'arbre DI de `App` se crée).
 * Placés ici (pas dans `libs/shared/ui`) pour la même raison que T13-13 :
 * `libs/*` tourne sous Vitest `environment: 'node'` (pas de DOM), seul
 * `apps/backoffice-angular` a `@angular/build:unit-test` en jsdom. Même
 * polyfill `HTMLDialogElement` que `report-states-details-dialog.spec.ts` /
 * `requests-details-dialog.spec.ts` — jsdom de ce monorepo n'implémente ni
 * `showModal()` ni `close()`.
 */
if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (): void {
        this.setAttribute('open', '');
    };
}
if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (): void {
        this.removeAttribute('open');
    };
}

describe('ToastOutletComponent', () => {
    function setup() {
        TestBed.configureTestingModule({
            imports: [ToastOutletComponent],
        });
        const fixture = TestBed.createComponent(ToastOutletComponent);
        const notification = TestBed.inject(CmzNotificationService);
        return { fixture, notification };
    }

    it('ne rend aucun toast tant que le service n’en a émis aucun', () => {
        const { fixture } = setup();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelectorAll('.cmz-toast')
        ).toHaveLength(0);
    });

    it('rend un toast par entrée du service, avec le texte et la sévérité corrects', () => {
        const { fixture, notification } = setup();
        notification.success('Enregistré');
        fixture.detectChanges();

        const toastEls = fixture.nativeElement.querySelectorAll('.cmz-toast');
        expect(toastEls).toHaveLength(1);
        expect(toastEls[0].textContent).toContain('Enregistré');
        expect(toastEls[0].classList.contains('cmz-toast--success')).toBe(true);
    });

    it('un toast error a role="alert" et aria-live="assertive" (pas les autres sévérités)', () => {
        const { fixture, notification } = setup();
        notification.error('Échec');
        notification.info('Info');
        fixture.detectChanges();

        const toastEls = fixture.nativeElement.querySelectorAll('.cmz-toast');
        expect(toastEls[0].getAttribute('role')).toBe('alert');
        expect(toastEls[0].getAttribute('aria-live')).toBe('assertive');
        expect(toastEls[1].getAttribute('role')).toBe('status');
        expect(toastEls[1].getAttribute('aria-live')).toBe('polite');
    });

    it('cliquer sur le bouton de fermeture appelle dismiss() et retire le toast du DOM', () => {
        const { fixture, notification } = setup();
        notification.success('Enregistré');
        fixture.detectChanges();

        const closeBtn = fixture.nativeElement.querySelector(
            '.cmz-toast__close'
        ) as HTMLButtonElement;
        closeBtn.click();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelectorAll('.cmz-toast')
        ).toHaveLength(0);
    });
});

describe('DialogOutletComponent', () => {
    function setup() {
        TestBed.configureTestingModule({
            imports: [DialogOutletComponent],
            providers: [
                {
                    provide: TRANSLATION_PORT,
                    useValue: { translate: (key: string) => key },
                },
            ],
        });
        const fixture = TestBed.createComponent(DialogOutletComponent);
        const dialogService = TestBed.inject(CmzConfirmDialogService);
        return { fixture, dialogService };
    }

    it('le <dialog> natif n’est pas ouvert tant qu’aucune confirmation n’est en cours', () => {
        const { fixture } = setup();
        fixture.detectChanges();

        const dlg = fixture.nativeElement.querySelector('dialog');
        expect(dlg.open).toBe(false);
    });

    it('confirm() ouvre le dialog et affiche le message', () => {
        const { fixture, dialogService } = setup();
        fixture.detectChanges();
        void dialogService.confirm('Confirmer la suppression ?');
        fixture.detectChanges();

        const dlg = fixture.nativeElement.querySelector('dialog');
        expect(dlg.open).toBe(true);
        expect(dlg.textContent).toContain('Confirmer la suppression ?');
    });

    it('cliquer sur le bouton primaire résout confirm() à true et referme le dialog', async () => {
        const { fixture, dialogService } = setup();
        fixture.detectChanges();
        const promise = dialogService.confirm('x');
        fixture.detectChanges();

        const confirmBtn = fixture.nativeElement.querySelector(
            '.cmz-dialog__btn--primary'
        ) as HTMLButtonElement;
        confirmBtn.click();
        fixture.detectChanges();

        await expect(promise).resolves.toBe(true);
        const dlg = fixture.nativeElement.querySelector('dialog');
        expect(dlg.open).toBe(false);
    });

    it('cliquer sur le bouton secondaire (annuler) résout confirm() à false — absent en mode alert', async () => {
        const { fixture, dialogService } = setup();
        fixture.detectChanges();
        const promise = dialogService.confirm('x');
        fixture.detectChanges();

        const cancelBtn = fixture.nativeElement.querySelector(
            '.cmz-dialog__btn:not(.cmz-dialog__btn--primary)'
        ) as HTMLButtonElement;
        expect(cancelBtn).not.toBeNull();
        cancelBtn.click();

        await expect(promise).resolves.toBe(false);
    });

    it('mode alert() n’affiche pas de bouton d’annulation', () => {
        const { fixture, dialogService } = setup();
        fixture.detectChanges();
        void dialogService.alert('Information');
        fixture.detectChanges();

        const buttons =
            fixture.nativeElement.querySelectorAll('.cmz-dialog__btn');
        expect(buttons).toHaveLength(1);
        expect(buttons[0].classList.contains('cmz-dialog__btn--primary')).toBe(
            true
        );
    });

    it('événement natif "cancel" (touche Escape) résout confirm() à false', async () => {
        const { fixture, dialogService } = setup();
        fixture.detectChanges();
        const promise = dialogService.confirm('x');
        fixture.detectChanges();

        const dlg = fixture.nativeElement.querySelector('dialog');
        dlg.dispatchEvent(new Event('cancel', { cancelable: true }));

        await expect(promise).resolves.toBe(false);
    });
});
