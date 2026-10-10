# ADR-0098 — Lier la guidance de layout au work order v5 par commit Git

- **Statut :** Accepted
- **Date :** 2026-10-10
- **Décideurs :** propriétaire du produit et équipe plateforme CMZ

## Contexte

ADR-0083 distingue la preuve d'une page, un exemple générique de mise en page et
une archive. Le pipeline de réalisation v4 sait déjà lier le contrat de page,
une preuve de présentation et un plan d'exécution, mais il ne consomme pas les
exemples génériques retenus pour une page. Une autorisation JSON locale avait
été envisagée pour C5 ; elle pouvait être écrite et rehachée par l'agent qu'elle
prétendait autoriser. Elle prouvait l'intégrité de ses propres octets, ni une
approbation humaine ni leur antériorité à la réalisation.

Le mécanisme doit rester utilisable par Angular et React, conserver les work
orders v4 existants, ne pas introduire une seconde allowlist ou un second moteur
d'oracles et ne jamais exécuter le contenu d'une référence visuelle.

## Options envisagées

### Option A — Autorisation locale séparée

- avantage : aucun changement du work order ;
- rejet : autorité auto-déclarative, règles et commandes dupliquées, omission
  possible par le pipeline principal.

### Option B — Commit Git documenté, contrôle manuel uniquement

- avantage : provenance et chronologie lisibles ;
- rejet : le work order pourrait toujours omettre la liaison et revendiquer une
  réalisation complète.

### Option C — Commit Git immuable et guidance résolue dans le work order

- avantage : une enveloppe d'exécution unique, content-addressed et rejouable ;
- coût : version v5, lecteur Git borné, resolver et mutations négatives.

## Décision

**Option C.** Un work order avec `--layout-binding` est un document `5.0.0`.
Sans cette option, le pipeline reste strictement v4 : aucun champ nul ou SHA v5
n'est ajouté et son identité historique reste inchangée.

### Autorité et base

La préparation v5 exige ensemble :

- `layout_binding` ;
- `authority_commit_sha` ;
- `base_commit_sha`.

Dans cette première version, les deux commits doivent être égaux et correspondre
exactement à `HEAD`. Le worktree et l'index doivent être propres. Cette
restriction empêche de sélectionner silencieusement une autorité plus ancienne
sans registre ni attestation capables d'en justifier la validité.

Le resolver lit le binding, le contrat de page, les contrats backend, les
manifestes, les sources reproductibles et les images directement depuis les
blobs de ce commit. Il n'effectue ni checkout, ni fetch, ni appel réseau. Les
commandes Git sont appelées avec des arguments séparés, sans shell.

La lecture Git est hermétique : les replace refs et le lazy-fetch sont
désactivés, les configurations globale et système ainsi que les variables Git de
redirection sont neutralisées, et la locale est fixée. Un même SHA désigne donc
les objets originaux présents localement ou échoue fermé ; il ne provoque pas de
téléchargement implicite.

À la vérification, la base doit être ancêtre du `HEAD` candidat. Tout chemin
modifié depuis la base doit appartenir à l'allowlist unique du work order. Le
binding et ses dépendances sont relus depuis le commit enregistré, résolus à
nouveau et comparés au `layout_guidance` complet.

L'antériorité est établie en parcourant les parents des objets commit bruts lus
par `git cat-file commit`, sans revision walker. Les replace refs et les grafts
locaux ne peuvent donc pas inventer une parenté. Le parcours détecte les cycles
et refuse plus de 100 000 objets afin de rester borné.

Avant la publication du work order, chaque chemin autorisé doit encore être
identique au blob de la base ou réellement absent du disque s'il n'existe pas
dans la base. Les exclusions locales, `assume-unchanged`, `skip-worktree` et la
détection de renommage ne peuvent pas masquer une réalisation commencée trop
tôt.

### Identité v5

L'identifiant v5 hache un domaine explicite, les champs historiques du v4, les
deux SHA Git et la guidance normalisée. La guidance contient notamment :

- identité et hash du binding et du contrat de page ;
- capacités déclarées ou absentes et leur autorité contractuelle ;
- régions applicables, états et omissions explicites ;
- chemins, modes Git, tailles, types et SHA-256 de toute la fermeture de sources
  lue.

Les collections canoniques sont triées par ordre binaire des points de code,
jamais par collation dépendante de la locale. Le binding ne porte aucun statut
`approved` : Git établit l'identité du contenu et GitHub reste l'autorité de la
revue humaine.

Une image reste une donnée non fiable avec autorité `layout-guidance-only`. Elle
ne peut créer ni endpoint, permission, état, action, dépendance ou choix de
composant. Aucune commande provenant d'un manifeste n'est exécutée.

### Liens symboliques

Une source d'autorité en mode Git `120000` est toujours refusée. Le reste du
dépôt peut contenir un symlink déjà suivi : il reste une entrée protégée du
baseline. Le pipeline hache le blob qui contient le texte de sa cible et son
mode, sans suivre ni lire cette cible. Une modification invalide le work order.

Cette distinction est nécessaire parce que `main` contient déjà
`.claude/skills/angular-developer`. Elle conserve la protection v4 tout en
resserrant les sources d'autorité.

### Ce que Git ne prouve pas

Un SHA prouve l'identité d'un commit local et de ses objets. Il ne prouve pas
que GitHub a exigé une revue humaine ni que la branche était protégée. La PR
d'autorité doit donc être fusionnée séparément avant de préparer le work order ;
la revue GitHub reste la preuve humaine. La validation visuelle du résultat est
une seconde décision, postérieure à la réalisation, et n'entre pas dans le hash.

## Conséquences

### Positives

- aucune autorisation locale parallèle ou auto-déclarative ;
- même guidance pour Angular et React, renderers toujours séparés ;
- omission, substitution locale, dérive committée, symlink d'autorité et
  modification hors allowlist échouent avant les oracles ;
- baseline v5 indépendante des permissions de fichiers propres à l'OS grâce aux
  modes de l'arbre Git ;
- les work orders v4 restent vérifiables et gardent leurs identifiants.

### Négatives / dette acceptée

- la préparation v5 nécessite un commit propre ;
- autorité et base ne peuvent pas encore être deux commits distincts ;
- le vocabulaire de capacités de layout reste volontairement fermé et ne sera
  élargi qu'avec un cas réel ;
- l'approbation humaine demeure une propriété de GitHub, pas d'un champ JSON.

### Points à réévaluer

Autoriser `authority_commit_sha` comme ancêtre distinct seulement lorsqu'un
second cas réel exige de conserver une autorité ancienne et qu'une règle
protégée peut démontrer sa validité. Abandonner l'extension si elle nécessite un
registre global, un receipt, un service distant ou une exception C5 dans le
cœur.

## Références

- [ADR-0039 — Frontière conception / réalisation LLM](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0066 — Preuve de présentation bornée](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0083 — Page, exemple de layout et archive](./0083-preuve-page-exemple-mise-en-page-et-archive.md)
- [ADR-0088 — Réalisation ciblée par profil](./0088-realisation-page-ciblee-par-profil.md)
- [Git `cat-file`](https://git-scm.com/docs/git-cat-file)
- [Git `ls-tree`](https://git-scm.com/docs/git-ls-tree)
- [GitHub — About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
