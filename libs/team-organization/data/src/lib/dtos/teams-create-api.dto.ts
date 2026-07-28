/**
 * `permissions` en `number[]` sur le wire (le source convertit
 * `props.permissions.map(Number)` — les `value` de permission sont des
 * identifiants numériques stringifiés côté domaine).
 */
export interface TeamsCreateApiDto {
    name: string;
    description: string;
    operators: string[];
    report_types: string[];
    permissions?: number[];
}
