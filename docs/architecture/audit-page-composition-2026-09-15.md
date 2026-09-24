# Audit Staff de la composition de page N×`list-query` + N×`action-request` — 2026-09-15

## Statut et décision

- **Référence auditée :** `origin/main` à
  `7331455bdd486bc01eb1d31e6ac5f5d256486b67`.
- **Périmètre :** `application-design`, contrats backend, rôle `screen`,
  registre de compositions, shell Angular/PWA, work order de page, vérificateur,
  fixtures, corpus SEOS, sécurité d'exécution, versionnement et responsabilités.
- **Décision :** la plateforme sait transporter la **description** de plusieurs
  loads, actions et data bindings jusqu'à un work order borné. Elle ne sait pas
  encore compiler, raccorder ni vérifier leur **exécution composée**. La
  capacité PLAT-9 reste donc expérimentale et l'issue #64 ne peut pas être
  fermée.
- **Décision d'architecture :** ne pas créer une composition source nommée
  `list-action`, `multi-request` ou équivalent. Le troisième élément est un
  **plan d'exécution de page** qui référence N instances versionnées des deux
  primitives ; la multiplicité et l'orchestration ne sont pas une troisième
  capacité métier.
- **Décision produit :** ne pas commencer la reproduction de SEOS avant la
  fermeture des blockers P0/P1 et une preuve HTTP réellement exécutée. SEOS
  reste le corpus de caractérisation, jamais une source de branches métier dans
  le moteur.

Les acquis ne sont pas minimisés : conception target-neutral, snapshots
hashés, validation de références backend, publication atomique du shell, work
order content-addressed, inventaire Git anti-écriture latérale, sélection
d'archétype fail-closed et vrais oracles Angular sur la fixture mono-action.
L'audit sépare ces garanties réelles de la claim plus large « N requêtes + N
commandes fonctionnent ensemble dans une page ».

### Avancement sans réécriture de l'audit — 2026-09-24

Le lot C1 est fermé : `list-query` v2 et `action-request` v2 sont compilés,
prouvés sur Angular et React puis publiés durablement avec les mêmes primitives
transactionnelles.

Le premier incrément C2 compile désormais un `page-execution-plan` 1.0 depuis
le contrat de page et les modèles v2 content-addressed. La preuve contient deux
queries, dont une paramétrée, une commande, des états locaux indépendants, des
bindings vers un `producer_node_id` et une négociation de capacités
fail-closed. Les ambiguïtés par opération et l'invalidation ciblée encore
inexprimable dans `application-design` 1.0 sont refusées. ADR-0058 consigne la
décision.

Ce progrès ne change pas encore le verdict d'exécution N×N : aucun composition
root n'est généré et aucun oracle n'observe encore les deux GET et le POST dans
un même host. Les constats et critères ci-dessous restent la baseline de
contrôle pour C3 et C4.

### Avancement C3 — 2026-09-24

Le composition root Angular est désormais généré et publié avant toute UI.
Chaque nœud du plan possède son propre répertoire et sa propre identité DI ; les
sources et façades proviennent directement des renderers v2 existants. Un
service de page et une liste de providers explicite sont les seuls fichiers de
composition. Les contrats de page et de primitives sont relus par URI +
SHA-256, les bindings host sont fermés et la négociation de capacités repose
sur une allowlist Angular indépendante. ADR-0059 consigne la décision.

Le verdict d'exécution reste volontairement ouvert : C3 prouve compilation et
publication transactionnelle, pas l'émission conjointe des appels. C4 doit
encore observer deux GET et un POST dans un host hermétique externe.

## Méthode et niveaux de preuve

Les constats utilisent les mêmes niveaux que les deux audits précédents :

1. **observé** — lecture directe d'une source, d'un schéma ou d'un contrat ;
2. **reproduit** — test, mutant ou exécution contrôlée ayant produit le résultat ;
3. **dérivé** — conséquence nécessaire des contrats et chemins d'exécution lus ;
4. **conditionnel** — impact dépendant d'une configuration ou d'un futur usage.

