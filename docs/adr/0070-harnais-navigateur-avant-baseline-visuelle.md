# ADR-0070 — Prouver le rendu navigateur avant de figer une baseline visuelle

- **Statut :** accepté
- **Date :** 2026-09-26
- **Décision :** exécuter la page C5 dans un navigateur hermétique et publier
  ses rendus comme candidats avant toute comparaison pixel bloquante

## Contexte

La PR #116 a réalisé la page `/settings-security/users` depuis le work order
approuvé. Les quatre images qui ont guidé cette réalisation sont cependant
déclarées `source_kind: wireframe`. Elles expriment une intention de
présentation, pas les pixels produits par un navigateur, une police et un moteur
de rendu déterminés.

Les tests Angular prouvent les comportements et l'accessibilité du composant,
mais ils remplaçaient la composition et ne démarraient pas l'application
complète. Un audit navigateur a ainsi trouvé une frontière incomplète dans le
shell généré : le token d'accès exigeait un provider, sans offrir de point
d'entrée déterministe au host. La route échouait correctement fermée dans une
vraie navigation, mais aucun host ne pouvait l'ouvrir sans modifier un fichier
généré.

Comparer immédiatement le rendu à des wireframes au pixel près aurait produit un
oracle trompeur et coûteux à maintenir. À l'inverse, prendre une capture sans
assertions fonctionnelles aurait pu figer un écran vide ou incomplet.

## Décision

### 1. Un point d'entrée hôte explicite et fermé

Le shell Angular généré lit un unique contexte injecté avant le bootstrap :
`window.__cmzAppAccessContext`. Il est accepté seulement si sa forme contient
exactement `authenticated: true` et un tableau de permissions valides. Une
valeur absente, mal formée, enrichie d'une clé inconnue ou non authentifiée
refuse l'accès et toutes les permissions.

Cette adaptation est produite par le renderer du shell, testée puis attestée
dans son manifeste ; C5 ne modifie donc plus `app.config.ts` hors publication.
Le contexte n'est pas une autorité de sécurité et ne contient aucun secret. Le
backend reste responsable de l'autorisation. La configuration runtime publique
nécessaire au scénario est injectée séparément par le harnais avant le bootstrap
et n'accorde aucun droit.

### 2. Un backend navigateur hermétique

Playwright intercepte uniquement `/api/**` et reconnaît exactement :

- le GET paginé des utilisateurs ;
- le GET des profils ;
- le POST de création.

Les réponses utilisent des données synthétiques et la forme wire déjà prouvée.
Tout autre appel API est bloqué. Le conflit email est servi en HTTP 200 avec
`{ error: true, message }`, conformément au décodeur observé, sans inventer un
statut ni un code backend.

### 3. Des rendus reproductibles, mais encore candidats

Les quatre scénarios `ready` et `create-failed` sont exécutés en desktop 1440 ×
1024 et mobile 390 × 844. Le navigateur fixe la locale, le fuseau, le thème, la
densité, les animations et les service workers ; il attend le vrai état Angular
et les polices avant la capture.

Chaque scénario contient aussi des assertions fonctionnelles : cinq lignes ou
cartes, projection responsive, permission de création, dimensions du panneau,
conservation de la liste, du formulaire et de l'erreur email.

Les PNG produits sont des **candidats de rendu**. Ils ne remplacent pas les
wireframes approuvés et ne deviennent pas automatiquement une baseline.

### 4. Un coût CI borné

Le harnais réutilise Playwright et le job E2E existants. Il ne tourne que si
l'application C5 ou son serveur statique partagé est affecté. Les quatre PNG
sont alors publiés sept jours comme artefact de revue. Aucun framework ou
runtime parallèle ni aucune dépendance n'est ajouté.

Le serveur statique partagé sélectionne l'application par une allowlist fermée ;
une valeur inconnue est refusée. Le smoke login historique conserve son
comportement par défaut.

## Preuves

- route réelle démarrée depuis le build Angular, et non composant isolé ;
- point d'entrée hôte générique testé sur les formes absentes, invalides et
  autorisées, puis reproduit octet par octet par le shell ;
- quatre scénarios Playwright verts avec Chrome local et Chromium CI verrouillé
  ;
- deux exécutions CI indépendantes du même rendu : PNG mobiles identiques octet
  par octet ; écarts desktop limités à 6 et 5 pixels sur 1 474 560, avec un
  delta maximal d'un niveau de couleur ;
- compilation Angular stricte, build production, lint et 23 tests unitaires
  verts ;
- upload CI obligatoire lorsque la preuve C5 est exécutée ;
- appels API inconnus bloqués et données uniquement synthétiques.

## Constats de revue visuelle

Le premier rendu réel révèle des écarts qui ne doivent pas être masqués :

- rôles backend affichés sans libellé de présentation ;
- numéro de page desktop comprimé ;
- toast desktop superposé au panneau ;
- hiérarchie et disposition de l'erreur différentes du wireframe ;
- nouvelle soumission désactivée après le conflit tant que l'email n'est pas
  modifié, alors que le wireframe montre l'action active ;
- titre du formulaire mobile renvoyé sur deux lignes ;
- ordre et disposition des actions mobiles différents ;
- densité mobile différente.

Ces constats ne sont pas corrigés dans ce lot : les cinq fichiers réalisés sont
gouvernés par le work order de la PR #116. Leur modification exige un nouveau
lot de réalisation traçable, relu séparément.

## Conséquences

- une CI verte prouve désormais que l'application complète est réellement
  navigable avec un host explicite ;
- les captures ne peuvent pas être confondues avec une validation visuelle
  humaine ;
- C5g-8b devra faire relire les rendus, corriger les écarts acceptés sous un
  nouveau work order, puis figer des snapshots produits par le même Chromium ;
- la comparaison pixel ne deviendra bloquante qu'après cette approbation ; son
  budget absolu minimal sera calibré sur plusieurs exécutions du même commit,
  sans utiliser le hash du PNG ni une tolérance proportionnelle arbitraire.

## Alternatives rejetées

- **comparer directement aux wireframes :** leurs pixels ne sont pas une sortie
  navigateur normative ;
- **auto-approuver les premières captures :** cela confond production et revue
  de la preuve ;
- **capturer sans assertions :** une page vide pourrait devenir une baseline ;
- **exécuter les captures sur chaque PR :** coût permanent sans fermeture de
  dépendances ;
- **corriger l'UI dans le même lot :** contournerait la frontière du work order
  et rendrait la revue du harnais ambiguë.

## Références

- [ADR-0066](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0067](./0067-lier-plan-execution-a-realisation-page.md)
- [ADR-0069](./0069-autorisation-fine-action-dans-composition-page.md)
- [Dossier C5](../architecture/c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
