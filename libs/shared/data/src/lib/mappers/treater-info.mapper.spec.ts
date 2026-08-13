import { describe, expect, it } from 'vitest';
import { TreaterInfoMapper } from './treater-info.mapper';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~4 appelants. 18 champs mappés un
 * à un sans transformation (snake_case wire → camelCase entité, et retour) —
 * risque réel de faute de frappe silencieuse dans la correspondance de champ
 * (ex. `approved_at` → `approvedAt` vs `finalized_at` → `finalizedAt`,
 * proches visuellement). Round-trip complet en un seul test pour verrouiller
 * l'ordre exact des 18 champs des deux côtés.
 */
describe('TreaterInfoMapper', () => {
    const mapper = new TreaterInfoMapper();

    const dto = {
        acknowledged_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-02T00:00:00Z',
        reported_at: '2026-01-03T00:00:00Z',
        processed_at: '2026-01-04T00:00:00Z',
        approved_at: '2026-01-05T00:00:00Z',
        finalized_at: '2026-01-06T00:00:00Z',
        rejected_at: null,
        confirmed_at: '2026-01-07T00:00:00Z',
        abandoned_at: null,
        processed_comment: 'processed ok',
        approved_comment: 'approved ok',
        rejected_comment: null,
        acknowledged_comment: 'ack ok',
        confirmed_comment: 'confirmed ok',
        abandoned_comment: null,
        deny_count: 2,
        reason: 'raison métier',
        callback_type: 'sms',
    };

    it('mapToEntity() mappe les 18 champs wire vers l’entité, sans confondre les dates proches', () => {
        const entity = mapper.mapToEntity(dto);

        expect(entity.acknowledgedAt).toBe(dto.acknowledged_at);
        expect(entity.createdAt).toBe(dto.created_at);
        expect(entity.reportedAt).toBe(dto.reported_at);
        expect(entity.processedAt).toBe(dto.processed_at);
        expect(entity.approvedAt).toBe(dto.approved_at);
        expect(entity.finalizedAt).toBe(dto.finalized_at);
        expect(entity.rejectedAt).toBeNull();
        expect(entity.confirmedAt).toBe(dto.confirmed_at);
        expect(entity.abandonedAt).toBeNull();
        expect(entity.processedComment).toBe(dto.processed_comment);
        expect(entity.approvedComment).toBe(dto.approved_comment);
        expect(entity.rejectedComment).toBeNull();
        expect(entity.acknowledgedComment).toBe(dto.acknowledged_comment);
        expect(entity.confirmedComment).toBe(dto.confirmed_comment);
        expect(entity.abandonedComment).toBeNull();
        expect(entity.denyCount).toBe(2);
        expect(entity.reason).toBe(dto.reason);
        expect(entity.callbackType).toBe(dto.callback_type);
    });

    it('mapToDto() est l’inverse exact de mapToEntity() (round-trip)', () => {
        const entity = mapper.mapToEntity(dto);
        const roundTripped = mapper.mapToDto(entity);

        expect(roundTripped).toEqual(dto);
    });
});
