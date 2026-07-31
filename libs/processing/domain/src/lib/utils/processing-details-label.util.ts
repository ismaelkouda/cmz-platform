import { ProcessingDetailsContext } from '../props/processing-details.props';
import { processingDetailsPermissionsTake } from './processing-details-permissions.util';
import { processingDetailsPermissionsTreat } from './processing-details-permissions.util';

const TITLE_RULES: Array<{
    when: (ctx: ProcessingDetailsContext) => boolean;
    title: string;
}> = [
    {
        when: (ctx) =>
            processingDetailsPermissionsTake(
                ctx.props,
                ctx.permissions.canTake
            ),
        title: 'MANAGEMENT.STATUS.TAKE',
    },
    {
        when: (ctx) =>
            processingDetailsPermissionsTreat(
                ctx.props,
                ctx.permissions.canTreat
            ),
        title: 'MANAGEMENT.STATUS.TREATMENT',
    },
];

export function processingDetailsTitle(ctx: ProcessingDetailsContext): string {
    return (
        TITLE_RULES.find((rule) => rule.when(ctx))?.title ??
        'MANAGEMENT.STATUS.INFORMATION'
    );
}

const SUBMIT_RULES: Array<{
    when: (ctx: ProcessingDetailsContext) => boolean;
    label: string;
}> = [
    {
        when: (ctx) =>
            processingDetailsPermissionsTake(
                ctx.props,
                ctx.permissions.canTake
            ),
        label: 'MANAGEMENT.BUTTONS.TAKE',
    },
    {
        when: (ctx) =>
            processingDetailsPermissionsTreat(
                ctx.props,
                ctx.permissions.canTreat
            ),
        label: 'MANAGEMENT.BUTTONS.TREATMENT',
    },
];

export function processingDetailsSubmitLabel(
    ctx: ProcessingDetailsContext
): string {
    return (
        SUBMIT_RULES.find((rule) => rule.when(ctx))?.label ??
        'MANAGEMENT.BUTTONS.INFORMATION'
    );
}
