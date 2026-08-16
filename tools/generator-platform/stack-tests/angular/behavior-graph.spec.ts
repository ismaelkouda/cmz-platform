import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { BehaviorGraphViolation } from '../../.stack-test-runtime/angular/behavior-graph/behavior-graph-engine';
import { BehaviorGraphService } from '../../.stack-test-runtime/angular/behavior-graph/behavior-graph.service';

afterEach(() => {
    TestBed.resetTestingModule();
});

function configure() {
    TestBed.configureTestingModule({
        providers: [BehaviorGraphService],
    });
    return TestBed.inject(BehaviorGraphService);
}

describe('behavior graph Angular action-request', () => {
    it('démarre dans l’état initial déclaré par le contrat directeur', () => {
        const service = configure();
        expect(service.state).toBe('editing');
    });

    it('transite editing -> submitting sur l’événement submit', () => {
        const service = configure();
        expect(service.send('submit')).toBe('submitting');
        expect(service.state).toBe('submitting');
    });

    it('transite submitting -> confirmed sur l’événement accepted', () => {
        const service = configure();
        service.send('submit');
        expect(service.send('accepted')).toBe('confirmed');
        expect(service.state).toBe('confirmed');
    });

    it('transite submitting -> business-error sur l’événement business-rejected', () => {
        const service = configure();
        service.send('submit');
        expect(service.send('business-rejected')).toBe('business-error');
        expect(service.state).toBe('business-error');
    });

    it('refuse un événement hors contrat sans jamais faire progresser l’état (fail-closed)', () => {
        const service = configure();

        expect(() => service.send('not-a-declared-event')).toThrow(
            BehaviorGraphViolation
        );
        expect(service.state).toBe('editing');

        service.send('submit');
        expect(() => service.send('also-not-declared')).toThrow(
            BehaviorGraphViolation
        );
        expect(service.state).toBe('submitting');
    });

    it('refuse un événement déclaré mais depuis un état où il n’est pas autorisé', () => {
        const service = configure();
        service.send('submit');
        service.send('accepted');

        // "submit" is only declared from "editing", not from "confirmed".
        expect(() => service.send('submit')).toThrow(BehaviorGraphViolation);
        expect(service.state).toBe('confirmed');
    });
});
