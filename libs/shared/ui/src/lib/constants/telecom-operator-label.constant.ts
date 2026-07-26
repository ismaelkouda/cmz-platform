import { TelecomOperator } from '@cmz/shared-domain';

/** Clés i18n des libellés opérateur — présentation pure. */
export const TELECOM_OPERATOR_LABEL: Record<TelecomOperator, string> = {
    [TelecomOperator.MTN]: 'COMMON.MTN',
    [TelecomOperator.ORANGE]: 'COMMON.ORANGE',
    [TelecomOperator.MOOV]: 'COMMON.MOOV',
};

/** Clés i18n des tokens de style badge — hors domaine. */
export const TELECOM_OPERATOR_STYLE: Record<TelecomOperator, string> = {
    [TelecomOperator.MTN]: 'COMMON.MTN_STYLE',
    [TelecomOperator.ORANGE]: 'COMMON.ORANGE_STYLE',
    [TelecomOperator.MOOV]: 'COMMON.MOOV_STYLE',
};

/** Options filtre / select — une seule source (codes domain + labels UI). */
export const TELECOM_OPERATOR_OPTIONS = (
    Object.values(TelecomOperator) as TelecomOperator[]
).map((value) => ({
    value,
    label: TELECOM_OPERATOR_LABEL[value],
}));
