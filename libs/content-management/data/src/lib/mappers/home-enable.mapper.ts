import { HomeEnableValidateContract } from '@cmz/content-management-domain';
import { HomeEnableApiDto } from '../dtos/home-enable-api.dto';

export function homeEnableMapper(
    validContract: HomeEnableValidateContract
): HomeEnableApiDto {
    return { uniq_id: validContract.uniqId };
}