La baseline ciblée donne 31/31 tests verts. Le pipeline applicatif complet
passe réellement `ngc`, build, lint et test, mais sa page a zéro `load`, zéro
`data_binding` et n'exécute aucune commande distante. Inversement, la fixture
multi-nœuds contient un GET et un POST, mais son composant est vide et ses
quatre oracles sont mockés. Cette différence est le fait central de l'audit.

## Résumé des blockers

| Priorité | Constat | Niveau | Conséquence |
| --- | --- | --- | --- |
| P0 | le test produit par la réalisation est exécuté avec tout `process.env` | observé | code généré non fiable capable de lire secrets CI/Nx et fichiers accessibles |
| P0 | aucun chemin `application-design` → générateurs → providers → page n'existe | observé | aucune composition runtime réelle malgré la description multi-nœuds |
| P0 | `list-query` et `action-request` ont chacun des blockers de production | reproduit | leur assemblage ne peut pas élever leur niveau de maturité |
| P1 | le modèle global d'état ne représente pas N états indépendants | observé | chargement, erreur et succès d'un nœud écrasent ou ambiguïsent les autres |
| P1 | un data binding référence une opération, pas une instance de load/action | reproduit | deux appels de la même opération avec des entrées différentes sont indiscernables |
| P1 | l'oracle multi-nœuds prouve des IDs et des chaînes, pas des comportements | reproduit | faux positif : composant vide et test trivial acceptés |
| P1 | absence de concurrence, cancellation, retry et invalidation inter-nœuds | observé | courses, requêtes obsolètes et replays de commandes non spécifiés |
| P1 | sources de paramètres et compatibilité contrôle/backend peu validées | reproduit | configurations invalides acceptées à la conception |

## 1. Traçabilité et chaîne réellement exécutable

| Frontière | Ce qui existe | Ce qui est réellement prouvé |
| --- | --- | --- |
| backend contract → application design | `operation_ref` hashée et validée | opérations et champs référencés existent |
| application design → page contract | objet page complet embarqué | IDs, accès, états, loads/actions/bindings transportés |
| page contract → rôle `screen` | listes triées d'IDs | complétude structurelle du payload |
| rôle → archétype | `screen` sélectionne toujours `component` | sélection fermée, pas une stratégie de composition |
| work order → page | cinq fichiers UI autorisés | mappings `data-cmz-id`, inventaire, compilation éventuelle |
| design → primitives générées | absent | aucun `list-query`/`action-request` sélectionné ou généré |
| primitives → providers du host | absent | aucune base URL, policy auth/cache/erreur ni port raccordé |
| providers → page | absent | aucune façade ou machine d'état consommée par la page |
| page → backend mock/réel | absent dans la preuve | aucun GET/POST observé de bout en bout |

Le registre connaît séparément `list-query` et `action-request`, mais ni
`application-shell-publication.mjs`, ni le renderer de shell, ni
`page-realization.mjs` ne le consultent. Le rôle `screen` ne porte que des IDs.
La règle de sélection Angular `always → component` ne choisit et n'instancie
aucun contrôleur de query ou de commande.

Le work order autorise exactement :

```text
page.component.html
page.component.scss
page.component.spec.ts
page.component.ts
realization-evidence.json
```

Il protège utilement le reste du workspace, mais ne peut donc pas combler les
couches domain/data/application et leurs providers manquants. Ces artefacts
doivent être planifiés et publiés **avant** la réalisation UI.

La fixture réelle `application-conception-proof` ne branche pas davantage
`action-request` : `PageComponent.submit()` normalise une chaîne et émet
`noteSubmitted`. Son test vérifie l'événement, pas une requête HTTP. Elle prouve
la frontière de page et les oracles Angular, pas l'action backend déclarée.

## 2. Couverture quantitative du corpus SEOS

