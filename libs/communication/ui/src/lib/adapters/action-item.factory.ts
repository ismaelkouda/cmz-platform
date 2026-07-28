import { ActionDropdownItem } from '@cmz/shared-ui';

type Translate = (key: string) => string;

/** Résout un tooltip : clé traduite si autorisé, sinon message de repli. */
export function resolveTooltip(
    t: Translate,
    allowed: boolean,
    tooltipKey: string,
    fallback: string
): string {
    return allowed ? t(tooltipKey) : fallback;
}

/** Fabrique un élément d'action (dropdown) — copie locale (isolation de scope). */
export function actionItem(
    t: Translate,
    config: {
        id: string;
        label: string;
        icon: string;
        allowed: boolean;
        tooltipKey: string;
        fallbackTooltip: string;
    }
): ActionDropdownItem {
    return {
        id: config.id,
        label: config.label,
        icon: config.icon,
        disabled: !config.allowed,
        tooltip: resolveTooltip(
            t,
            config.allowed,
            config.tooltipKey,
            config.fallbackTooltip
        ),
    };
}
