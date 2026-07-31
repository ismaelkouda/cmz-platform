import { ReportStatesDetailsContext } from '../props/report-states-details.props';
import {
    reportStatesDetailsPermissionsQualify,
    reportStatesDetailsPermissionsRejectContext,
    reportStatesDetailsPermissionsTake,
} from './report-states-details-permissions.util';

const TITLE_RULES: Array<{
    when: (ctx: ReportStatesDetailsContext) => boolean;
    title: string;
}> = [
    {
        when: (ctx) =>
            reportStatesDetailsPermissionsTake(
                ctx.props,
                ctx.permissions.canTake
            ),
        title: 'MANAGEMENT.STATUS.TAKE',
    },
    {
        when: (ctx) =>
            reportStatesDetailsPermissionsQualify(
                ctx.props,
                ctx.permissions.canQualify
            ) || reportStatesDetailsPermissionsRejectContext(ctx.props),
        title: 'MANAGEMENT.STATUS.APPROBATION',
    },
];

export function reportStatesDetailsTitle(
    ctx: ReportStatesDetailsContext
): string {
    return (
        TITLE_RULES.find((rule) => rule.when(ctx))?.title ??
        'MANAGEMENT.STATUS.INFORMATION'
    );
}

const SUBMIT_RULES: Array<{
    when: (ctx: ReportStatesDetailsContext) => boolean;
    label: string;
}> = [
    {
        when: (ctx) =>
            reportStatesDetailsPermissionsTake(
                ctx.props,
                ctx.permissions.canTake
            ),
        label: 'MANAGEMENT.BUTTONS.TAKE',
    },
    {
        when: (ctx) =>
            reportStatesDetailsPermissionsQualify(
                ctx.props,
                ctx.permissions.canQualify
            ) || reportStatesDetailsPermissionsRejectContext(ctx.props),
        label: 'MANAGEMENT.BUTTONS.APPROBATION',
    },
];

export function reportStatesDetailsSubmitLabel(
    ctx: ReportStatesDetailsContext
): string {
    return (
        SUBMIT_RULES.find((rule) => rule.when(ctx))?.label ??
        'MANAGEMENT.BUTTONS.INFORMATION'
    );
}