Un inventaire AST des 98 composants `libs/*/ui/**/features/*.component.ts`,
avec expansion d'un niveau des façades injectées dans les stores locaux, donne
l'estimation suivante :

| Façades réseau effectives par composant | Composants |
| --- | ---: |
| 0 | 17 |
| 1 | 55 |
| 2 | 15 |
| 3 | 10 |
| 4 | 1 |
| **total** | **98** |

81 composants utilisent au moins une façade ; 26 d'entre eux en utilisent au
moins deux, soit environ **32 % des composants réseau**. La composition
multi-nœuds est donc un besoin fréquent, pas un cas marginal.

Échantillons représentatifs :

- `mobile-network-form` : quatre façades — entité, find-one, groupes de sites
  et types de tour ;
- `participants-form` : entité, find-one et sélection d'équipes ;
- `teams-form` : entité, find-one et permissions ;
- `users-form` : entité, find-one et sélection de profils/permissions ;
- `news-form` : entité, find-one et catégories ;
- `participants-list` : liste principale et sélection d'équipes ;
- formulaire d'action processing : commande principale et lecture des types.

Cette mesure démontre la nécessité de N nœuds. Elle ne prouve pas que chaque
façade corresponde telle quelle à la future primitive : certaines agrègent
plusieurs appels, du cache local ou des règles historiques. La reproduction
devra partir de scénarios et de contrats backend, pas copier les noms ni la
structure SEOS.

## 3. Modèle canonique, identité et état

### Identité de nœud insuffisante

Un `data_binding` référence seulement :

```text
contract_id + operation_id + response_status + model_id + field_names
```

Il ne référence pas le `load.id` ou l'`action.id` qui produit la donnée. Un
mutant avec deux loads de la même opération, chacun lié à une constante
différente, et un seul data binding vers l'opération a été accepté sans erreur.
Le renderer ne pourrait pas déterminer quelle instance alimente la vue.

Le contrat cible doit référencer `producer_node_id` puis un sélecteur de sortie
typé. L'opération backend reste l'autorité transport ; l'instance de nœud reste
l'autorité d'exécution.

### Une machine d'état globale ne compose pas N machines indépendantes

La page possède un seul `initial_state_id` et un catalogue global de states.
Chaque load et action pointe vers ces mêmes states. Cela ne représente pas :

- query A prête pendant que query B charge ;
- query A échouée mais query B exploitable ;
- action C pending sans masquer les deux listes ;
- retry d'un seul nœud ;
- agrégats `all-ready`, `any-error`, `blocking-error` ou dégradation partielle.

Chaque nœud doit posséder sa machine d'état portable. La page expose un view
model agrégé par une policy déclarative ; elle ne remplace pas N états par une
énumération plate combinatoire.

### Validations manquantes reproduites

| Mutant accepté par le validateur | Défaut |
| --- | --- |
| deux loads distincts vers la même opération + binding sans node ID | producteur ambigu |
| `field_names: ["headline", "headline"]` | projection dupliquée |
| `visible_in_state_ids: ["ready", "ready"]` | référence dupliquée |
| source `session: invented.super-admin-secret` | catalogue source inexistant |
| contrôle `photo` lié à un champ backend `string` | compatibilité de type non vérifiée |
| action backend liée à une opération GET | classification query/command non imposée |

Le validateur de load impose bien GET/HEAD, mais le validateur d'action ne
refuse aucune méthode de lecture. Les bindings valident leur cible backend,
pas l'existence et le type de leur source `route/session/constant/device`.

### Dépendances et invalidation

ADR-0045 borne volontairement le périmètre aux nœuds indépendants. Même dans
ce périmètre, deux relations minimales sont nécessaires :

1. un binding d'affichage dépend de la sortie d'un nœud précis ;
2. une commande réussie invalide ou recharge une ou plusieurs queries précises.

Une dépendance de données pour construire l'input d'une commande, une séquence
conditionnelle ou un callback asynchrone relève bien du graphe typé ADR-0031 et
peut rester hors du premier lot. L'invalidation post-commande ne peut en
revanche pas être laissée à une extension UI : elle conditionne la cohérence
des données.

