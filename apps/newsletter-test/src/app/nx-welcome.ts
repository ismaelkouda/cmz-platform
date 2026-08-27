import { Component } from '@angular/core';

/**
 * Placeholder minimal — remplace la page d'accueil Nx par défaut (retirée
 * car elle dépassait le plafond de poids de fichier du repo, voir
 * tools/check-file-weight.mjs). À remplacer par le vrai composant newsletter
 * une fois le code généré par generator-platform câblé dans cette app.
 */
@Component({
    selector: 'app-nx-welcome',
    standalone: true,
    template: `<p>{{ title }} — app de test, en cours de câblage.</p>`,
})
export class NxWelcome {
    protected readonly title = 'newsletter-test';
}
