import { Service } from '@angular/core';
import { LoggerPort } from '@cmz/shared-domain';

/**
 * Adaptateur console — implémentation par défaut de `LoggerPort` (audit
 * P-1, `audit-workspace-2026-08-02-revue-finale.md`). Écrit sur la console
 * du navigateur, préfixé et horodaté pour rester grep-able manuellement en
 * l'absence d'un vrai collecteur (P-3, non décidé). Aucune sortie réseau —
 * délibéré, voir le docstring de `LoggerPort`.
 */
@Service()
export class ConsoleLoggerAdapter implements LoggerPort {
    debug(message: string, context?: Record<string, unknown>): void {
        console.debug(this.prefix('DEBUG', message), context ?? '');
    }

    info(message: string, context?: Record<string, unknown>): void {
        console.info(this.prefix('INFO', message), context ?? '');
    }

    warn(message: string, context?: Record<string, unknown>): void {
        console.warn(this.prefix('WARN', message), context ?? '');
    }

    error(
        message: string,
        error?: unknown,
        context?: Record<string, unknown>
    ): void {
        console.error(
            this.prefix('ERROR', message),
            error ?? '',
            context ?? ''
        );
    }

    private prefix(level: string, message: string): string {
        return `[${new Date().toISOString()}] [${level}] ${message}`;
    }
}
