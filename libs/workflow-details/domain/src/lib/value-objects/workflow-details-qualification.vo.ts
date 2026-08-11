import {
    WorkflowDetailsQualificationContract,
    WorkflowDetailsQualificationEditFields,
} from '../contracts/workflow-details-qualification.contract';

function normalizeEditFields(
    contract: WorkflowDetailsQualificationContract,
    modulePrefix: string
): WorkflowDetailsQualificationEditFields | undefined {
    const raw = contract.editFields;
    if (!raw) {
        return undefined;
    }

    const latitude = Number(raw.latitude);
    const longitude = Number(raw.longitude);
    const locationName = raw.locationName?.trim() ?? '';
    const reportType = raw.reportType?.trim() ?? '';
    const description = raw.description?.trim() ?? '';
    const placeDescription = raw.placeDescription?.trim() ?? '';
    const operators = (raw.operators ?? []).filter(Boolean);
    const placePhoto =
        raw.placePhoto instanceof File
            ? raw.placePhoto
            : raw.placePhoto?.trim()
              ? raw.placePhoto.trim()
              : null;

    if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude) ||
        !locationName ||
        !reportType ||
        !description ||
        !placeDescription ||
        operators.length === 0 ||
        !placePhoto
    ) {
        throw new Error(
            `${modulePrefix}.DETAILS.QUALIFICATION.EDIT_FIELDS_REQUIRED`
        );
    }

    return {
        latitude,
        longitude,
        locationName,
        reportType,
        operators,
        description,
        placeDescription,
        placePhoto,
    };
}

/** `modulePrefix` — voir `workflow-details-filter.vo.ts` pour la justification. */
export function workflowDetailsQualificationVo(
    contract: WorkflowDetailsQualificationContract,
    modulePrefix: string
): WorkflowDetailsQualificationContract {
    const decision = contract.decision;
    if (decision !== 'accepted' && decision !== 'rejected') {
        throw new Error(
            `${modulePrefix}.DETAILS.QUALIFICATION.DECISION_REQUIRED`
        );
    }

    const comment = contract.comment?.trim() ?? '';
    const reason = contract.reason?.trim() ?? '';

    if (decision === 'rejected') {
        if (!reason) {
            throw new Error(
                `${modulePrefix}.DETAILS.QUALIFICATION.REASON_REQUIRED`
            );
        }
        if (!comment) {
            throw new Error(
                `${modulePrefix}.DETAILS.QUALIFICATION.COMMENT_REQUIRED`
            );
        }
    }

    const approvalType = contract.approvalType?.trim() || 'view';
    const callbackType = contract.callbackType?.trim() || null;

    if (
        decision === 'accepted' &&
        approvalType === 'callback' &&
        !callbackType
    ) {
        throw new Error(
            `${modulePrefix}.DETAILS.QUALIFICATION.CALLBACK_TYPE_REQUIRED`
        );
    }

    let editFields: WorkflowDetailsQualificationEditFields | undefined;
    if (
        decision === 'accepted' &&
        (approvalType === 'edit' || approvalType === 'callback')
    ) {
        if (!comment) {
            throw new Error(
                `${modulePrefix}.DETAILS.QUALIFICATION.COMMENT_REQUIRED`
            );
        }
        editFields = normalizeEditFields(contract, modulePrefix);
    }

    return {
        decision,
        comment,
        reason,
        approvalType,
        callbackType: approvalType === 'callback' ? callbackType : null,
        editFields,
    };
}
