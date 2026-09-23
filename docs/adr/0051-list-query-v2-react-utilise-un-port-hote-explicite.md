# ADR-0051 — `list-query` v2 React utilise un port hôte explicite

- **Statut :** Accepted
- **Date :** 2026-09-23

## Contexte

ADR-0050 a stabilisé sur Angular les deux cas actifs de `list-query` v2 :
`site-group-select` et `tasks-actions-processing-type`. La prochaine étape
imposait de décider si leur sémantique était réellement portable vers React,
sans copier le runtime Angular ni créer un runtime universel propriétaire.

Le dépôt possède un host Angular avec `HttpClient`, tokens d'URL et
intercepteurs d'authentification, d'erreur et de cache. Il ne possède pas
d'application React équivalente ni de chaîne d'intercepteurs React à réutiliser.
Prétendre raccorder le renderer à un tel host aurait donc inventé une
intégration absente.

La cible doit néanmoins préserver exactement les décisions du modèle neutre :
service destinataire, URL, méthode GET, politique d'authentification et de
cache, refresh, annulation, latest-wins, conservation des données obsolètes,
décodage strict et mapping wire → read model.

## Options envisagées

### Option A — Reporter React jusqu'à l'existence d'une application host

- Avantage : aucune interface hôte à décider maintenant.
- Inconvénient : la neutralité du modèle resterait une affirmation non testée
  et la composition N×N démarrerait sur une seule cible prouvée.

### Option B — Copier le runtime Angular ou introduire un cache/client partagé

- Avantage : comportement transport immédiatement fourni par la plateforme.
- Inconvénients : dépendance artificielle à Angular ou nouveau runtime privé,
  double autorité pour auth/cache/erreurs et coût de maintenance contraire à
  SIMPL-7.

### Option C — Générer un client et un hook derrière un port host explicite

- Avantages : code React standard, frontière testable, aucune connaissance des
  jetons, du cache ou de la configuration du host dans le renderer.
- Inconvénient : le composition root d'une future application React devra
  fournir l'URL de base et implémenter le port conformément à la politique.

## Décision

L'option C est retenue. Le renderer produit six fichiers TypeScript ordinaires :
modèles, erreurs, décodeur, client, hooks et barrel. Le client transmet au port
hôte une requête fermée contenant `serviceId`, URL, méthode, politique
auth/cache, marqueur de refresh et `AbortSignal`. Il n'ajoute aucun header,
token, cache, retry ou stockage.

Le hook généré utilise les hooks React réels derrière une interface minimale
injectée à la factory. Il implémente les six états du contrat, l'annulation au
remplacement et au démontage, l'ordre latest-wins, le reload avec bypass demandé
au host et la conservation de la dernière valeur en rechargement ou en erreur.

Les modèles, le décodeur, la construction du path et les validations fermées
sont extraits du renderer Angular dans un module partagé seulement maintenant
qu'ils ont deux consommateurs prouvés. Les cycles de vie Angular et React
restent dans leurs renderers respectifs. Les deux sorties passent par le
canonicaliseur Prettier existant avant compilation et publication afin que le
code généré soit directement relisible, sans étape manuelle de nettoyage.

Les erreurs React générées restent autonomes. La première implémentation
importait `@cmz/shared-domain`; l'oracle natif React a refusé ce package absent
du profil cible. Ajouter un alias de test aurait masqué une dépendance de
production. Deux petites erreurs TypeScript sans framework sont donc générées
avec la cible en attendant qu'un véritable package partagé multi-stack soit
justifié.

## Preuve

Le même modèle compilé alimente Angular et React. L'oracle React natif compile
la sortie puis monte les hooks sous React 19 avec React Testing Library. Sur les
trois définitions de preuve — privée, publique et paramétrée — il vérifie :

1. mapping DTO wire → read model et décodage strict ;
2. service, URL, auth, cache, refresh et signal transmis au port hôte ;
3. absence de Bearer pour une query publique ;
4. path encodé, entrée vide refusée avant le port et enum vérifiée item par item ;
5. états `idle/loading/reloading/success/empty/error` ;
6. données conservées pendant reload et après erreur ;
7. erreur métier typée et statut HTTP non réussi sans décodage du corps ;
8. refus d'un reload avant le premier load ;
9. annulation latest-wins, réponse tardive ignorée et annulation au démontage.

La suite React compte 37 tests natifs verts ; la suite Angular reste à 37 tests
verts après l'extraction commune. Les tests textuels imposent en plus la sortie
déterministe et les mêmes refus fail-closed sur les deux renderers.

## Revue de simplification obligatoire

Sur le même périmètre que l'ADR-0050, la surface v2 cumulée passe de **2 231 à
2 649 lignes de production**, soit **+418 lignes nettes**. Le renderer Angular
passe de 600 à 189 lignes ; 474 lignes communes sont extraites, le renderer
React ajoute 333 lignes et le calcul de cible ajoute 22 lignes. Le harnais et
les tests React ne sont pas comptés dans la surface de production.

La croissance est acceptée après revue parce que :

- 411 lignes quittent le renderer Angular au lieu d'être recopiées dans React ;
- le partage porte uniquement sur des règles target-neutral déjà identiques ;
- aucun schéma, CLI, journal, état persistant, cache ou runtime de données n'est
  ajouté ;
- le code React généré reste lisible et modifiable sans le générateur ;
- le canonicaliseur déjà utilisé par la plateforme garantit cette lisibilité ;
- chaque effet externe passe par un unique port hôte explicite ;
- les capacités voisines non prouvées restent refusées.

La surface compte désormais neuf modules exécutables et un schéma. Elle reste
au-dessus du budget SIMPL : l'incrément suivant doit publier durablement une
sortie existante, pas créer une nouvelle abstraction de génération.

## Conséquences

### Positives

- La neutralité de l'IR est prouvée par deux cycles de vie natifs différents.
- React ne dépend ni d'Angular, ni d'un cache ou client HTTP propriétaire.
- Le host garde l'autorité sur configuration, identité, cache et transport.
- Les règles wire et fail-closed ne peuvent plus diverger silencieusement entre
  Angular et React.

### Négatives / dette acceptée

- Le port React est un contrat exécuté en test, pas encore l'intégration d'une
  application React réelle.
- Les deux classes d'erreur sont générées par cible ; elles pourront rejoindre
  un package partagé seulement avec un second consommateur de production.
- Une définition contient toujours exactement une query.
- Publication durable et page composée N×N restent absentes ; `list-query` v2
  reste donc `experimental`.

### Points à réévaluer

- Prouver le composition root React lorsqu'une application host existe.
- Réévaluer le placement des erreurs si un package domaine réellement
  multi-stack est introduit.
- Ne promouvoir la capacité qu'après publication durable et usage dans une
  page composée.

## Références

- [ADR-0049](./0049-list-query-v2-angular-reutilise-le-runtime-host.md)
- [ADR-0050](./0050-list-query-v2-borne-path-et-tableau-enum.md)
- [Audit Staff `list-query`](../architecture/audit-list-query-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
