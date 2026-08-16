import { useCallback, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BehaviorGraphViolation } from '../../.stack-test-runtime/reactjs/behavior-graph/behavior-graph-engine';
import { createBehaviorGraphHook } from '../../.stack-test-runtime/reactjs/behavior-graph/use-behavior-graph';

const reactHooks = { useCallback, useState };

afterEach(cleanup);

function configure() {
    const { useBehaviorGraph } = createBehaviorGraphHook(reactHooks);
    return renderHook(() => useBehaviorGraph());
}

describe('behavior graph ReactJS action-request', () => {
    it('démarre dans l’état initial déclaré par le contrat directeur', () => {
        const rendered = configure();
        expect(rendered.result.current.state).toBe('editing');
    });

    it('transite editing -> submitting sur l’événement submit', () => {
        const rendered = configure();
        act(() => rendered.result.current.send('submit'));
        expect(rendered.result.current.state).toBe('submitting');
    });

    it('transite submitting -> confirmed sur l’événement accepted', () => {
        const rendered = configure();
        act(() => {
            rendered.result.current.send('submit');
        });
        act(() => {
            rendered.result.current.send('accepted');
        });
        expect(rendered.result.current.state).toBe('confirmed');
    });

    it('transite submitting -> business-error sur l’événement business-rejected', () => {
        const rendered = configure();
        act(() => {
            rendered.result.current.send('submit');
        });
        act(() => {
            rendered.result.current.send('business-rejected');
        });
        expect(rendered.result.current.state).toBe('business-error');
    });

    it('refuse un événement hors contrat sans jamais faire progresser l’état (fail-closed)', () => {
        const rendered = configure();

        expect(() =>
            act(() => rendered.result.current.send('not-a-declared-event'))
        ).toThrow(BehaviorGraphViolation);
        expect(rendered.result.current.state).toBe('editing');

        act(() => rendered.result.current.send('submit'));
        expect(() =>
            act(() => rendered.result.current.send('also-not-declared'))
        ).toThrow(BehaviorGraphViolation);
        expect(rendered.result.current.state).toBe('submitting');
    });

    it('refuse un événement déclaré mais depuis un état où il n’est pas autorisé', () => {
        const rendered = configure();
        act(() => rendered.result.current.send('submit'));
        act(() => rendered.result.current.send('accepted'));

        expect(() => act(() => rendered.result.current.send('submit'))).toThrow(
            BehaviorGraphViolation
        );
        expect(rendered.result.current.state).toBe('confirmed');
    });
});
