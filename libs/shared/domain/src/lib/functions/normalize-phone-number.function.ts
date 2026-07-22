export function normalizePhoneNumber(phone?: string): string | undefined {
    if (!phone) {
        return undefined;
    }

    // remplace tous les non-chiffres ; `replace` + regex globale = équivalent
    // ES2020 de `replaceAll` (le source utilisait replaceAll → lib ES2021).
    return phone.replace(/\D/g, '');
}
