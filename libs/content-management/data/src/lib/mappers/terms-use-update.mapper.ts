import { TermsUseUpdateValidateContract } from '@cmz/content-management-domain';
import { TermsUseUpdateApiDto } from '../dtos/terms-use-update-api.dto';

export function termsUseUpdateMapper(
    validContract: TermsUseUpdateValidateContract
): TermsUseUpdateApiDto {
    return {
        id: validContract.uniqId,
        version: validContract.version,
        content: validContract.content,
    };
}
