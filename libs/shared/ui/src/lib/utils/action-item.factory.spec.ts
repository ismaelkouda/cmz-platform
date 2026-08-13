import { describe, expect, it, vi } from 'vitest';
import { actionItem, resolveTooltip } from './action-item.factory';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~21 appelants (factorise le
 * ternaire répété des presenters d'action dropdown à travers les modules
 * CRUD). Fonction pure, pas de composant.
 */
describe('resolveTooltip', () => {
    it('retourne la traduction de tooltipKey quand allowed est true', () => {
        const t = vi.fn((key: string) => `translated:${key}`);
        expect(resolveTooltip(t, true, 'ACTIONS.APPROVE', 'Non autorisé')).toBe(
            'translated:ACTIONS.APPROVE'
        );
        expect(t).toHaveBeenCalledWith('ACTIONS.APPROVE');
    });

    it('retourne le message de repli tel quel (non traduit) quand allowed est false', () => {
        const t = vi.fn();
        const result = resolveTooltip(
            t,
            false,
            'ACTIONS.APPROVE',
            'Non autorisé'
        );
        expect(result).toBe('Non autorisé');
        expect(t).not.toHaveBeenCalled();
    });
});

describe('actionItem', () => {
    it('construit un item avec disabled=false et tooltip traduit quand allowed est true', () => {
        const t = vi.fn((key: string) => `translated:${key}`);

        const item = actionItem(t, {
            id: 'approve',
            label: 'Approuver',
            icon: 'check',
            allowed: true,
            tooltipKey: 'ACTIONS.APPROVE',
            fallbackTooltip: 'Action non autorisée',
        });

        expect(item).toEqual({
            id: 'approve',
            label: 'Approuver',
            icon: 'check',
            disabled: false,
            tooltip: 'translated:ACTIONS.APPROVE',
        });
    });

    it('construit un item avec disabled=true et tooltip de repli quand allowed est false', () => {
        const t = vi.fn();

        const item = actionItem(t, {
            id: 'delete',
            label: 'Supprimer',
            icon: 'trash',
            allowed: false,
            tooltipKey: 'ACTIONS.DELETE',
            fallbackTooltip: 'Action non autorisée',
        });

        expect(item).toEqual({
            id: 'delete',
            label: 'Supprimer',
            icon: 'trash',
            disabled: true,
            tooltip: 'Action non autorisée',
        });
    });
});
