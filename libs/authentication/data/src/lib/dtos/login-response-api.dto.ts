import { SimpleResponseDto } from '@cmz/shared-data';
import { AuthTokenApiDto, CurrentUserApiDto } from './current-user-api.dto';

export interface LoginItemApiDto {
    readonly token: AuthTokenApiDto;
    readonly user: CurrentUserApiDto;
    readonly message?: string;
}

export type LoginResponseApiDto = SimpleResponseDto<LoginItemApiDto>;
