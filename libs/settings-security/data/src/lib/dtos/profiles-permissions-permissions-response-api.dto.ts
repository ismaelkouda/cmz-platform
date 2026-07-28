import { SimpleResponseDto } from '@cmz/shared-data';
import { PermissionApiDto } from './profiles-permissions-find-one-response-api.dto';

/** Réponse `get-permissions-model` — même forme de nœud que le find-one, cf. source. */
export type ProfilesPermissionsPermissionsResponseApiDto = SimpleResponseDto<
    PermissionApiDto[]
>;
