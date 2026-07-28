import { AccessLogsEntity } from '@cmz/settings-security-domain';
import { ACCESS_LOGS_ACTION_LABEL } from '../constants/access-logs-action-label.constant';
import { AccessLogsVmProps } from './access-logs-vm-props.interface';

/** Presenter (UI) : `AccessLogsEntity` → view-model. Pas de permission à porter (lecture seule, aucune mutation). */
export class AccessLogsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: AccessLogsEntity): AccessLogsVmProps {
        return {
            uniqId: item.uniqId,
            action: item.action,
            actionLabel: this.t(ACCESS_LOGS_ACTION_LABEL[item.action]),
            source: item.source,
            userAgent: item.userAgent,
            createdAt: item.createdAt,
        };
    }
}
