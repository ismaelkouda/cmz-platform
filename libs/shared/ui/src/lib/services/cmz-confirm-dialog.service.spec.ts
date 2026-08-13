import { describe, expect, it } from 'vitest';
import { CmzConfirmDialogService } from './cmz-confirm-dialog.service';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, adaptateur `ConfirmDialogPort`
 * design-system (remplace SweetAlert2). Résolution de Promise différée via
 * `respond()`, appelé par l'outlet UI sur interaction.
 */
describe('CmzConfirmDialogService', () => {
    it('démarre sans état de dialog', () => {
        const service = new CmzConfirmDialogService();
        expect(service.state()).toBeNull();
    });

    it('confirm() publie l’état mode="confirm" avec les options fournies', () => {
        const service = new CmzConfirmDialogService();

        void service.confirm('Supprimer ?', {
            title: 'Attention',
            confirmText: 'Oui',
            cancelText: 'Non',
        });

        expect(service.state()).toEqual({
            message: 'Supprimer ?',
            title: 'Attention',
            confirmText: 'Oui',
            cancelText: 'Non',
            mode: 'confirm',
        });
    });

    it('confirm() résout la Promise avec la valeur passée à respond()', async () => {
        const service = new CmzConfirmDialogService();
        const promise = service.confirm('Supprimer ?');

        service.respond(true);

        await expect(promise).resolves.toBe(true);
    });

    it('confirm() résout à false quand l’utilisateur annule', async () => {
        const service = new CmzConfirmDialogService();
        const promise = service.confirm('Supprimer ?');

        service.respond(false);

        await expect(promise).resolves.toBe(false);
    });

    it('respond() efface l’état après résolution (dialog fermé)', () => {
        const service = new CmzConfirmDialogService();
        void service.confirm('x');

        service.respond(true);

        expect(service.state()).toBeNull();
    });

    it('alert() publie l’état mode="alert" (pas de cancelText, non pertinent)', () => {
        const service = new CmzConfirmDialogService();

        void service.alert('Information', { title: 'Info' });

        expect(service.state()).toMatchObject({
            message: 'Information',
            title: 'Info',
            mode: 'alert',
        });
    });

    it('alert() résout la Promise (void) quand respond() est appelé, quelle que soit la valeur', async () => {
        const service = new CmzConfirmDialogService();
        const promise = service.alert('Information');

        service.respond(true);

        await expect(promise).resolves.toBeUndefined();
    });

    it('respond() sans dialog actif ne lève pas (resolver null, no-op)', () => {
        const service = new CmzConfirmDialogService();
        expect(() => service.respond(true)).not.toThrow();
    });
});
