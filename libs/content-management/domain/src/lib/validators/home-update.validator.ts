import { GenericRequiredError } from '@cmz/shared-domain';
import { HomeUpdateContract } from '../contracts/home-update.contract';
import { HomeUpdateValidateContract } from '../contracts/home-update.validate-contract';
import { assertButtonPairComplete } from './assert-button-pair-complete.validator';

export function validateHomeUpdate(
    contract: HomeUpdateContract
): asserts contract is HomeUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.title) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.TITLE_REQUIRE'
        );
    }
    if (!contract.resume) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.RESUME_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.CONTENT_REQUIRE'
        );
    }
    if (!contract.image) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.IMAGE_REQUIRE'
        );
    }
    if (!contract.platforms?.length) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.PLATFORMS_REQUIRE'
        );
    }
    if (!contract.startDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.START_DATE_REQUIRE'
        );
    }
    if (!contract.endDate) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.END_DATE_REQUIRE'
        );
    }
    assertButtonPairComplete(
        contract.buttonLabel,
        contract.buttonUrl,
        'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.BUTTON_URL_REQUIRE',
        'CONTENT_MANAGEMENT.HOME.FORM.ERROR.UPDATE.BUTTON_LABEL_REQUIRE'
    );
}
