import {
    AccessLogsEntity,
    AccessLogsAction,
} from '@cmz/settings-security-domain';
import { AccessLogsPresenter } from './access-logs-vm.presenter';

describe('AccessLogsPresenter', () => {
    const mockT = (key: string) => `translated:${key}`;
    let presenter: AccessLogsPresenter;

    const mockItem: AccessLogsEntity = {
        uniqId: 'log-1',
        action: AccessLogsAction.LOGIN,
        source: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: '2026-08-05T10:00:00Z',
    };

    beforeEach(() => {
        presenter = new AccessLogsPresenter(mockT);
    });

    it('mappe correctement AccessLogsEntity vers AccessLogsVmProps', () => {
        const vm = presenter.map(mockItem);

        expect(vm.uniqId).toBe('log-1');
        expect(vm.action).toBe(AccessLogsAction.LOGIN);
        expect(vm.actionLabel).toContain('LOGIN');
        expect(vm.source).toBe('192.168.1.1');
        expect(vm.userAgent).toBe('Mozilla/5.0');
    });
});
