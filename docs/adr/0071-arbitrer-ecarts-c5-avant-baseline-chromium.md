# ADR-0071 — Arbitrer les écarts C5 avant la baseline Chromium

- **Statut :** accepté
- **Date :** 2026-09-28
- **Décision :** corriger les écarts de présentation utiles sous un nouveau work
  order, conserver les divergences qui protègent le comportement, puis soumettre
  les nouveaux rendus à une revue humaine avant toute baseline bloquante

## Contexte

La PR #118 a été approuvée sur son commit exact, fusionnée, puis validée par la
CI post-fusion sur `main`. Son harnais Playwright a produit quatre rendus réels
de la page C5 et révélé les écarts consignés par ADR-0070.

Les références approuvées restent des wireframes avec une autorité
`presentation-only`. Elles guident la hiérarchie et la disposition, mais ne
peuvent ni masquer des données chargées, ni affaiblir une validation métier, ni
devenir automatiquement une baseline pixel.

## Décision

### Écarts à corriger

Le lot C5g-8b corrige uniquement les points suivants dans les cinq fichiers de
page autorisés par un nouveau work order :

- présenter les rôles connus avec leurs libellés français et conserver la valeur
  backend inconnue comme repli explicite ;
- rendre les numéros de page desktop utilisables sans compression ;
- placer le toast d'échec hors du panneau desktop ;
- séparer visuellement le titre et le détail de l'erreur ;
- conserver le titre mobile sur une ligne au viewport approuvé ;
- rapprocher la densité des filtres et cartes mobiles de la référence ;
- présenter les actions mobiles dans l'ordre primaire puis secondaire.

Quand l'utilisateur modifie l'email après un conflit, le feedback serveur devenu
périmé disparaît et le formulaire peut de nouveau être soumis. Tant que l'email
n'est pas modifié, l'erreur reste attachée au champ et bloque la soumission.

Les tests navigateur restent comportementaux : ils vérifient les libellés, les
contrôles, la conservation des données et des valeurs, ainsi que les contraintes
de disposition stables. Ils ne codent pas les pixels du wireframe.

### Divergences conservées

- Après un conflit email, `Créer` reste désactivé jusqu'à modification de
  l'adresse. Le formulaire porte une erreur serveur sur ce champ ; autoriser une
  nouvelle soumission identique ne ferait que rejouer un échec connu.
- Les cinq utilisateurs de la page restent rendus sur mobile. Le wireframe n'a
  pas l'autorité pour supprimer trois résultats afin de faire apparaître la
  pagination sans défilement.

La densité peut être améliorée par le style, jamais par la perte de données ou
la modification du contrat paginé.

### Baseline séparée de la correction

C5g-8b publie de nouveaux candidats Chromium, mais ne les auto-approuve pas. Une
PR ultérieure figera les captures seulement après revue humaine. La tolérance
absolue sera calibrée sur plusieurs exécutions du même commit, conformément à
ADR-0070.

## Critères de sortie

- work order C5 régénéré depuis le `main` fusionné et les preuves approuvées ;
- modifications limitées aux fichiers de page autorisés ;
- tests unitaires Angular zoneless couvrant les nouvelles projections ;
- compilation stricte, build production, lint et tests verts ;
- quatre scénarios Playwright verts et nouveaux candidats publiés par la CI ;
- aucune nouvelle dépendance, aucun runtime, transport, cache ou bus global.

## Alternatives rejetées

- **copier le wireframe au pixel près :** il n'est pas une sortie navigateur ;
- **réactiver la soumission d'un email encore invalide :** cela affaiblit le
  feedback serveur sans bénéfice utilisateur ;
- **masquer des résultats mobiles :** cela change le comportement paginé pour
  une raison purement graphique ;
- **figer les captures dans le même lot :** le producteur des images ne doit pas
  devenir leur approbateur implicite.

## Références

- [ADR-0066](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0070](./0070-harnais-navigateur-avant-baseline-visuelle.md)
- [Dossier C5](../architecture/c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
