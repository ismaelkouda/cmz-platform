# ADR-0101 — Première application réelle et priorité produit

- **Statut :** Accepted
- **Date :** 2026-10-22
- **Décideur produit :** Ismael, propriétaire de `cmz-platform`
- **Supersède pour la désignation de la première application réelle (§4) :** [ADR-0094](./0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)

## Contexte

L'atelier construit des applications métier internes, avec des contrats et des
preuves propres à chaque cible. ADR-0094 conserve cette mission, les cibles
Angular et React et le remplacement progressif du legacy.

La désignation de la première application réelle dans son §4 ne correspond
plus à la priorité exprimée par le propriétaire le 2026-10-22 :

> nous avons crée un dossier dans un but, donc on la suite …/cmz/seos

Chemin local abrégé ; la parole exacte reste dans la boîte du chantier.

La racine décidée est extérieure au dépôt de l'atelier. Le corpus historique,
les applications de preuve et le produit à y construire sont des périmètres
distincts ; les compteurs de reconstruction ne mesurent pas son avancement.

## Options envisagées

- Conserver l'ancienne première application : cela garderait un parcours de
  découverte déjà documenté, mais contredirait la priorité actuelle du
  propriétaire.
- Appliquer sa décision du 22/10 : poursuivre le produit à la racine désignée,
  en conservant les principes de l'atelier et le brief précédent en découverte.

Ce relevé explicite les conséquences documentaires du choix déjà fait ; il ne
soumet pas un nouvel arbitrage produit.

## Décision

La **recréation de SEOS** est la première application réelle et la priorité
produit de l'atelier. Le dossier `seos`, voisin de l'atelier dans l'espace de
travail du propriétaire, est la racine décidée. Cette décision ne constate ni
sa création effective, ni la publication d'un dépôt, ni la livraison d'une page.

Cet ADR supersède uniquement la désignation de la première application réelle
dans le §4 d'ADR-0094 et la priorité qui en découle. Ses principes d'atelier
interne, de cibles Angular/React, de tranches verticales et de remplacement
progressif restent applicables. Le brief du signalement de zone non couverte
reste en découverte : aucun abandon ni retrait de ce produit n'est décidé.

Ismael fournit la structure exacte des réponses de l'API et les captures
nécessaires. Les données, règles, rôles, permissions et libellés manquants lui
sont demandés. Ces entrées ne prescrivent pas de recopier les bibliothèques,
l'apparence ou les défauts du legacy : la réalisation suit la pile native et
les exigences de preuve de l'atelier. Une capture ne vaut pas contrat backend.

Le parcours produit est : capture d'API locale assainie et contrat backend,
puis espace applicatif créé par la sortie externe de l'atelier, dépôt public
avec configuration générée, puis premières pages par tranches verticales.
Chaque étape garde son propre contrat et ses preuves. Ismael lance lui-même
toute commande qui touche le dossier ou le dépôt du produit.

## Justification

La parole actuelle du propriétaire prime la désignation antérieure. Un nouvel
ADR conserve la trace de cette décision sans réécrire un ADR accepté. L'atelier
reste réutilisable ; son prochain résultat concret est le produit désigné ici.

## Conséquences

### Positives

- Les autorités et la feuille de route renvoient à cette décision pour la
  première application, et à ADR-0094 pour les principes conservés.
- Le parcours produit prime les abstractions sans besoin observé. La clôture
  des preuves de composition et l'archivage du corpus restent des travaux
  séparés, sans suppression d'une preuve encore unique.
- Les métriques historiques restent disponibles et ne deviennent pas des
  indicateurs de livraison du produit extérieur.

### Négatives / dette acceptée

- Ce réalignement ne fournit aucun fait métier absent, endpoint, authentification,
  page, déploiement ou preuve d'intégration réelle.
- La configuration GitHub de production doit provenir de la baseline codifiée
  de l'atelier, générée pour le produit, avec GitHub gratuit d'abord. Sa
  livraison relève du chantier GITHUB-BASELINE ; aucun réglage n'est copié
  manuellement pour contourner cette dépendance.
- Aucune nouvelle exception n'est introduite. Une exception ultérieure exige
  une expiration native ou une justification dérivée vérifiée par un contrôle.

### Points à réévaluer

Une nouvelle décision explicite du propriétaire sur la première application
exigera un nouvel ADR et la mise à jour des renvois courants. Les données et les
critères d'acceptation de chaque tranche restent à confirmer dans ses contrats.

## Références

- [Autorité produit](../../PROJECT_AUTHORITY.md)
- [Feuille de route courante](../architecture/feuille-de-route.md)
- [ADR-0094 — principes conservés et désignation partiellement supersédée](./0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)
- [Brief de découverte conservé](../projects/signalement-zone-non-couverte/project-brief.md)
- [Guide de construction d'application](../../LLM_APP_BUILDER.md)
