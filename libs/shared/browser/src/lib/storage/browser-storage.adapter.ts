import { Service } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

@Service()
export class BrowserStorageAdapter implements StoragePort {
    private readonly DEFAULT_ENCRYPTION_KEY = 'K0ud@';
    private readonly ENCRYPTION_PREFIX = '0715517685:';

    // ---- Sync (non chiffré) ----
    save(key: string, value: unknown): void {
        localStorage.setItem(key, this.serialize(value));
    }

    get<T>(key: string, defaultValue: T | null = null): T | null {
        const data = localStorage.getItem(key);
        return data === null ? defaultValue : this.tryParse<T>(data);
    }

    remove(key: string): void {
        localStorage.removeItem(key);
    }

    hasKey(key: string): boolean {
        return localStorage.getItem(key) !== null;
    }

    // ---- Async chiffré ----
    async saveEncrypted(key: string, value: unknown): Promise<void> {
        const cipher = await this.encrypt(this.serialize(value));
        localStorage.setItem(key, `${this.ENCRYPTION_PREFIX}${cipher}`);
    }

    async getEncrypted<T>(key: string): Promise<T | null> {
        const data = localStorage.getItem(key);
        if (data === null) {
            return null;
        }
        if (!data.startsWith(this.ENCRYPTION_PREFIX)) {
            return this.tryParse<T>(data);
        }
        const plain = await this.decrypt(
            data.slice(this.ENCRYPTION_PREFIX.length)
        );
        return this.tryParse<T>(plain);
    }

    async removeKeysWithPrefix(prefix: string): Promise<void> {
        Object.keys(localStorage)
            .filter((k) => k.startsWith(prefix))
            .forEach((k) => localStorage.removeItem(k));
    }

    async clearEncrypted(): Promise<void> {
        Object.keys(localStorage)
            .filter((k) =>
                localStorage.getItem(k)?.startsWith(this.ENCRYPTION_PREFIX)
            )
            .forEach((k) => localStorage.removeItem(k));
    }

    // ---- Internals ----
    private serialize(value: unknown): string {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    private tryParse<T>(data: string): T {
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as unknown as T;
        }
    }

    private async deriveKey(passphrase: string): Promise<CryptoKey> {
        const hash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(passphrase)
        );
        return crypto.subtle.importKey(
            'raw',
            hash,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }

    private async encrypt(value: string, customKey?: string): Promise<string> {
        const key = await this.deriveKey(
            customKey ?? this.DEFAULT_ENCRYPTION_KEY
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(value)
        );
        return this.toBase64(this.concat(iv, new Uint8Array(ciphertext)));
    }

    private async decrypt(
        payload: string,
        customKey?: string
    ): Promise<string> {
        const bytes = this.fromBase64(payload);
        const iv = bytes.slice(0, 12);
        const ciphertext = bytes.slice(12);
        const key = await this.deriveKey(
            customKey ?? this.DEFAULT_ENCRYPTION_KEY
        );
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(plain);
    }

    private concat(a: Uint8Array, b: Uint8Array): Uint8Array {
        const out = new Uint8Array(a.length + b.length);
        out.set(a, 0);
        out.set(b, a.length);
        return out;
    }

    private toBase64(bytes: Uint8Array): string {
        let binary = '';
        bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
        return btoa(binary);
    }

    private fromBase64(b64: string): Uint8Array {
        const binary = atob(b64);
        const out = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            out[i] = binary.charCodeAt(i);
        }
        return out;
    }
}