## 4. Runtime, orchestration et intégration host

Le shell Angular ne génère aujourd'hui que `provideHttpClient()` et les
providers route/i18n. Il n'installe ni primitives générées, ni base URLs, ni
adaptateurs de ports, ni politique partagée auth/cache/erreurs. Or les audits
unitaires ont déjà établi :

- `list-query` utilise ses propres tokens public/cache, distincts de ceux du
  host ;
- `action-request` utilise son propre token public, distinct de `SKIP_AUTH` ;
- le contrat d'état et les ports divergent entre Angular et React ;
- inputs/outputs ne sont pas validés/décodés de façon obligatoire ;
- les commandes n'ont ni idempotence ni état de commit partiel.

Assembler deux composants défectueux n'annule aucun défaut. Le composition
root doit recevoir un plan généré contenant au minimum :

- instances de queries et commandes, versions et artefacts exacts ;
- services/base URLs et policy de requête du host ;
- scope des instances : application, route ou composant ;
- paramètres d'entrée et sources typées ;
- cache key, fraîcheur, déduplication, cancellation et retry des queries ;
- concurrence, idempotence et commit state des commandes ;
- invalidations command → query ;
- projection de chaque état de nœud vers le view model de page.

### Sémantique minimale des nœuds indépendants

- Les loads indépendants démarrent selon une policy explicite, avec limite de
  concurrence et annulation à la destruction/navigation.
- Une erreur non bloquante reste locale au nœud ; la page peut afficher les
  autres données prêtes.
- Retry cible un nœud et ne rejoue jamais une commande voisine.
- Une query identique est dédupliquée par identité canonique et paramètres ;
  deux instances paramétrées différemment restent distinctes.
- Une commande réussie n'invalide que les queries déclarées.
- L'état de commande distingue échec avant commit et échec local après commit.

Ces règles appartiennent au contrôleur d'application portable, pas au template
Angular ni à un futur hook React.

## 5. Oracle, falsifiabilité et qualité des preuves

### Ce que la suite verte prouve réellement

Les 31 tests ciblés prouvent :

- validation générale de l'application design ;
- présence de `load_ids`/`data_binding_ids` dans le rôle `screen` ;
- rejet d'un data binding dont aucune opération n'est déclenchée ;
- rejet d'un mapping d'evidence manquant ;
- intégrité content-addressed du work order et de l'inventaire Git ;
- sélection d'archétype fermée ;
- appel des quatre commandes d'oracle dans le test multi-nœuds.

Ils ne prouvent pas l'exécution d'une composition. Dans le test mixte :

- le GET retourne un objet `overview`, pas une liste ; `list-query` n'est donc
  même pas exercé structurellement ;
- `PageComponent` est vide ;
- le HTML rend simultanément un `<div>` par ID, y compris tous les states ;
- le spec vérifie uniquement que la classe existe ;
- la dépendance `run` est remplacée par une fonction qui enregistre quatre
  appels, sans lancer `ngc`, build, lint ou test.

### Oracle de mapping trop faible

`validateEvidence` exige un sélecteur textuel exact puis cherche une sous-chaîne
`data-cmz-id="…"` dans la concaténation des fichiers TS/HTML. Il ne prouve ni
unicité réelle dans le DOM, ni visibilité par état, ni accessibilité, ni
chargement, ni action, ni valeur affichée. Une occurrence dans un commentaire
ou une chaîne morte peut satisfaire cette recherche.

Le spec de page fait partie des cinq fichiers réalisés. L'auteur de
l'implémentation écrit donc également le test qui prétend la valider. Les
oracles compile/build/lint restent indépendants ; l'oracle comportemental ne
l'est pas.

### Preuve exigée

Le test d'acceptation doit être possédé par le générateur et non modifiable par
la réalisation. Il doit démarrer un transport mock hermétique, instancier le
composition root réel et observer au minimum :

