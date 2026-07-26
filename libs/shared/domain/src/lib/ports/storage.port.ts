/**
 * Port stockage local chiffré — abstraction agnostique.
 * Adaptateur : @cmz/shared-browser (Web Crypto + localStorage).
 */
export abstract class StoragePort {
    abstract save(key: string, value: unknown): void;

    abstract get<T>(key: string, defaultValue: T | null): T | null;

    abstract remove(key: string): void;

    abstract hasKey(key: string): boolean;

    abstract saveEncrypted(key: string, value: unknown): Promise<void>;

    abstract getEncrypted<T>(key: string): Promise<T | null>;

    abstract removeKeysWithPrefix(prefix: string): Promise<void>;

    abstract clearEncrypted(): Promise<void>;
}
