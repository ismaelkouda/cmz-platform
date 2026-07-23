export interface ConfirmOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
}

/**
 * Port de dialogue de confirmation (modales) — **abstraction agnostique**.
 * Adaptateur : **SweetAlert2** (vanilla, Angular + React). Cf. ADR-0012.
 */
export abstract class ConfirmDialogPort {
    /** Ouvre une confirmation ; résout `true` si confirmé. */
    abstract confirm(
        message: string,
        options?: ConfirmOptions
    ): Promise<boolean>;

    /** Ouvre une alerte simple. */
    abstract alert(message: string, options?: ConfirmOptions): Promise<void>;
}
