import { TeamsStatus } from '../enums/teams-status.enum';

export interface TeamsProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    status: TeamsStatus;
    membersCount: string;
    updatedAt: string;
}
