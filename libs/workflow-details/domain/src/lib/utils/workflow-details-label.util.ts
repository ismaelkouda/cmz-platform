import { WorkflowDetailsContext } from '../props/workflow-details.props';
import {
    workflowDetailsPermissionsQualify,
    workflowDetailsPermissionsRejectContext,
    workflowDetailsPermissionsTake,
} from './workflow-details-permissions.util';

const TITLE_RULES: Array<{
    when: (ctx: WorkflowDetailsContext) => boolean;
    title: string;
}> = [
    {
        when: (ctx) =>
            workflowDetailsPermissionsTake(ctx.props, ctx.permissions.canTake),
        title: 'MANAGEMENT.STATUS.TAKE',
    },
    {
        when: (ctx) =>
            workflowDetailsPermissionsQualify(
                ctx.props,
                ctx.permissions.canQualify
            ) || workflowDetailsPermissionsRejectContext(ctx.props),
        title: 'MANAGEMENT.STATUS.APPROBATION',
    },
];

export function workflowDetailsTitle(ctx: WorkflowDetailsContext): string {
    return (
        TITLE_RULES.find((rule) => rule.when(ctx))?.title ??
        'MANAGEMENT.STATUS.INFORMATION'
    );
}

const SUBMIT_RULES: Array<{
    when: (ctx: WorkflowDetailsContext) => boolean;
    label: string;
}> = [
    {
        when: (ctx) =>
            workflowDetailsPermissionsTake(ctx.props, ctx.permissions.canTake),
        label: 'MANAGEMENT.BUTTONS.TAKE',
    },
    {
        when: (ctx) =>
            workflowDetailsPermissionsQualify(
                ctx.props,
                ctx.permissions.canQualify
            ) || workflowDetailsPermissionsRejectContext(ctx.props),
        label: 'MANAGEMENT.BUTTONS.APPROBATION',
    },
];

export function workflowDetailsSubmitLabel(
    ctx: WorkflowDetailsContext
): string {
    return (
        SUBMIT_RULES.find((rule) => rule.when(ctx))?.label ??
        'MANAGEMENT.BUTTONS.INFORMATION'
    );
}