1. deux GET paramétrés indépendants et un POST réellement émis ;
2. payloads, URL, headers et politiques public/auth/cache exacts ;
3. réponses décodées puis rendues dans les bons bindings ;
4. une query échouée pendant qu'une autre reste utilisable ;
5. retry local sans rejouer la commande ;
6. commande réussie invalidant uniquement la query déclarée ;
7. double-submit/idempotency et succès distant/échec local ;
8. destruction/navigation annulant les reads en cours ;
9. `ngc` strict, build production, lint, tests et a11y verts ;
10. mêmes scénarios contractuels sur chaque cible promue.

## 6. Sécurité et threat model

### Exécution de code réalisé avec les secrets du processus — P0

`verifyPageRealization` exécute le target `test` de l'application après avoir
copié l'intégralité de `process.env`, y compris un éventuel
`NX_CLOUD_ACCESS_TOKEN`. Or `page.component.spec.ts` est un fichier autorisé et
réalisé par le même acteur non fiable que la page. La borne d'écriture vérifie
les hashes **avant** l'exécution, mais n'isole ni lecture filesystem, ni
processus enfants, ni réseau pendant les tests.

Un code généré malveillant ou compromis peut donc, selon les capacités du
runner, lire l'environnement et les fichiers accessibles puis tenter une
exfiltration. Le risque est directement observable dans le design ; son
exploitation réseau dépend du sandbox CI et est donc conditionnelle.

Traitement obligatoire avant toute exécution automatique de code réalisé :

- environnement allowlisté, sans secrets GitHub/Nx/cloud ;
- credentials courts et job sans permission d'écriture sur le dépôt ;
- réseau désactivé sauf mock loopback explicitement contrôlé ;
- filesystem en lecture minimale et écriture dans un répertoire jetable ;
- interdiction ou sandbox de processus enfants ;
- oracle comportemental externe, possédé par le générateur ;
- aucune utilisation de cache distant avec du code non encore approuvé.

### Filtre réseau incomplet

La recherche actuelle interdit cinq motifs : `HttpClient`, `XMLHttpRequest`,
`fetch(`, `axios` et `http(s)://`, uniquement dans TS/HTML. Elle ne constitue
pas une sandbox et ne couvre notamment pas :

- imports Node réseau/process/filesystem ou appels obfusqués ;
- `WebSocket`, `EventSource`, `navigator.sendBeacon` ;
- formulaires/action HTML, URLs protocol-relative et ressources SCSS ;
- import direct de la couche data, pourtant interdit par le contrat
  d'archétype ; `contract.forbid` est transporté mais pas exécuté par le
  vérificateur.

Les regex restent utiles comme diagnostic ergonomique. Elles ne doivent jamais
être présentées comme une frontière de sécurité.

### Autres menaces de composition

| Menace | Gravité | Traitement |
| --- | --- | --- |
| credential public envoyé par une primitive | haute | policy de requête unique au host, allowlist d'origine |
| cache partageant des données entre identités | critique | namespace tenant/user/auth + purge session |
| course entre réponses de queries | haute | génération/abort et politique latest/merge explicite |
| commande doublée par retry ou double clic | critique | idempotency key + concurrence déclarée |
| invalidation trop large | haute | IDs canoniques + test des seules queries touchées |
| écran partiellement obsolète | haute | état de fraîcheur par nœud visible |
| permission frontend prise comme autorité | haute | autorisation backend obligatoire |
| erreurs ou données sensibles journalisées | haute | classification/redaction communes |

## 7. Versionnement et migration

`application-design` et les evidences restent en `1.0.0`. Le rôle `screen` est
passé à `1.1.0` avec deux champs requis. La politique locale de
`archetype-role-model.md` qualifie explicitement cet ajout d'additif et autorise
un MINOR lorsque producteur, consommateur, validateur et tests sont livrés
atomiquement. Dans ce cadre interne et fermé, il ne faut pas le déclarer à tort
comme violation de la politique adoptée.

