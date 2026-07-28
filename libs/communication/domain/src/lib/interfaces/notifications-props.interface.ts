import { TypeReport } from '@cmz/shared-domain';
import { NotificationsStatus } from '../enums/notifications-status.enum';

/**
 * `type` réutilise `TypeReport` (kernel `@cmz/shared-domain`, déjà présent
 * — 1er vrai consommateur dans ce monorepo) : le rapport référencé par une
 * notification vient d'un des 3 domaines de workflow (`requests`/
 * `processing`/`finalization`), pas encore reconstruits, mais le type
 * lui-même est un concept transverse déjà extrait.
 */
export interface NotificationsProps {
    uniqId: string;
    reference: string;
    title: string;
    type: TypeReport;
    message: string;
    status: NotificationsStatus;
    sendAt: string;
    updatedAt: string;
}
