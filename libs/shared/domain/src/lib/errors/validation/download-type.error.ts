import { DomainError } from '../domain-error.abstract';

export class DownloadTypeRequiredError extends DomainError {
    readonly code = 'DOWNLOAD_TYPE_REQUIRED';
    readonly messageKey = 'COMMON.DOWNLOAD_TYPE.REQUIRED';
    readonly statusCode = 422;

    constructor(message?: string) {
        super(message ?? 'Download type is required');
    }
}
