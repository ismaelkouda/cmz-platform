import { useCallback, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PresentationFlowViolation } from '../../.stack-test-runtime/reactjs/presentation-flow/presentation-flow-engine';
import { createPresentationFlowHook } from '../../.stack-test-runtime/reactjs/presentation-flow/use-presentation-flow';

const reactHooks = { useCallback, useState };

afterEach(cleanup);

function configure() {
    const { usePresentationFlow } = createPresentationFlowHook(reactHooks);
    return renderHook(() => usePresentationFlow());
}

const requestValues = {
    email: 'person@example.com',
    subject: 'Cannot open a report',
    message: 'The report remains unavailable.',
    priority: 'high',
};

describe('presentation flow ReactJS action-request wizard', () => {
    it('démarre sur la première étape déclarée par le contrat directeur', () => {
        const rendered = configure();
        expect(rendered.result.current.step).toBe('request');
    });

    it('refuse d’avancer tant que l’étape courante est incomplète (fail-closed)', () => {
        const rendered = configure();
        expect(() =>
            act(() =>
                rendered.result.current.advance('review', {
                    email: 'person@example.com',
                })
            )
        ).toThrow(PresentationFlowViolation);
        expect(rendered.result.current.step).toBe('request');
    });

    it('avance request -> review une fois l’étape courante complète', () => {
        const rendered = configure();
        act(() => rendered.result.current.advance('review', requestValues));
        expect(rendered.result.current.step).toBe('review');
    });

    it('avance review -> confirmation (étape sans champ, toujours complète)', () => {
        const rendered = configure();
        act(() => rendered.result.current.advance('review', requestValues));
        act(() => rendered.result.current.advance('confirmation', {}));
        expect(rendered.result.current.step).toBe('confirmation');
    });

    it('refuse de sauter une étape hors ordre déclaré (fail-closed)', () => {
        const rendered = configure();
        expect(() =>
            act(() =>
                rendered.result.current.advance('confirmation', requestValues)
            )
        ).toThrow(PresentationFlowViolation);
        expect(rendered.result.current.step).toBe('request');
    });

    it('refuse une étape cible inconnue sans jamais changer l’étape courante', () => {
        const rendered = configure();
        expect(() =>
            act(() =>
                rendered.result.current.advance('not-a-declared-step', {})
            )
        ).toThrow(PresentationFlowViolation);
        expect(rendered.result.current.step).toBe('request');
    });

    it('permet de revenir en arrière d’une étape', () => {
        const rendered = configure();
        act(() => rendered.result.current.advance('review', requestValues));
        act(() => rendered.result.current.back('request'));
        expect(rendered.result.current.step).toBe('request');
    });

    it('refuse de reculer de plus d’une étape en un seul appel', () => {
        const rendered = configure();
        act(() => rendered.result.current.advance('review', requestValues));
        act(() => rendered.result.current.advance('confirmation', {}));
        expect(() =>
            act(() => rendered.result.current.back('request'))
        ).toThrow(PresentationFlowViolation);
        expect(rendered.result.current.step).toBe('confirmation');
    });

    it('isCurrentStepComplete reflète la complétude des champs déclarés de l’étape courante', () => {
        const rendered = configure();
        expect(rendered.result.current.isCurrentStepComplete({})).toBe(false);
        expect(
            rendered.result.current.isCurrentStepComplete(requestValues)
        ).toBe(true);
    });
});
