import { UsersStatus } from '@cmz/settings-security-domain';
import { UsersStatusStyle } from '../enums/users-status-style.enum';

const MAP: Record<UsersStatus, UsersStatusStyle> = {
    [UsersStatus.ACTIVE]: UsersStatusStyle.ACTIVE,
    [UsersStatus.INACTIVE]: UsersStatusStyle.INACTIVE,
    [UsersStatus.BLOCKED]: UsersStatusStyle.BLOCKED,
    [UsersStatus.PENDING]: UsersStatusStyle.PENDING,
};

/** Traduit un `UsersStatus` (domaine) en style d'affichage — logique UI. */
export function usersStatusStyleOf(status: UsersStatus): UsersStatusStyle {
    return MAP[status];
}
