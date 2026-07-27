import { Service } from '@angular/core';
import { LoginResponseEntity } from '@cmz/authentication-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { LoginItemApiDto } from '../dtos/login-response-api.dto';
import {
    mapAuthTokenFromDto,
    mapCurrentUserFromDto,
} from './current-user.mapper';

@Service()
export class LoginResponseMapper extends SimpleResponseMapper<
    LoginResponseEntity,
    LoginItemApiDto
> {
    protected mapItemFromDto(dto: LoginItemApiDto): LoginResponseEntity {
        MapperUtils.validateDto(dto, { required: ['user', 'token'] });
        return new LoginResponseEntity({
            user: mapCurrentUserFromDto(dto.user),
            token: mapAuthTokenFromDto(dto.token),
            message: dto.message,
        });
    }
}
