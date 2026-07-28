import { HomeDisableValidateContract } from '@cmz/content-management-domain';
import { HomeDisableApiDto } from '../dtos/home-disable-api.dto';

export function homeDisableMapper(
    validContract: HomeDisableValidateContract
): HomeDisableApiDto {
    return { uniq_id: validContract.uniqId };
}
