import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NOTIFICATION_PORT, TRANSLATION_PORT } from '@cmz/shared-application';
import { CONFIRM_DIALOG_PORT } from '@cmz/shared-ui';
import {
    ReportStatesDetailsEntity,
    ReportStatesDetailsStatus,
    ReportStatesDetailsQualificationContract,
} from '@cmz/report-states-domain';
import { ReportStatesDetailsFacade } from '@cmz/report-states-application';
import { ReportStatesDetailsDialogComponent } from '@cmz/report-states-ui';

/**
 * T13-13 (`taches-restantes.md`) — pendant exact de
 * `requests-details-dialog.spec.ts` pour `report-states` (même dialog, même
 * `onQualificationSubmit`, même risque : le seul call site UI qui invoque
 * `reportStatesDetailsQualificationVo(form, MODULE_PREFIX)`). Voir ce
 * fichier pour la justification complète (placement app-level, façade/ports
 * fake plutôt que HTTP mocké, polyfill `HTMLDialogElement`).
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

function makeEntity(): ReportStatesDetailsEntity {
    const props = {
        uniqId: 'REP-777',
        reportType: 'ABI',
        operators: ['MTN'],
        description: 'Description',
        placeDescription: 'Lieu',
        placePhoto: null,
        status: ReportStatesDetailsStatus.IN_PROGRESS,
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
    return new ReportStatesDetailsEntity(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fixture legacy props partielle, cf. workflow-details.entity.spec.ts
        props as any,
        { canTake: false, canQualify: true }
    );
}

describe('ReportStatesDetailsDialogComponent.onQualificationSubmit — catch-block validation (T13-13)', () => {
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
            imports: [ReportStatesDetailsDialogComponent],
            providers: [
                { provide: ReportStatesDetailsFacade, useValue: fakeFacade },
                { provide: CONFIRM_DIALOG_PORT, useValue: fakeConfirm },
                { provide: NOTIFICATION_PORT, useValue: fakeNotification },
                { provide: TRANSLATION_PORT, useValue: fakeI18n },
            ],
        });

        const fixture = TestBed.createComponent(
            ReportStatesDetailsDialogComponent
        );
        return { fixture, fakeFacade, fakeConfirm, fakeNotification };
    }

    it("formulaire invalide (rejet sans motif/commentaire) → notifie l'erreur, ne confirme jamais, n'appelle ni approve ni reject", async () => {
        const { fixture, fakeConfirm, fakeNotification, fakeFacade } = setup();
        const invalidForm: ReportStatesDetailsQualificationContract = {
            decision: 'rejected',
            comment: '',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        };

        await (
            fixture.componentInstance as unknown as {
                onQualificationSubmit(
                    f: ReportStatesDetailsQualificationContract
                ): Promise<void>;
            }
        ).onQualificationSubmit(invalidForm);

        expect(fakeNotification.error).toHaveBeenCalledWith(
            'REPORT_STATES.DETAILS.QUALIFICATION.VALIDATION_ERROR'
        );
        expect(fakeConfirm.confirm).not.toHaveBeenCalled();
        expect(fakeFacade.approve).not.toHaveBeenCalled();
        expect(fakeFacade.reject).not.toHaveBeenCalled();
    });

    it("formulaire valide (approbation) → pas de notification d'erreur, passe par la confirmation puis approve", async () => {
        const { fixture, fakeConfirm, fakeNotification, fakeFacade } = setup();
        const validForm: ReportStatesDetailsQualificationContract = {
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        };

        await (
            fixture.componentInstance as unknown as {
                onQualificationSubmit(
                    f: ReportStatesDetailsQualificationContract
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
        const validForm: ReportStatesDetailsQualificationContract = {
            decision: 'accepted',
            comment: 'OK',
            reason: '',
            approvalType: 'view',
            callbackType: null,
        };

        await (
            fixture.componentInstance as unknown as {
                onQualificationSubmit(
                    f: ReportStatesDetailsQualificationContract
                ): Promise<void>;
            }
        ).onQualificationSubmit(validForm);

        expect(fakeFacade.approve).not.toHaveBeenCalled();
        expect(fakeFacade.reject).not.toHaveBeenCalled();
    });
});
