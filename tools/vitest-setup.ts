/**
 * Setup global Vitest pour les tests de bibliothèques (ADR-0008).
 *
 * Charge le compilateur JIT Angular une seule fois avant l'exécution des tests
 * de chaque package. Évite de répéter `import '@angular/compiler';` dans chaque
 * fichier `.spec.ts` et évite de polluer les `package.json` métier avec une
 * dépendance d'outillage de test runner.
 */
import '@angular/compiler';
