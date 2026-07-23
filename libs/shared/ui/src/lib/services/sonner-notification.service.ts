import { Service } from '@angular/core';
import { toast } from 'ngx-sonner';
import {
    NotificationPort,
    NotificationSeverity,
} from '@cmz/shared-application';

/**
 * Adaptateur Angular de `NotificationPort` sur **ngx-sonner** (Sonner).
 * L'app doit inclure `<ngx-sonner-toaster />` pour le rendu. Cf. ADR-0012.
 */
@Service()
export class SonnerNotificationService extends NotificationPort {
    notify(severity: NotificationSeverity, message: string): void {
        switch (severity) {
            case 'success':
                this.success(message);
                break;
            case 'error':
                this.error(message);
                break;
            case 'warning':
                this.warning(message);
                break;
            case 'info':
                this.info(message);
                break;
        }
    }

    success(message: string): void {
        toast.success(message);
    }

    error(message: string): void {
        toast.error(message);
    }

    warning(message: string): void {
        toast.warning(message);
    }

    info(message: string): void {
        toast.info(message);
    }
}
