import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { TeamsFindOneProps } from '../props/teams-find-one.props';
import { TeamsPermissionOption } from '../props/teams-permission-option.props';

export class TeamsFindOneEntity {
    constructor(private readonly props: TeamsFindOneProps) {}

    get uniqId(): string {
        return this.props.uniqId;
    }

    get code(): string | null {
        return this.props.code;
    }

    get name(): string | null {
        return this.props.name;
    }

    get description(): string | null {
        return this.props.description;
    }

    get reportTypes(): ReportType[] {
        return this.props.reportTypes;
    }

    get operators(): TelecomOperator[] {
        return this.props.operators;
    }

    get permissions(): TeamsPermissionOption[] {
        return this.props.permissions;
    }

    with(props: TeamsFindOneProps): TeamsFindOneEntity {
        if (this.uniqId === props.uniqId) {
            return this;
        }
        return new TeamsFindOneEntity(props);
    }
}
