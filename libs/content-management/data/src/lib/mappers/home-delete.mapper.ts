import { HomeDeleteValidateContract } from '@cmz/content-management-domain';
import { HomeDeleteApiDto } from '../dtos/home-delete-api.dto';

export function homeDeleteMapper(
    validContract: HomeDeleteValidateContract
): HomeDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
