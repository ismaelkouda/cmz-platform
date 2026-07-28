import { SimpleResponseDto } from '@cmz/shared-data';
import { TeamsPermissionNodeApiDto } from './teams-permission-node-api.dto';

export type TeamsPermissionsResponseApiDto = SimpleResponseDto<
    TeamsPermissionNodeApiDto[]
>;
