# ADR-0082 — Séparer références actives et archives de présentation

- **Statut :** Superseded
- **Superseded by :**
  [ADR-0083 — Distinguer preuve de page, exemple de mise en page et archive](./0083-preuve-page-exemple-mise-en-page-et-archive.md)
- **Date :** 2026-10-03
- **Complète :**
  [ADR-0066 — preuve de présentation bornée](./0066-preuve-presentation-bornee-pour-realisation-llm.md)

## Contexte

Le manifeste `presentation-evidence` protège l'intégrité d'une image par son
chemin, sa taille et son hash. Cette intégrité ne suffit pas à garantir que
l'image est encore une bonne autorité.

Les anciennes références de vue de données C5 en donnent un contre-exemple :
elles ont été réellement validées pendant une étape de conception, mais elles
mélangent noyau de table, export et actions de ligne, nomment `medium` une
capture large de 1448 px et reposent sur un HTML non conforme au runtime
accessible. Leur hash est exact ; leur portée est devenue trompeuse.

Un humain ou un LLM qui rencontre un fichier versionné doit pouvoir distinguer
sans interprétation une autorité active, une source de discussion et une archive
sans autorité.

## Options envisagées

### Option A — Supprimer les références devenues fausses

- avantage : aucune ambiguïté dans l'état courant ;
- limites : perte des décisions utiles, des contre-exemples et de la traçabilité
  de revue.

### Option B — Conserver les fichiers avec un avertissement Markdown

- avantage : changement minimal ;
- limites : un consommateur automatique peut ignorer le texte, et le manifeste
  actif peut continuer à publier les images.

### Option C — Cycle de vie explicite et séparation machine-readable

- avantage : conservation sans autorité, validation automatique et échec fermé
  en cas de republication ;
- coût : manifeste d'archive, schéma et tests supplémentaires.

## Décision

**Option C.** Une référence de présentation appartient à exactement un des deux
ensembles suivants :

1. **active** : présente dans `presentation-evidence`, approuvée pour une portée
   explicite et consommable par le work order ;
2. **historical** : conservée sous `presentation/historical/`, déclarée avec
   `authority: none` et absente de tout manifeste actif.

Une archive ne peut jamais redevenir active par un simple changement de chemin
ou d'identifiant. Elle doit être reconstruite et repasser par une validation
produit avec l'autorité courante.

### Métadonnées minimales d'une archive

Le manifeste historique fermé déclare :

- la date et la raison du retrait ;
- les documents qui remplacent l'ancienne autorité ;
- les usages interdits ;
- les intentions encore utiles, sans les transformer en exigences ;
- les capacités visibles dans chaque ressource ;
- chemin, média, taille, hash et viewport de chaque source.

Les usages interdits couvrent au minimum : autorité de génération, baseline de
régression, inférence de capacité et copie du code de démonstration.

### Conditions d'une référence active future

Avant de republier des références de vue de données, le modèle actif devra
exprimer et vérifier :

- la ou les capacités nécessaires à l'applicabilité de chaque source ;
- un état précis, plutôt qu'un `ready` regroupant plusieurs situations ;
- la région de l'image qui fait autorité et les régions seulement illustratives
  ;
- la base de layout testée : viewport, conteneur ou composant ;
- les inférences interdites, notamment endpoint, permission et action absente.

Le noyau de vue, le panneau de filtres, les actions de ligne et l'export sont
des preuves séparées. Une image qui montre une capacité optionnelle ne
l'autorise jamais dans une page dont le contrat ne la déclare pas.

### Nature du code de reproduction

Un HTML ou script servant à produire une image est un outil d'archéologie ou de
reproductibilité, pas un exemple d'implémentation. Il n'acquiert aucune autorité
Angular, accessibilité ou design system par sa proximité avec une capture
approuvée.

## Justification

Cette décision conserve la mémoire utile sans exposer le générateur à une
autorité ambiguë. Elle applique le principe fail-closed déjà utilisé pour les
contrats métier : une capacité non déclarée reste absente, même si elle est
visible dans une archive.

Elle évite aussi de demander à un LLM de résoudre un conflit silencieux entre
pixels historiques, contrats actuels et normes d'accessibilité. Le dépôt fournit
lui-même la classification et les interdictions.

## Conséquences

### Positives

- les six images validées restent disponibles et vérifiables ;
- aucune archive ne peut alimenter le work order actif ;
- les limites des anciennes maquettes sont documentées au même endroit ;
- une future référence doit être plus petite, conditionnelle et testable.

### Négatives / dette acceptée

- les références actives existantes utilisent encore le schéma
  `presentation-evidence` 1.0 et ses états historiques ;
- la prochaine publication de vue de données exige une évolution préalable du
  schéma actif pour porter applicabilité, portée et inférences interdites ;
- les intentions archivées ne disposent plus d'une baseline visuelle active.

### Points à réévaluer

- première nouvelle référence de vue de données ;
- ajout d'une source Figma ou d'une annotation par région ;
- besoin de migrer d'autres anciennes références vers `historical` ;
- promotion d'une capacité de vue après un second cas indépendant.

## Références

- [ADR-0066 — preuve de présentation bornée](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0078 — vues de données par capacités optionnelles](./0078-vues-de-donnees-par-capacites-optionnelles.md)
- [Autorité C5 ADAPT-11c](../architecture/c5-adapt11c-autorite-accessibilite-mise-en-page-2026-10-02.md)
- [Angular Material — Table](https://material.angular.dev/components/table/overview)
- [WAI-ARIA APG — Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [WAI-ARIA APG — Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [SAP Fiori — Table Toolbar](https://www.sap.com/design-system/fiori-design-web/v1-145/ui-elements/table-bar)
