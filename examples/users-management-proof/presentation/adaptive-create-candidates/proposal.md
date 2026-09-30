# C5 ADAPT-10b — références de création adaptative

- **Statut :** Approved — validation produit explicite de l'intégralité du
  dossier le 2026-09-30 ; revue technique requise
- **Autorité :** `candidate-only`, absente du manifeste actif avant ADAPT-10c
- **Page :** `page_6666666666666666`
- **Route :** `/settings-security/users`
- **Date :** 2026-09-30
- **Décision source :**
  [ADR-0076](../../../../docs/adr/0076-surface-creation-adaptative-bornee-par-contenu.md)

## 1. Résultat matérialisé

Ce lot représente la même tâche de création modale dans les trois classes de
fenêtre :

- `compact` : task sheet ancrée en bas, pleine largeur et à une colonne ;
- `medium` : dialogue latéral droit superposé, à une colonne ;
- `expanded` : dialogue levité centré, à deux colonnes au maximum ;
- header et footer fixes, corps seul défilable ;
- ordre stable `Nom`, `Prénom`, `Email`, `Téléphone`, `Profil` ;
- arrière-plan visible mais inerte, sans redimensionnement de la liste.

La validation produit couvre explicitement l'intégralité de ce dossier : les
quatre références principales présentées en premier, les trois états
complémentaires présentés le 2026-09-30, leur source HTML et le présent dossier
de preuve. Elle ne réactive aucune image rejetée par PRES-AUTH-1.

## 2. Ressources approuvées

| Classe     | État                 | PNG                                    | Viewport    | Octets | SHA-256                                                            |
| ---------- | -------------------- | -------------------------------------- | ----------- | -----: | ------------------------------------------------------------------ |
| `compact`  | vierge               | `compact-pristine.proposed.png`        | 390 × 844   | 46 593 | `3ec2e75492be08658577740c9a6e6adf74dd5475f66f4e948652a0704c81941a` |
| `compact`  | clavier virtuel      | `compact-keyboard.proposed.png`        | 390 × 844   | 34 599 | `8d7da6b46927bf533a6e3ada10b3762e29e9015d4cc242ccb6bb078e58905890` |
| `medium`   | vierge               | `medium-pristine.proposed.png`         | 1024 × 768  | 75 546 | `2618b28e2452e61777d14239fd7a1ac565d271eef3ed00b3b097d6490c271b1f` |
| `medium`   | soumission invalide  | `medium-invalid.proposed.png`          | 1024 × 768  | 82 420 | `4121e8974e8466f407f2073bd877f0532c92d7f7fa642a87bf111b532b794faf` |
| `expanded` | vierge               | `expanded-pristine.proposed.png`       | 1440 × 1024 | 88 604 | `6d8e64a2150a809a73b386317f60d9ccace0ac3ec00641df76b8e46a92c34f73` |
| `expanded` | conflit email        | `expanded-email-conflict.proposed.png` | 1440 × 1024 | 96 344 | `eb2b85e4f5ee17415a9ef60ff7faef2bc4edd9eba39c5d7c61baf888b52daa98` |
| `expanded` | soumission en cours  | `expanded-submitting.proposed.png`     | 1440 × 1024 | 89 468 | `e696f76a47a41bb3564029bdf7deb766f22095a3c4c46c087d2a968aba6b6b08` |

| Source déterministe      | Octets | SHA-256                                                            |
| ------------------------ | -----: | ------------------------------------------------------------------ |
| `mockup.proposed.html`   | 23 065 | `aef0dd3f61499c1e549aa03f785ac289006b256debd050dc0647cde19d44183d` |

Les identités et adresses sont synthétiques ; `example.invalid` est réservé aux
exemples. Les sept PNG ont été rendus avec Playwright `1.62.1`, le Chromium
local verrouillé et un ratio de pixel de `1`. Un second rendu indépendant du
HTML source a reproduit les sept empreintes à l'identique, octet par octet.

## 3. Matrice de rendu

Le HTML utilise uniquement les paramètres `layout` et `state` :

