/**
 * Convertit un payload plat en `FormData`, pour les endpoints qui acceptent un
 * upload de fichier (`multipart/form-data`) — première apparition dans le
 * socle avec `optical-fiber-network` (`geom_file`). Fidèle à l'utilitaire
 * `formDataBuilder` du source (`src/shared/constants/formDataBuilder.constant.ts`) :
 * `undefined`/`null`/`''` sont ignorés, les `File` sont ajoutés tels quels, les
 * tableaux et objets sont sérialisés en JSON, le reste en `String(value)`.
 */
export function buildFormData(payload: Record<string, unknown>): FormData {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        if (value instanceof File) {
            formData.append(key, value);
        } else if (Array.isArray(value) || typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, String(value));
        }
    });

    return formData;
}
