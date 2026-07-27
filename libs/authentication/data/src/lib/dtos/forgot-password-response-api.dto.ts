import { SimpleResponseDto } from '@cmz/shared-data';

/** Réduit à `message` (décision 1 du plan) — pas de `user`/`token`. */
export interface ForgotPasswordItemApiDto {
    readonly message: string;
}

export type ForgotPasswordResponseApiDto =
    SimpleResponseDto<ForgotPasswordItemApiDto>;
