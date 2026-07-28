import { Period } from '@cmz/dashboard-domain';

/**
 * Le source affichait la valeur brute ('7'/'30'/'60'/'90') comme libellé
 * du sélecteur de période (`period.const.ts` : `label === value`) — pas un
 * vrai texte, juste un nombre nu. Corrigé ici avec de vraies clés i18n
 * ("7 derniers jours", etc.).
 */
export const PERIOD_LABEL: Record<Period, string> = {
    [Period.SEVEN_DAYS]: 'DASHBOARD.FILTER.PERIOD.SEVEN_DAYS',
    [Period.THIRTY_DAYS]: 'DASHBOARD.FILTER.PERIOD.THIRTY_DAYS',
    [Period.SIXTY_DAYS]: 'DASHBOARD.FILTER.PERIOD.SIXTY_DAYS',
    [Period.NINETY_DAYS]: 'DASHBOARD.FILTER.PERIOD.NINETY_DAYS',
};

export const PERIOD_OPTIONS = (Object.values(Period) as Period[]).map(
    (value) => ({ value, label: PERIOD_LABEL[value] })
);
