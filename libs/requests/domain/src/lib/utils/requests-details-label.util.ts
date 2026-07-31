import { RequestsDetailsContext } from '../props/requests-details.props';
import {
    requestsDetailsPermissionsQualify,
    requestsDetailsPermissionsRejectContext,
    requestsDetailsPermissionsTake,
} from './requests-details-permissions.util';

const TITLE_RULES: Array<{
    when: (ctx: RequestsDetailsContext) => boolean;
    title: string;
}> = [
    {
        when: (ctx) =>
            requestsDetailsPermissionsTake(ctx.props, ctx.permissions.canTake),
        title: 'MANAGEMENT.STATUS.TAKE',
    },
    {
        when: (ctx) =>
            requestsDetailsPermissionsQualify(
                ctx.props,
                ctx.permissions.canQualify
            ) || requestsDetailsPermissionsRejectContext(ctx.props),
        title: 'MANAGEMENT.STATUS.APPROBATION',
    },
];

export function requestsDetailsTitle(ctx: RequestsDetailsContext): string {
    return (
        TITLE_RULES.find((rule) => rule.when(ctx))?.title ??
        'MANAGEMENT.STATUS.INFORMATION'
    );
}

const SUBMIT_RULES: Array<{
    when: (ctx: RequestsDetailsContext) => boolean;
    label: string;
}> = [
    {
        when: (ctx) =>
            requestsDetailsPermissionsTake(ctx.props, ctx.permissions.canTake),
        label: 'MANAGEMENT.BUTTONS.TAKE',
    },
    {
        when: (ctx) =>
            requestsDetailsPermissionsQualify(
                ctx.props,
                ctx.permissions.canQualify
            ) || requestsDetailsPermissionsRejectContext(ctx.props),
        label: 'MANAGEMENT.BUTTONS.APPROBATION',
    },
];

export function requestsDetailsSubmitLabel(
    ctx: RequestsDetailsContext
): string {
    return (
        SUBMIT_RULES.find((rule) => rule.when(ctx))?.label ??
        'MANAGEMENT.BUTTONS.INFORMATION'
    );
}