La limite subsiste : le schéma n'accepte que `1.1.0` et aucun lecteur/migrateur
`1.0.0` n'existe. Le rôle est donc sûr comme projection éphémère recalculée,
mais pas comme artefact durable échangeable. Toute décision de persister ou
d'exposer ces nœuds impose une politique multi-version et des fixtures de
replay.

Le futur plan de page introduit une nouvelle autorité contractuelle. Décision
recommandée :

1. ne pas surcharger silencieusement `application-design` 1.0 ;
2. définir un `page-execution-plan` 1.0 dérivé, content-addressed, qui référence
   les versions exactes des primitives et du backend contract ;
3. conserver `application-design` comme intention produit et le plan comme
   résultat compilé, jamais comme troisième source de vérité ;
4. introduire `list-query` 2.0 et `action-request` 2.0 avant leur composition ;
5. fournir les migrateurs v1 → v2, fixtures avant/après, idempotence et refus
   explicites pour les décisions non déductibles ;
6. versionner séparément schema, planner, renderer et runtime host ;
7. refuser fail-closed toute capacité du plan non supportée par une cible.

Une modification future rendant obligatoire une sémantique d'état, de retry ou
d'invalidation est comportementale et cassante : elle suit une version majeure
du contrat concerné, même si le JSON peut être rendu syntaxiquement compatible.

## 8. Responsabilités architecturales cibles

### `backend-contract`

Autorité des services, opérations, paramètres, media types, sécurité, modèles
wire, réponses et erreurs. Aucune primitive ne redéclare ces faits.

### Primitives `list-query` et `action-request`

Contrats réutilisables indépendants, liés à une opération backend. Ils portent
seulement les décisions applicatives propres à une query ou une commande :
cache/concurrence pour la première ; idempotence/commit/invalidation pour la
seconde. Ils exposent des ports, états et erreurs target-neutral.

### `page-execution-plan`

Artefact compilé contenant :

- `query_nodes[]` et `command_nodes[]` avec ID d'instance stable ;
- référence primitive/version/hash et `operation_ref` vérifiée ;
- bindings d'input typés et bindings d'output vers un `producer_node_id` ;
- lifecycle, scope, concurrence, cancellation et retry ;
- invalidations command → query ;
- agrégation d'état vers le view model ;
- exigences de capacités pour négociation fail-closed avec la cible.

Il ne contient ni nom SEOS, ni code Angular/React, ni branche sur un nom de
pattern.

### Planner et publication

Le planner résout tous les artefacts domain/data/application, leurs owners et
leurs hashes, puis les publie transactionnellement. Il installe le composition
root et les providers du host avant d'ouvrir le work order UI.

### Runtime host

Unifie auth, origine, cache, erreurs, télémétrie, session/tenant, cancellation
et redaction. Les adaptateurs Angular/React traduisent ce contrat sans modifier
sa sémantique.

### Présentation

Consomme un port/view model de page typé. Elle rend les états locaux et agrégés,
déclenche commandes/retry et respecte a11y/i18n. Elle ne connaît ni endpoint,
DTO, cache key, idempotency key ni client HTTP.

### Oracle et sécurité d'exécution

Les tests contractuels appartiennent au générateur. Le code réalisé est testé
dans un environnement hermétique et sans secrets. L'implémentation ne peut ni
modifier l'oracle ni se déclarer elle-même conforme via une evidence textuelle.

## Ordre de construction recommandé

