import { parseDocument } from 'yaml';

export function parseStructuredSource(content, label = 'source') {
    const text = Buffer.isBuffer(content) ? content.toString('utf8') : content;
    const document = parseDocument(text, {
        maxAliasCount: 0,
        prettyErrors: true,
        strict: true,
        uniqueKeys: true,
    });
    if (document.errors.length > 0) {
        throw new Error(
            `${label}: invalid JSON/YAML:\n${document.errors.map((error) => error.message).join('\n')}`
        );
    }
    const value = document.toJS({ maxAliasCount: 0 });
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`${label}: root must be an object`);
    }
    return value;
}
