import { Service } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

/**
 * Adaptateur `localStorage` + Web Crypto (AES-GCM/PBKDF2).
 *
 * **Portée réelle, à ne jamais confondre avec de la confidentialité :** la
 * clé de dérivation vit dans ce fichier, donc dans le bundle client — tout
 * navigateur qui exécute l'application peut lire ce code et reconstruire la
 * clé. C'est de l'**obfuscation** (masque un `localStorage.getItem` occasionnel
 * dans les devtools) et non un chiffrement opposable à un attaquant qui
 * inspecte le bundle JS. Corrigé après audit
 * (`audit-workspace-2026-08-02-addendum.md`, P1-18) :
 * - méthodes renommées `*Obfuscated` (`StoragePort`) — plus de promesse de
 *   confidentialité dans le nom ;
 * - dérivation renforcée : PBKDF2 (100 000 itérations, SHA-256) au lieu d'un
 *   simple hash SHA-256 non salé — toujours de l'obfuscation, mais qui ne
 *   cède plus au premier essai naïf ;
 * - préfixe `obf:` (neutre) au lieu de `'0715517685:'`, qui ressemblait à un
 *   numéro de téléphone et pouvait induire en erreur quiconque inspecte le
 *   stockage.
 *
 * La protection réelle d'une session (jeton, permissions) reste une
 * responsabilité **serveur** : durée de vie courte + refresh, `HttpOnly` si
 * l'architecture le permet. Ce composant n'a pas vocation à la remplacer —
 * volontairement pas de changement d'architecture ici (hors périmètre de ce
 * correctif), seulement l'alignement du nom sur ce que le mécanisme fait
 * réellement.
 */
@Service()
export class BrowserStorageAdapter implements StoragePort {
    private readonly OBFUSCATION_PASSPHRASE = 'cmz-platform-local-storage-v1';
    private readonly OBFUSCATION_SALT = 'cmz-platform-static-salt-v1';
    private readonly OBFUSCATION_PREFIX = 'obf:';
    private readonly PBKDF2_ITERATIONS = 100_000;

    // ---- Sync (non obfusqué) ----
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

    // ---- Async obfusqué ----
    async saveObfuscated(key: string, value: unknown): Promise<void> {
        const cipher = await this.obfuscate(this.serialize(value));
        localStorage.setItem(key, `${this.OBFUSCATION_PREFIX}${cipher}`);
    }

    async getObfuscated<T>(key: string): Promise<T | null> {
        const data = localStorage.getItem(key);
        if (data === null) {
            return null;
        }
        if (!data.startsWith(this.OBFUSCATION_PREFIX)) {
            return this.tryParse<T>(data);
        }
        const plain = await this.deobfuscate(
            data.slice(this.OBFUSCATION_PREFIX.length)
        );
        return this.tryParse<T>(plain);
    }

    async removeKeysWithPrefix(prefix: string): Promise<void> {
        Object.keys(localStorage)
            .filter((k) => k.startsWith(prefix))
            .forEach((k) => localStorage.removeItem(k));
    }

    async clearObfuscated(): Promise<void> {
        Object.keys(localStorage)
            .filter((k) =>
                localStorage.getItem(k)?.startsWith(this.OBFUSCATION_PREFIX)
            )
            .forEach((k) => localStorage.removeItem(k));
    }

    clearAll(): void {
        localStorage.clear();
        sessionStorage.clear();
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
        const material = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode(this.OBFUSCATION_SALT),
                iterations: this.PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    private async obfuscate(
        value: string,
        customPassphrase?: string
    ): Promise<string> {
        const key = await this.deriveKey(
            customPassphrase ?? this.OBFUSCATION_PASSPHRASE
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(value)
        );
        return this.toBase64(this.concat(iv, new Uint8Array(ciphertext)));
    }

    private async deobfuscate(
        payload: string,
        customPassphrase?: string
    ): Promise<string> {
        const bytes = this.fromBase64(payload);
        const iv = bytes.slice(0, 12);
        const ciphertext = bytes.slice(12);
        const key = await this.deriveKey(
            customPassphrase ?? this.OBFUSCATION_PASSPHRASE
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
