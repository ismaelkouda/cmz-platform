import { AccessLogsEntity } from './access-logs.entity';
import { AccessLogsAction } from '../enums/access-logs-action.enum';
import { AccessLogsProps } from '../props/access-logs.props';

function makeProps(overrides: Partial<AccessLogsProps> = {}): AccessLogsProps {
    return {
        uniqId: 'log-1',
        action: AccessLogsAction.LOGIN,
        source: 'web',
        userAgent: 'Mozilla/5.0',
        createdAt: '2026-08-01T10:00:00.000Z',
        ...overrides,
    };
}

describe('AccessLogsEntity — getters', () => {
    it('expose tous les champs depuis props', () => {
        const entity = new AccessLogsEntity(makeProps());

        expect(entity.uniqId).toBe('log-1');
        expect(entity.action).toBe(AccessLogsAction.LOGIN);
        expect(entity.source).toBe('web');
        expect(entity.userAgent).toBe('Mozilla/5.0');
        expect(entity.createdAt).toBe('2026-08-01T10:00:00.000Z');
    });
});

describe('AccessLogsEntity.with', () => {
    it('retourne la même instance si uniqId est identique (entrée immuable)', () => {
        const entity = new AccessLogsEntity(makeProps());
        const result = entity.with(makeProps());
        expect(result).toBe(entity);
    });

    it('retourne une nouvelle instance si uniqId diffère', () => {
        const entity = new AccessLogsEntity(makeProps());
        const result = entity.with(makeProps({ uniqId: 'log-2' }));
        expect(result).not.toBe(entity);
        expect(result.uniqId).toBe('log-2');
    });
});
