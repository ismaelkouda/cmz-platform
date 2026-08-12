export interface ConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
}

/**
 * Port de dialogue de confirmation (modales) — **abstraction agnostique**.
 * Adaptateur : **SweetAlert2** (vanilla, Angular + React). Cf. ADR-0012.
 *
 * Interface pure depuis ADR-0024 (Chantier Q). Jeton `CONFIRM_DIALOG_PORT`
 * colocalisé dans `@cmz/shared-ui` (`CmzConfirmDialogService`, adaptateur
 * et seul point de câblage) — consommé par `inject()` depuis ~13 modules
 * fonctionnels isolés par `scope:*` (`eslint.config.mjs`), qui ne peuvent
 * pas se référencer entre eux : seule une lib `scope:shared` peut héberger
 * un jeton partagé par tous.
 */
export interface ConfirmDialogPort {
    /** Ouvre une confirmation ; résout `true` si confirmé. */
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>;

    /** Ouvre une alerte simple. */
    alert(message: string, options?: ConfirmOptions): Promise<void>;
}
