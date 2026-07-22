export class ApiError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    static fetchFailed(entityName: string, originalError?: unknown): ApiError {
        return new ApiError(
            `Impossible de récupérer les données de ${entityName}`,
            'FETCH_FAILED',
            originalError
        );
    }

    static invalidResponse(message: string, originalError?: unknown): ApiError {
        return new ApiError(message, 'INVALID_RESPONSE', originalError);
    }

    static mappingFailed(
        entityName: string,
        originalError?: unknown
    ): ApiError {
        return new ApiError(
            `Échec de la transformation des données pour ${entityName}`,
            'MAPPING_FAILED',
            originalError
        );
    }
}
