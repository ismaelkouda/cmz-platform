import {
    queryBindingModelId,
    resolveBindingSegment,
} from './list-query-collection.mjs';

export function resolveDataBindingSourceModel({
    binding,
    responseModelId,
    resolveModel,
    path,
    errors,
}) {
    let model = resolveModel(responseModelId);
    const sourcePath = binding.source_path ?? [];
    if (sourcePath.length === 0) {
        if (responseModelId !== binding.model_id) {
            errors.push(`${path}.model_id: does not match response body model`);
            return undefined;
        }
        return model;
    }

    for (const [index, segment] of sourcePath.entries()) {
        const segmentPath = `${path}.source_path[${index}]`;
        if (model?.kind !== 'object') {
            errors.push(`${segmentPath}: cannot traverse a non-object model`);
            return undefined;
        }
        const field = model.fields.find(
            (candidate) => candidate.name === segment
        );
        if (!field) {
            errors.push(`${segmentPath}: unresolved field ${segment}`);
            return undefined;
        }
        // D-X5-1 : un champ d'éléments en ligne termine le chemin sur son
        // modèle élément, par le résolveur unique.
        const segmentModel = resolveBindingSegment(resolveModel, field);
        if (segmentModel.error) {
            errors.push(`${segmentPath}: ${segmentModel.error}`);
            return undefined;
        }
        if (segmentModel.last && index !== sourcePath.length - 1) {
            errors.push(`${segmentPath}: inline items must end the path`);
            return undefined;
        }
        model = segmentModel.model;
        if (!model) {
            errors.push(
                `${segmentPath}: unresolved model ${field.type.model_id}`
            );
            return undefined;
        }
    }
    if (model.id !== binding.model_id) {
        errors.push(
            `${path}.model_id: does not match source_path terminal model`
        );
        return undefined;
    }
    return model;
}

export function assertQueryOutputBinding(binding, operation, fail) {
    if (binding.response_status !== operation.transport.success_response_status)
        fail(`${binding.id} response status differs from its query primitive`);
    if (binding.model_id !== queryBindingModelId(operation))
        fail(`${binding.id} response model differs from its query primitive`);
    const sourcePath = binding.source_path ?? [];
    const expected =
        operation.transport.result.kind === 'page'
            ? [operation.transport.result.items_field]
            : [];
    if (JSON.stringify(sourcePath) !== JSON.stringify(expected))
        fail(`${binding.id} source path differs from its query primitive`);
}

export function assertActionOutputBinding(binding, operation, fail) {
    if ((binding.source_path ?? []).length > 0)
        fail(`${binding.id} action result cannot declare a source path`);
    if (binding.response_status !== operation.transport.success_response_status)
        fail(`${binding.id} response status differs from its action primitive`);
    if (binding.model_id !== operation.transport.response_model_id)
        fail(`${binding.id} response model differs from its action primitive`);
}