| Lot | Travail | Sortie exigée |
| --- | --- | --- |
| C0 | durcir l'exécution de `page-realization` | env allowlistée, test externe, sandbox/no-network prouvés par mutants |
| C1 | livrer `list-query` 2.0 puis `action-request` 2.0 | blockers de leurs audits fermés, migrateurs et hosts réels |
| C2 | schéma + validateur + planner `page-execution-plan` 1.0 | identités de nœud, états locaux, bindings, invalidations, négociation de capacités |
| C3 | générer et publier libs/providers avant le work order | composition root compilable, aucune écriture UI hors cinq fichiers |
| C4 | fixture hermétique N×N à oracle indépendant | vrais GET/POST, erreurs partielles, retry, cancellation, invalidation et idempotence |
| C5 | reproduire un vertical slice SEOS représentatif | parité comportementale mesurée sans vocabulaire SEOS dans le moteur |
| C6 | promouvoir la capacité | revue humaine, matrice de maturité, CI complète et issue #64 fermable |

C0 peut être développé en parallèle conceptuel de C1, mais aucun code réalisé
non approuvé ne doit être exécuté avec des secrets en attendant. C2 ne doit pas
inventer les contrats runtime que C1 n'a pas stabilisés.

## Critères de sortie non négociables

La composition N×N ne peut être considérée production-ready que si :

1. tous les critères de sortie des audits `list-query` et `action-request` sont
   satisfaits ou explicitement exclus par un contrat fail-closed ;
2. chaque data binding référence une instance productrice non ambiguë ;
3. sources et cibles de tous les bindings sont résolues et type-compatibles ;
4. query et command sont classifiées par sémantique/méthode valide ;
5. chaque nœud a un état local, et l'agrégation de page est déclarative ;
6. concurrence, cancellation, retry et destruction sont testés ;
7. une commande invalide exactement les queries déclarées ;
8. idempotence et succès distant/échec local sont observables ;
9. les artefacts et providers sont générés avant la page et raccordés au vrai
   host ;
10. l'oracle externe observe au moins deux GET et un POST réels sur mock
    hermétique ;
11. une panne partielle conserve les nœuds sains utilisables ;
12. code réalisé et tests s'exécutent sans secrets, sans réseau externe et avec
    des permissions minimales ;
13. les interdictions de couches sont mécaniques, pas seulement dans le prompt ;
14. compile stricte, build production, lint, unit, intégration, a11y et
    acceptance sont verts sans oracle mocké ;
15. la même sémantique contractuelle est prouvée sur chaque cible promue ;
16. un écran SEOS représentatif est reproduit depuis les contrats génériques,
    sans branche ni vocabulaire SEOS dans le core ;
17. migrations, replay, create/retire et régénération sans perte sont prouvés ;
18. l'issue #64 est relue humainement avant promotion et fermeture.

## Vérifications exécutées

```text
suite ciblée application-design/page/role/multi-node : 31/31 tests verts
mutants role screen                                : 2/2 tués
check:application-pipeline                         : vert
oracles réels de ce pipeline                       : ngc/build/lint/test
loads/data_bindings dans cette preuve réelle       : 0/0
appels backend dans cette preuve réelle            : 0
oracles de la fixture multi-nœuds                   : 4 appels mockés
composants features SEOS inventoriés                : 98
composants réseau estimés                           : 81
composants réseau avec au moins 2 façades           : 26 (~32 %)
mutants application-design supplémentaires          : acceptations reproduites
workspace après probes temporaires                  : propre
```

Les avertissements Nx sur les sockets du sandbox ont déclenché son fallback en
processus principal ; la commande a terminé avec code 0 et les oracles ont été
exécutés. Ils ne changent pas le périmètre mono-action de la fixture.

## Conclusion Staff

Le dépôt possède une excellente enveloppe de conception et de publication,
mais il confond encore **transport de métadonnées multi-nœuds** et **composition
exécutable multi-nœuds**. Le prochain chantier ne doit pas embellir le test
actuel ni ajouter des IDs : il doit fermer la chaîne runtime, donner une
identité et un état à chaque nœud, externaliser l'oracle et sécuriser
l'exécution du code réalisé.

L'ordre rationnel reste : stabiliser les deux primitives, compiler un plan de
page target-neutral, générer le composition root, puis seulement reproduire un
vertical slice SEOS comme preuve. Toute promotion antérieure serait une claim
non soutenue par l'Oracle.
