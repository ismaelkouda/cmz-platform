import { Service } from '@angular/core';
import Swal from 'sweetalert2';
import { ConfirmDialogPort, ConfirmOptions } from '@cmz/shared-application';

/**
 * Adaptateur de `ConfirmDialogPort` sur **SweetAlert2** (agnostique). Cf. ADR-0012.
 */
@Service()
export class SweetAlertConfirmDialog extends ConfirmDialogPort {
    async confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
        const result = await Swal.fire({
            title: options?.title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: options?.confirmText ?? 'OK',
            cancelButtonText: options?.cancelText ?? 'Annuler',
        });
        return result.isConfirmed;
    }

    async alert(message: string, options?: ConfirmOptions): Promise<void> {
        await Swal.fire({ title: options?.title, text: message });
    }
}
