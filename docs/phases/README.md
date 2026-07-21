# Journal des phases

Le monorepo est construit **phase par phase**, chaque phase étant validée avant
que la suivante ne démarre. Ce dossier conserve la trace de ce qui a été fait,
avec les commandes exactes, pour que le workspace soit reproductible.

## Règles

- **Un fichier par phase** : `phase-NN-titre-en-kebab-case.md`.
- Utiliser [`template.md`](./template.md) comme point de départ.
- Une phase terminée n'est **plus modifiée**. Si elle doit être corrigée, une
  nouvelle phase de correction est ajoutée.
- Chaque phase indique explicitement **ce qu'elle ne fait pas**, pour éviter
  toute ambiguïté sur le périmètre.

## Feuille de route

| Phase                                             | Objet                                                                       | Statut          |
| ------------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| [01](./phase-01-squelette-nx.md)                  | Squelette du workspace Nx package-based + socle documentaire                | ✅ Terminée     |
| [01b](./phase-01b-corrections-socle.md)           | Corrections de socle issues de la revue (nommage, structure, Git, versions) | ✅ Terminée     |
| [01c](./phase-01c-politique-de-versions.md)       | Politique de version unique (catalog bun + vérification)                    | ✅ Terminée     |
| [01d](./phase-01d-conventions-et-observations.md) | Conventions de collaboration, garde-fous, traitement des observations       | ✅ Terminée     |
| [01e](./phase-01e-recadrage-angular-22-seos.md)   | Recadrage : Angular 22 et reconstruction pilotée par les patterns SEOS      | ✅ Terminée     |
| 02                                                | Application Angular 22 (`apps/backoffice-angular`)                          | ⏳ Non démarrée |
| 03                                                | Découpage en packages (domain / data / application / ui / feature)          | ⏳ Non démarrée |
| 04                                                | Dépendances métier (NgRx, PrimeNG, Tailwind, i18n…)                         | ⏳ Non démarrée |
| 05                                                | Qualité & tests (ESLint + boundaries, Prettier, Stylelint, Vitest, e2e)     | ⏳ Non démarrée |
| 06                                                | Environnements, Docker, CI (`nx affected`)                                  | ⏳ Non démarrée |
| 07                                                | Migration progressive des pages métier                                      | ⏳ Non démarrée |
| 08                                                | Vérification fonctionnelle vs. l'application d'origine                      | ⏳ Non démarrée |

### Stacks ultérieures

Le monorepo est conçu pour accueillir d'autres stacks, chacune faisant l'objet
de sa propre suite de phases une fois Angular stabilisé : React, React Native,
Kotlin, Swift, PHP, Spring Boot, Rust, Grafana. Aucune n'est démarrée.
