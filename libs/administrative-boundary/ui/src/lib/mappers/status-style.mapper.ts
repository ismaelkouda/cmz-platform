import { Status } from '@cmz/administrative-boundary-domain';
import { StatusStyle } from '../enums/status-style.enum';

/** Traduit un `Status` (domaine) en `StatusStyle` (affichage) — logique UI. */
export function statusStyleOf(status: Status): StatusStyle {
    return status === Status.ACTIVE ? StatusStyle.ACTIVE : StatusStyle.INACTIVE;
}
