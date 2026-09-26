export const ACTION_AUTHORIZATION_CAPABILITY =
    'action.authorization.permissions-all@1';

export function noActionAuthorization() {
    return { mode: 'none' };
}

export function compileActionAuthorization(authorization) {
    if (!authorization || authorization.mode === 'none') {
        return noActionAuthorization();
    }
    return {
        mode: 'required',
        permissions: [...authorization.permissions].sort(),
        denied_behavior: authorization.denied_behavior,
    };
}

export function actionAuthorizationCapabilities(authorization) {
    return authorization?.mode === 'required'
        ? [ACTION_AUTHORIZATION_CAPABILITY]
        : [];
}

export function validateCompiledActionAuthorization(
    authorization,
    capabilities,
    path
) {
    const errors = [];
    const matching = (capabilities ?? []).filter((capability) =>
        capability.startsWith('action.authorization.')
    );
    if (authorization?.mode === 'required') {
        if (
            matching.length !== 1 ||
            matching[0] !== ACTION_AUTHORIZATION_CAPABILITY
        )
            errors.push(
                `${path}.capabilities: required authorization capability is missing or unsupported`
            );
        if (
            !Array.isArray(authorization.permissions) ||
            authorization.permissions.length === 0
        )
            errors.push(`${path}.authorization.permissions: required`);
        if (
            JSON.stringify(authorization.permissions) !==
            JSON.stringify([...(authorization.permissions ?? [])].sort())
        )
            errors.push(
                `${path}.authorization.permissions: entries must be sorted`
            );
        return errors;
    }
    if (authorization?.mode !== 'none')
        errors.push(`${path}.authorization.mode: unsupported`);
    if (matching.length > 0)
        errors.push(
            `${path}.capabilities: authorization.none forbids an authorization capability`
        );
    return errors;
}
