import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NOTIFICATION_PORT } from '@cmz/shared-application';
import { TranslocoService } from '@jsverse/transloco';
import { CONFIRM_DIALOG_PORT } from '@cmz/shared-ui';
import {
    RequestsDetailsEntity,
    RequestsDetailsStatus,
    RequestsDetailsQualificationContract,
} from '@cmz/requests-domain';
import { RequestsDetailsFacade } from '@cmz/requests-application';
import { RequestsDetailsDialogComponent } from '@cmz/requests-ui';

/**
 * T13-13 (`taches-restantes.md`) — trouvé lors de l'audit self-review
 * post-ADR-0022 (2026-08-11) : `onQualificationSubmit` (catch-block de
 * validation) n'avait aucun test — c'est le seul call site qui invoque
 * `requestsDetailsQualificationVo(form, MODULE_PREFIX)` côté UI, hors
 * couche domaine déjà testée (`workflow-details-qualification.vo.spec.ts`).
 *
 * Placé sous `apps/backoffice-angular/src/app/` (pas dans `libs/requests/
 * ui`) : c'est ici que vivent déjà les seuls specs `TestBed` du monorepo
 * (`a11y/*.a11y.spec.ts`) — `@angular/build:unit-test` (jsdom) ne scanne
 * que `apps/backoffice-angular/src/**` (`tsconfig.spec.json`), pas les
 * libs (qui tournent sous Vitest `environment: 'node'`, sans DOM).
 *
 * Façade/ports **fake** (pas les adaptateurs réels + HTTP mocké comme les
 * specs a11y) : le but ici est un test unitaire ciblé sur une seule
 * branche d'un seul composant, pas un rendu de page complet — reconstruire
 * le DTO API complet (`RequestsDetailsItemApiDto`, ~40 champs legacy) pour
 * charger la fiche via HTTP aurait ajouté un risque de mapper mal formé
 * sans rien tester de plus sur le vrai risque (le call site catch/notify).
 *
 * Polyfill `HTMLDialogElement` : la version de jsdom de ce monorepo
 * n'implémente ni `showModal()` ni `close()` (`typeof dlg.close ===
 * 'undefined'`, vérifié directement) — `close()` du composant (appelé en
 * fin de flux approve/reject) plante sinon avec « close is not a function ».
 * Limite d'environnement de test générale, pas spécifique à ce fichier —
 * vaut d'être remontée si un futur test veut ouvrir le dialog via
 * `visible=true` (`showModal()` échouerait pareillement).
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

function makeEntity(): RequestsDetailsEntity {
    const props = {
        uniqId: 'REQ-777',
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description',
        placeDescription: 'Lieu',
        placePhoto: null,
        status: RequestsDetailsStatus.IN_PROGRESS,
        qualificationState: 'pending',
        location: {
            coordinates: { latitude: 3.86, longitude: 11.5, what3words: '' },
            name: 'residence_place',
            description: '',
            method: 'gps',
            type: 'point',
        },
        media: null,
    };
    return new RequestsDetailsEntity(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fixture legacy props partielle, cf. workflow-details.entity.spec.ts
        props as any,
        { canTake: false, canQualify: true }
    );
}

describe('RequestsDetailsDialogComponent.onQualificationSubmit — catch-block validation (T13-13)', () => {
    function setup() {
        const fakeFacade = {
            value: () => makeEntity(),
            isLoading: () => false,
            actionLoading: () => false,
            error: () => null,
            loadDetails: vi.fn(),
            take: vi.fn(),
            approve: vi.fn(),
            reject: vi.fn(),
        };
        const fakeConfirm = {
            confirm: vi.fn().mockResolvedValue(true),
            alert: vi.fn().mockResolvedValue(undefined),
        };
        const fakeNotification = {
            notify: vi.fn(),
            success: vi.fn(),
            error: vi.fn(),
            warning: vi.fn(),
            info: vi.fn(),
        };
        const fakeI18n = {
            translate: (key: string) => key,
            setLanguage: vi.fn().mockResolvedValue(undefined),
            get currentLanguage() {
                return 'fr';
            },
        };

        TestBed.configureTestingModule({
            imports: [RequestsDetailsDialogComponent],
            providers: [
                { provide: RequestsDetailsFacade, useValue: fakeFacade },
                { provide: CONFIRM_DIALOG_PORT, useValue: fakeConfirm },
                { provide: NOTIFICATION_PORT, useValue: fakeNotification },
                { provide: TranslocoService, useValue: fakeI18n },
            ],
        });

        const fixture = TestBed.createComponent(RequestsDetailsDialogComponent);
        return { fixture, fakeFacade, fakeConfirm, fakeNotification };
    }

    it("formulaire invalide (rejet sans motif/commentaire) → notifie l'erreur, ne confirme jamais, n'appelle ni approve ni reject", async () => {
        const { fixture, fakeConfirm, fakeNotification, fakeFacade } = setup();
        const invalidForm: RequestsDetailsQualificationContract = {
            decision: 'rejected',
            comment: '',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        };

        await (
            fixture.componentInstance as unknown as {
                onQualificationSubmit(
                    f: RequestsDetailsQualificationContract
                ): Promise<void>;
            }
        ).onQualificationSubmit(invalidForm);

        expect(fakeNotification.error).toHaveBeenCalledWith(
            'REQUESTS.DETAILS.QUALIFICATION.VALIDATION_ERROR'
        );
        expect(fakeConfirm.confirm).not.toHaveBeenCalled();
        expect(fakeFacade.approve).not.toHaveBeenCalled();
        expect(fakeFacade.reject).not.toHaveBeenCalled();
    });

    it("formulaire valide (approbation) → pas de notification d'erreur, passe par la confirmation puis approve", async () => {
        const { fixture, fakeConfirm, fakeNotification, fakeFacade } = setup();
        const validForm: RequestsDetailsQualificationContract = {
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        };

        await (
            fixture.componentInstance as unknown as {
                onQualificationSubmit(
                    f: RequestsDetailsQualificationContract
                ): Promise<void>;
            }
        ).onQualificationSubmit(validForm);

        expect(fakeNotification.error).not.toHaveBeenCalled();
        expect(fakeConfirm.confirm).toHaveBeenCalledTimes(1);
        expect(fakeFacade.approve).toHaveBeenCalledTimes(1);
        expect(fakeFacade.reject).not.toHaveBeenCalled();
    });

    it("l'utilisateur annule la confirmation → n'appelle ni approve ni reject", async () => {
        const { fixture, fakeConfirm, fakeFacade } = setup();
        fakeConfirm.confirm.mockResolvedValue(false);
        const validForm: RequestsDetailsQualificationContract = {
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        };

        await (
            fixture.componentInstance as unknown as {
                onQualificationSubmit(
                    f: RequestsDetailsQualificationContract
                ): Promise<void>;
            }
        ).onQualificationSubmit(validForm);

        expect(fakeFacade.approve).not.toHaveBeenCalled();
        expect(fakeFacade.reject).not.toHaveBeenCalled();
    });
});
