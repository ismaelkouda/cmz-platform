import { HomeStatus } from '@cmz/content-management-domain';
import { HomeStatusStyle } from '../enums/home-status-style.enum';

/** Traduit un `HomeStatus` (domaine) en style d'affichage — logique UI. */
export function homeStatusStyleOf(status: HomeStatus): HomeStatusStyle {
    return status === HomeStatus.ACTIVE
        ? HomeStatusStyle.ACTIVE
        : HomeStatusStyle.INACTIVE;
}
