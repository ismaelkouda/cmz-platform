import { SimpleResponseDto } from '@cmz/shared-data';

/** Réduit à `message` (décision 1 du plan) — pas de `user`/`token`. */
export interface ResetPasswordItemApiDto {
    readonly message: string;
}

export type ResetPasswordResponseApiDto =
    SimpleResponseDto<ResetPasswordItemApiDto>;
