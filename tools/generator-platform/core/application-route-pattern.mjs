// X4-sécurité-3 (R-B, §5) : motif des chemins de route d'application, lu dans
// le schéma `application-design` et jamais recopié. Il exclut par
// construction `//`, tout schéma, `..`, `%`, `\`, la requête et le fragment.
import { readFileSync } from 'node:fs';

let cached;

export function applicationRoutePattern() {
    if (cached) return cached;
    const schema = JSON.parse(
        readFileSync(
            new URL(
                '../schemas/application-design.schema.json',
                import.meta.url
            ),
            'utf8'
        )
    );
    const source = schema.$defs?.page?.properties?.path?.pattern;
    if (
        typeof source !== 'string' ||
        !source.startsWith('^') ||
        !source.endsWith('$')
    )
        throw new Error('application route pattern is missing from the schema');
    cached = Object.freeze({ source, regexp: new RegExp(source) });
    return cached;
}
