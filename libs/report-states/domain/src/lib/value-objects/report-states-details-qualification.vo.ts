import {
    ReportStatesDetailsQualificationContract,
    ReportStatesDetailsQualificationEditFields,
} from '../contracts/report-states-details-qualification.contract';

function normalizeEditFields(
    contract: ReportStatesDetailsQualificationContract
): ReportStatesDetailsQualificationEditFields | undefined {
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
        throw new Error('REQUESTS.DETAILS.QUALIFICATION.EDIT_FIELDS_REQUIRED');
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

export function reportStatesDetailsQualificationVo(
    contract: ReportStatesDetailsQualificationContract
): ReportStatesDetailsQualificationContract {
    const decision = contract.decision;
    if (decision !== 'accepted' && decision !== 'rejected') {
        throw new Error('REQUESTS.DETAILS.QUALIFICATION.DECISION_REQUIRED');
    }

    const comment = contract.comment?.trim() ?? '';
    const reason = contract.reason?.trim() ?? '';

    if (decision === 'rejected') {
        if (!reason) {
            throw new Error('REQUESTS.DETAILS.QUALIFICATION.REASON_REQUIRED');
        }
        if (!comment) {
            throw new Error('REQUESTS.DETAILS.QUALIFICATION.COMMENT_REQUIRED');
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
            'REQUESTS.DETAILS.QUALIFICATION.CALLBACK_TYPE_REQUIRED'
        );
    }

    let editFields: ReportStatesDetailsQualificationEditFields | undefined;
    if (
        decision === 'accepted' &&
        (approvalType === 'edit' || approvalType === 'callback')
    ) {
        if (!comment) {
            throw new Error('REQUESTS.DETAILS.QUALIFICATION.COMMENT_REQUIRED');
        }
        editFields = normalizeEditFields(contract);
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
