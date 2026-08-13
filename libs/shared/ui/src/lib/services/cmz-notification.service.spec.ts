import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CmzNotificationService } from './cmz-notification.service';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, adaptateur `NotificationPort`
 * design-system (remplace ngx-sonner). Auto-dismiss via `setTimeout` réel —
 * fake timers vitest pour ne pas dépendre d'un vrai délai de 5s en test.
 */
describe('CmzNotificationService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('démarre sans toast', () => {
        const service = new CmzNotificationService();
        expect(service.toasts()).toEqual([]);
    });

    it('success()/error()/warning()/info() ajoutent un toast avec la bonne sévérité', () => {
        const service = new CmzNotificationService();

        service.success('ok');
        service.error('ko');
        service.warning('attention');
        service.info('fyi');

        expect(service.toasts().map((t) => t.severity)).toEqual([
            'success',
            'error',
            'warning',
            'info',
        ]);
        expect(service.toasts().map((t) => t.text)).toEqual([
            'ok',
            'ko',
            'attention',
            'fyi',
        ]);
    });

    it('attribue des ids strictement croissants à chaque nouveau toast', () => {
        const service = new CmzNotificationService();

        service.success('a');
        service.success('b');

        const [first, second] = service.toasts();
        expect(second.id).toBeGreaterThan(first.id);
    });

    it('dismiss(id) retire uniquement le toast ciblé', () => {
        const service = new CmzNotificationService();
        service.success('a');
        service.success('b');
        const [first, second] = service.toasts();

        service.dismiss(first.id);

        expect(service.toasts()).toEqual([second]);
    });

    it('auto-dismiss après autoDismissMs sans appel manuel', () => {
        const service = new CmzNotificationService();
        service.success('a');
        expect(service.toasts()).toHaveLength(1);

        vi.advanceTimersByTime(service.autoDismissMs);

        expect(service.toasts()).toHaveLength(0);
    });

    it('n’auto-dismiss pas avant l’échéance', () => {
        const service = new CmzNotificationService();
        service.success('a');

        vi.advanceTimersByTime(service.autoDismissMs - 1);

        expect(service.toasts()).toHaveLength(1);
    });
});
