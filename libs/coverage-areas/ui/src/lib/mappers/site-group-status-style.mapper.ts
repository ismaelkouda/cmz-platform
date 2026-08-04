import { Status } from '@cmz/coverage-areas-domain';
import { StatusStyle } from '@cmz/shared-ui';

/** Traduit un `Status` (domaine) en `StatusStyle` (affichage) — logique UI. */
export function statusStyleOf(status: Status): StatusStyle {
    return status === Status.ACTIVE ? StatusStyle.ACTIVE : StatusStyle.INACTIVE;
}
