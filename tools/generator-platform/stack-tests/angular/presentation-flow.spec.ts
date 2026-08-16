import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { PresentationFlowViolation } from '../../.stack-test-runtime/angular/presentation-flow/presentation-flow-engine';
import { PresentationFlowService } from '../../.stack-test-runtime/angular/presentation-flow/presentation-flow.service';

afterEach(() => {
    TestBed.resetTestingModule();
});

function configure() {
    TestBed.configureTestingModule({
        providers: [PresentationFlowService],
    });
    return TestBed.inject(PresentationFlowService);
}

const requestValues = {
    email: 'person@example.com',
    subject: 'Cannot open a report',
    message: 'The report remains unavailable.',
    priority: 'high',
};

describe('presentation flow Angular action-request wizard', () => {
    it('démarre sur la première étape déclarée par le contrat directeur', () => {
        const service = configure();
        expect(service.step).toBe('request');
    });

    it('refuse d’avancer tant que l’étape courante est incomplète (fail-closed)', () => {
        const service = configure();
        expect(() =>
            service.advance('review', { email: 'person@example.com' })
        ).toThrow(PresentationFlowViolation);
        expect(service.step).toBe('request');
    });

    it('avance request -> review une fois l’étape courante complète', () => {
        const service = configure();
        expect(service.advance('review', requestValues)).toBe('review');
        expect(service.step).toBe('review');
    });

    it('avance review -> confirmation (étape sans champ, toujours complète)', () => {
        const service = configure();
        service.advance('review', requestValues);
        expect(service.advance('confirmation', {})).toBe('confirmation');
        expect(service.step).toBe('confirmation');
    });

    it('refuse de sauter une étape hors ordre déclaré (fail-closed)', () => {
        const service = configure();
        expect(() => service.advance('confirmation', requestValues)).toThrow(
            PresentationFlowViolation
        );
        expect(service.step).toBe('request');
    });

    it('refuse une étape cible inconnue sans jamais changer l’étape courante', () => {
        const service = configure();
        expect(() => service.advance('not-a-declared-step', {})).toThrow(
            PresentationFlowViolation
        );
        expect(service.step).toBe('request');
    });

    it('permet de revenir en arrière d’une étape', () => {
        const service = configure();
        service.advance('review', requestValues);
        expect(service.back('request')).toBe('request');
        expect(service.step).toBe('request');
    });

    it('refuse de reculer de plus d’une étape en un seul appel', () => {
        const service = configure();
        service.advance('review', requestValues);
        service.advance('confirmation', {});
        expect(() => service.back('request')).toThrow(
            PresentationFlowViolation
        );
        expect(service.step).toBe('confirmation');
    });

    it('isCurrentStepComplete reflète la complétude des champs déclarés de l’étape courante', () => {
        const service = configure();
        expect(service.isCurrentStepComplete({})).toBe(false);
        expect(service.isCurrentStepComplete(requestValues)).toBe(true);
    });
});
