import { AgentsPerformancesEntity } from '@cmz/team-organization-domain';
import { AGENTS_PERFORMANCES_STATUS_LABEL } from '../constants/agents-performances-status-label.constant';
import { agentsPerformancesStatusStyleOf } from '../mappers/agents-performances-status-style.mapper';
import { AgentsPerformancesVmProps } from './agents-performances-vm-props.interface';

export class AgentsPerformancesPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: AgentsPerformancesEntity): AgentsPerformancesVmProps {
        return {
            uniqId: item.uniqId,
            firstName: item.firstName,
            lastName: item.lastName,
            goalsSize: item.goalsSize,
            achievementsSize: item.achievementsSize,
            percentages: item.percentages,
            status: item.status,
            statusLabel: this.t(AGENTS_PERFORMANCES_STATUS_LABEL[item.status]),
            statusStyle: agentsPerformancesStatusStyleOf(item.status),
            createdAt: item.createdAt,
            actionsRef: `${item.firstName} ${item.lastName}`,
        };
    }
}
