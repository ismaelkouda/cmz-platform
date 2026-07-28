import { SlideStatus } from '@cmz/content-management-domain';
import { SlideStatusStyle } from '../enums/slide-status-style.enum';

/** Traduit un `SlideStatus` (domaine) en style d'affichage — logique UI. */
export function slideStatusStyleOf(status: SlideStatus): SlideStatusStyle {
    return status === SlideStatus.ACTIVE
        ? SlideStatusStyle.ACTIVE
        : SlideStatusStyle.INACTIVE;
}
