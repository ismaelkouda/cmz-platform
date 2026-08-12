/**
 * Port stockage local — abstraction agnostique.
 * Adaptateur : @cmz/shared-browser (Web Crypto + localStorage).
 *
 * **`*Obfuscated` — nom délibéré, pas `*Encrypted`.** Un chiffrement dont la
 * clé est livrée dans le bundle client ne peut être qu'une obfuscation :
 * n'importe qui peut extraire la clé du code source et déchiffrer. L'ancien
 * nom (`saveEncrypted`/`getEncrypted`/`clearEncrypted`) promettait une
 * confidentialité que le navigateur ne peut pas fournir — corrigé après
 * audit (`audit-workspace-2026-08-02-addendum.md`, P1-18/I-9). Ceci
 * **relève** la barre d'inspection occasionnelle (un `localStorage.getItem`
 * dans les devtools ne montre pas la valeur en clair) ; ce n'est **pas** une
 * protection contre un attaquant qui lit le bundle JS. La vraie protection
 * d'un jeton de session reste côté serveur : durée de vie courte + refresh,
 * `HttpOnly` si l'architecture le permet un jour (cf. commentaire de
 * `BrowserStorageAdapter`).
 */
/**
 * Contrat agnostique pur (ADR-0024 : `interface`, pas `abstract class`).
 * Jeton d'injection Angular (`STORAGE_PORT`) séparé, dans
 * `@cmz/shared-application` (consommé aussi par `@cmz/shared-ui`, autorisé
 * par `eslint.config.mjs` : `type:ui` dépend de `type:application`).
 */
export interface StoragePort {
    save(key: string, value: unknown): void;

    get<T>(key: string, defaultValue: T | null): T | null;

    remove(key: string): void;

    hasKey(key: string): boolean;

    saveObfuscated(key: string, value: unknown): Promise<void>;

    getObfuscated<T>(key: string): Promise<T | null>;

    removeKeysWithPrefix(prefix: string): Promise<void>;

    clearObfuscated(): Promise<void>;

    /** Purge totale du stockage local (session incluse). */
    clearAll(): void;
}
