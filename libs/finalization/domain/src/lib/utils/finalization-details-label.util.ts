import { FinalizationDetailsContext } from '../props/finalization-details.props';
import {
    finalizationDetailsPermissionsFinalize,
    finalizationDetailsPermissionsTake,
} from './finalization-details-permissions.util';

const TITLE_RULES: Array<{
    when: (ctx: FinalizationDetailsContext) => boolean;
    title: string;
}> = [
    {
        when: (ctx) =>
            finalizationDetailsPermissionsTake(
                ctx.props,
                ctx.permissions.canTake
            ),
        title: 'MANAGEMENT.STATUS.TAKE',
    },
    {
        when: (ctx) =>
            finalizationDetailsPermissionsFinalize(
                ctx.props,
                ctx.permissions.canFinalize
            ),
        title: 'MANAGEMENT.STATUS.FINALIZATION',
    },
];

export function finalizationDetailsTitle(
    ctx: FinalizationDetailsContext
): string {
    return (
        TITLE_RULES.find((rule) => rule.when(ctx))?.title ??
        'MANAGEMENT.STATUS.INFORMATION'
    );
}

const SUBMIT_RULES: Array<{
    when: (ctx: FinalizationDetailsContext) => boolean;
    label: string;
}> = [
    {
        when: (ctx) =>
            finalizationDetailsPermissionsTake(
                ctx.props,
                ctx.permissions.canTake
            ),
        label: 'MANAGEMENT.BUTTONS.TAKE',
    },
    {
        when: (ctx) =>
            finalizationDetailsPermissionsFinalize(
                ctx.props,
                ctx.permissions.canFinalize
            ),
        label: 'MANAGEMENT.BUTTONS.FINALIZATION',
    },
];

export function finalizationDetailsSubmitLabel(
    ctx: FinalizationDetailsContext
): string {
    return (
        SUBMIT_RULES.find((rule) => rule.when(ctx))?.label ??
        'MANAGEMENT.BUTTONS.INFORMATION'
    );
}