| PNG                                    | `layout`   | `state`      |
| -------------------------------------- | ---------- | ------------ |
| `compact-pristine.proposed.png`        | `compact`  | `pristine`   |
| `compact-keyboard.proposed.png`        | `compact`  | `keyboard`   |
| `medium-pristine.proposed.png`         | `medium`   | `pristine`   |
| `medium-invalid.proposed.png`          | `medium`   | `invalid`    |
| `expanded-pristine.proposed.png`       | `expanded` | `pristine`   |
| `expanded-email-conflict.proposed.png` | `expanded` | `conflict`   |
| `expanded-submitting.proposed.png`     | `expanded` | `submitting` |

Cette source sert à reproduire l'intention visuelle. Elle n'est ni un composant
Angular, ni une primitive de plateforme, ni une nouvelle dépendance UI.

## 4. Ce que chaque état fixe

### Vierge

- ordre visuel canonique des cinq champs ;
- placement propre à chaque classe de fenêtre ;
- taille naturelle bornée par l'espace disponible ;
- actions `Annuler` et `Créer` dans un footer stable.

### Clavier compact

- header et footer restent visibles avec le clavier virtuel ;
- le corps du formulaire défile indépendamment ;
- le champ actif reste dans la zone utile ;
- aucune action principale n'est recouverte.

### Invalide Medium

- message global et erreurs textuelles inline ;
- premier champ invalide visuellement focalisé ;
- bouton `Créer` utilisable avant la tentative ;
- footer fixe malgré la hauteur supplémentaire des erreurs.

### Conflit email Expanded

- erreur distante globale et erreur associée à `Email` ;
- autres valeurs et sélection de profil conservées ;
- géométrie à deux colonnes inchangée.

### Soumission Expanded

- valeurs conservées pendant le POST ;
- état `Création…` perceptible ;
- action de soumission indisponible pendant le mono-vol.

## 5. Limites explicites des images

Ces wireframes approuvent l'intention visuelle, pas son comportement réel. Une
capture ne prouve pas :

- l'inertie effective de l'arrière-plan ou le piège de focus ;
- la restitution du focus au déclencheur ;
- la fermeture par `Escape` et la confirmation d'abandon ;
- l'absence de POST invalide ou le mono-vol réseau ;
- l'unique rafraîchissement de liste après succès ;
- la conservation du formulaire pendant un changement de classe de fenêtre ;
- le reflow à 320 CSS px, le zoom à 200 % ou les safe areas réels.

Ces comportements appartiennent aux oracles ADAPT-10d puis aux preuves
navigateur ADAPT-10f.

## 6. Frontières et refus de la revue

Soumaila doit refuser ce lot si :

1. un fichier runtime, un contrat API, un work order ou une dépendance change ;
2. les PNG diffèrent des empreintes approuvées ;
3. le manifeste actif publie déjà ces candidats avant ADAPT-10c ;
4. une référence issue de `adaptive-candidates/`, `filter-candidates/` ou des
   quatre PNG racine rejetés redevient autorité ;
5. l'une des trois captures externes non suivies entre dans le commit ;
6. le HTML candidat est présenté comme une preuve d'accessibilité ou réseau ;
7. la géométrie C5 devient une règle universelle du générateur.

## 7. Suite autorisée

Après revue et fusion de ce lot :

1. ADAPT-10c publie exactement les sept PNG approuvés et leurs empreintes dans
   le manifeste `presentation-evidence` ;
2. ADAPT-10d écrit les oracles comportementaux en échec attendu strict sur le
   runtime historique ;
3. ADAPT-10e recalcule le work order depuis le nouveau `main` puis réalise le
   changement borné ;
4. ADAPT-10f produit les preuves du vrai navigateur et fait relire les octets
   finaux avant fusion.

## 8. Références

- [Décision ADAPT-10](../../../../docs/architecture/c5-adapt10-surface-creation-adaptative-2026-09-29.md)
- [ADR-0076](../../../../docs/adr/0076-surface-creation-adaptative-bornee-par-contenu.md)
- [Material 3 — dialogs](https://m3.material.io/components/dialogs/guidelines)
- [Angular Material — dialog](https://material.angular.dev/components/dialog/overview)
- [Angular CDK — accessibility](https://material.angular.dev/cdk/a11y/overview)
- [WAI-ARIA APG — modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG — reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow)
