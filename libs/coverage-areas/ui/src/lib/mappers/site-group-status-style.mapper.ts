import { Status } from '@cmz/coverage-areas-domain';
import { StatusStyle } from '../enums/site-group-status-style.enum';

/** Traduit un `Status` (domaine) en `StatusStyle` (affichage) — logique UI. */
export function statusStyleOf(status: Status): StatusStyle {
    return status === Status.ACTIVE ? StatusStyle.ACTIVE : StatusStyle.INACTIVE;
}
