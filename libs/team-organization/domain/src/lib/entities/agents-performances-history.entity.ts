import { AgentsPerformancesHistoryProps } from '../props/agents-performances-history.props';

/** Entité liste — volet « historique » d'un agent (`AgentsPerformancesFindOneEntity` legacy). */
export class AgentsPerformancesHistoryEntity {
    constructor(private readonly props: AgentsPerformancesHistoryProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get reportType(): string {
        return this.props.reportType;
    }

    get operators(): string {
        return this.props.operators;
    }

    get source(): string {
        return this.props.source;
    }

    get initiatorPhoneNumber(): string {
        return this.props.initiatorPhoneNumber;
    }

    get createdAt(): string {
        return this.props.createdAt;
    }

    get updatedAt(): string {
        return this.props.updatedAt;
    }

    with(
        props: AgentsPerformancesHistoryProps
    ): AgentsPerformancesHistoryEntity {
        if (
            this.uniqId === props.uniqId &&
            this.updatedAt === props.updatedAt
        ) {
            return this;
        }
        return new AgentsPerformancesHistoryEntity(props);
    }
}
