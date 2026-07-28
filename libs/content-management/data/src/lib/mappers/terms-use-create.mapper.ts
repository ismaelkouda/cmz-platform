import { TermsUseCreateValidateContract } from '@cmz/content-management-domain';
import { TermsUseCreateApiDto } from '../dtos/terms-use-create-api.dto';

export function termsUseCreateMapper(
    validContract: TermsUseCreateValidateContract
): TermsUseCreateApiDto {
    return { version: validContract.version, content: validContract.content };
}
