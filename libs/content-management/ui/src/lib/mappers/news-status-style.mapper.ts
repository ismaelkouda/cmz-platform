import { NewsStatus } from '@cmz/content-management-domain';
import { NewsStatusStyle } from '../enums/news-status-style.enum';

/** Traduit un `NewsStatus` (domaine) en style d'affichage — logique UI. */
export function newsStatusStyleOf(status: NewsStatus): NewsStatusStyle {
    return status === NewsStatus.PUBLISH
        ? NewsStatusStyle.PUBLISH
        : NewsStatusStyle.UNPUBLISH;
}
