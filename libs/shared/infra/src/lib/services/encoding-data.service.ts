import { Service } from '@angular/core';

/**
 * Stockage local avec chiffrement optionnel, via la **Web Crypto API** (AES-GCM)
 * — native, aucune dépendance externe (remplace `crypto-js`).
 *
 * Stockage synchrone (sans crypto) et chiffrement **asynchrone** (`crypto.subtle`
 * l'impose). Sécurité : chiffrer côté client avec une clé embarquée dans le
 * bundle est de l'**obfuscation**, pas une garantie de confidentialité — ne pas
 * y déposer de secret dont la fuite serait critique.
 */
@Service()
export class EncodingDataService {
    private readonly DEFAULT_ENCRYPTION_KEY = 'Im@k0';
    private readonly ENCRYPTION_PREFIX = '0715517685:';

    // ----- Stockage (synchrone, sans crypto) -----

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

    getAllKeys(): string[] {
        return Object.keys(localStorage);
    }

    removeKeysWithPrefix(prefix: string): void {
        this.getAllKeys()
            .filter((key) => key.startsWith(prefix))
            .forEach((key) => this.remove(key));
    }

    clearEncryptedData(): void {
        this.getAllKeys().forEach((key) => {
            if (localStorage.getItem(key)?.startsWith(this.ENCRYPTION_PREFIX)) {
                this.remove(key);
            }
        });
    }

    // ----- Chiffrement (asynchrone, Web Crypto AES-GCM) -----

    async saveEncrypted(key: string, value: unknown): Promise<void> {
        const cipher = await this.encrypt(this.serialize(value));
        localStorage.setItem(key, `${this.ENCRYPTION_PREFIX}${cipher}`);
    }

    async getEncrypted<T>(
        key: string,
        defaultValue: T | null = null
    ): Promise<T | null> {
        const data = localStorage.getItem(key);
        if (data === null) {
            return defaultValue;
        }
        if (!data.startsWith(this.ENCRYPTION_PREFIX)) {
            return this.tryParse<T>(data);
        }
        const plain = await this.decrypt(
            data.slice(this.ENCRYPTION_PREFIX.length)
        );
        return this.tryParse<T>(plain);
    }

    async encrypt(value: string, customKey?: string): Promise<string> {
        const key = await this.deriveKey(
            customKey ?? this.DEFAULT_ENCRYPTION_KEY
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv as BufferSource },
            key,
            new TextEncoder().encode(value) as BufferSource
        );
        return this.toBase64(this.concat(iv, new Uint8Array(ciphertext)));
    }

    async decrypt(payload: string, customKey?: string): Promise<string> {
        const bytes = this.fromBase64(payload);
        const iv = bytes.slice(0, 12);
        const ciphertext = bytes.slice(12);
        const key = await this.deriveKey(
            customKey ?? this.DEFAULT_ENCRYPTION_KEY
        );
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as BufferSource },
            key,
            ciphertext as BufferSource
        );
        return new TextDecoder().decode(plain);
    }

    // ----- Interne -----

    private async deriveKey(passphrase: string): Promise<CryptoKey> {
        const hash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(passphrase) as BufferSource
        );
        return crypto.subtle.importKey(
            'raw',
            hash,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }

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
