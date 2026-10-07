# ADR-0088 — Réalisation de page ciblée par le profil publié

- **Statut :** Accepted
- **Date :** 2026-10-07
- **Décideurs :** équipe plateforme CMZ
- **Supersède partiellement :** [ADR-0067](./0067-lier-plan-execution-a-realisation-page.md), uniquement sur l'exigence d'égalité du chemin du contrat.

## Contexte

`create-app` sait publier les profils `angular-pwa` et `react-spa`, mais le
pipeline `prepare:page-realization` / `verify:page-realization` supposait encore
Angular implicitement : noms de fichiers Angular, archétype Angular et
compilation `ngc`. Modifier directement la page React aurait donc contourné le
work order content-addressed, l'allowlist d'écriture et les quatre oracles
confinés.

L'adaptateur React `page-host.ts` est en outre une frontière de sécurité : il
porte les services et le port de transport autorisés. Sa présence dans le même
dossier que la page ne doit pas autoriser le LLM de présentation à le modifier.

## Décision

Le manifeste d'application publié choisit désormais une cible fermée de
réalisation :

| Profil | Stack d'archétype | Fichiers requis | Compilation |
| --- | --- | --- | --- |
| `angular-pwa` | `angular` | `page.component.{ts,html,scss,spec.ts}` + preuve | `ngc --noEmit` |
| `react-spa` | `reactjs` | `page.tsx`, `page.module.scss`, `page.spec.tsx` + preuve | `tsc --noEmit` |

Le profil, la stack d'archétype, l'allowlist et les commandes d'oracle font
partie du work order v4 et donc de son identité SHA-256. Un profil inconnu est
refusé ; le demandeur ne peut pas choisir une stack différente du manifeste.

Le baseline protégé n'exclut plus tout le dossier de page. Il exclut uniquement
les chemins de `allowed_files`. Un fichier colocalisé existant, notamment
`page-host.ts` ou son test, reste inventorié et lié par hash. Un nouveau fichier
non autorisé ou la modification d'un fichier protégé invalide le work order
avant les oracles. Les noms `page-host*` sont également interdits dans
`--allow-file` pour React.

Chaque stack possède son contrat d'archétype `screen`. Le contrat React impose
les Rules of Hooks, le rendu pur, le HTML sémantique natif, les styles SCSS
Modules/tokens et l'usage exclusif de l'adaptateur host public. Il interdit le
réseau direct, les clients data, les règles métier et les comportements absents
du contrat.

Les quatre oracles restent identiques en intention — compile, build, lint,
test — et s'exécutent dans le même candidat Git-visible confiné, sans secret ni
réseau externe. Seul le compilateur natif dépend du profil.

Le plan d'exécution reste target-neutral et n'est pas dupliqué pour chaque
renderer. Lorsque son contrat source et le contrat du shell cible ont des
chemins différents, la liaison est admise uniquement comme
`published-replica` si toutes les preuves suivantes convergent :

1. les deux chemins suivent la forme publiée
   `apps/<app>/.cmz/pages/<page_id>.json` et portent le même `page_id` ;
2. les bytes des deux contrats ont le SHA-256 référencé par le plan ;
3. les deux manifestes d'application sont valides et désignent exactement la
   même preuve de design et la même expérience ;
4. le plan se recompile à l'identique, en conservant son contrat source ;
5. la liaison source/cible complète est enregistrée dans le work order et
   entre donc dans son identité.

Tout chemin arbitraire, hash différent, manifeste incohérent, design différent
ou recompilation différente reste refusé. Cette règle supersède seulement
l'égalité littérale de chemin décidée par ADR-0067 ; tous ses autres contrôles
restent obligatoires.

## Conséquences

### Positives

- Une page React peut être réalisée sans voie manuelle moins sûre qu'Angular.
- Le profil effectif est relu depuis l'application publiée et entre dans
  l'identité du travail revu.
- La frontière host reste non modifiable par le LLM de présentation, même si
  elle est colocalisée.
- Les contrôles statiques et la preuve `data-cmz-id` restent target-neutral.
- Une composition partagée peut être liée à deux shells publiés sans produire
  deux plans artificiellement spécifiques aux renderers.

### Négatives

- Les work orders v3 doivent être préparés à nouveau : la cible implicite ne
  constitue pas une autorité suffisante pour une nouvelle vérification.
- Les deux stacks conservent des conventions de fichiers et des contrats
  d'archétype distincts ; cette duplication explicite évite une abstraction UI
  cross-framework trompeuse.

## Options écartées

- **Éditer `page.tsx` hors pipeline :** supprime l'autorité du work order et les
  oracles confinés.
- **Faire passer React pour Angular :** produit de faux contrôles (`ngc`) et un
  contrat de composant inapplicable.
- **Exclure tout le dossier du baseline :** autorise implicitement la mutation
  du host et de futurs fichiers sensibles.
- **Déplacer ou généraliser immédiatement tous les hosts :** changement plus
  large sans nécessité ; la protection fichier par fichier ferme déjà le
  risque observé.

## Limite et tranche suivante

Cette décision rend le chemin sûr disponible ; elle ne réalise pas encore la
surface visuelle React et ne revendique aucune parité UI. La tranche suivante
préparera un work order React C5 avec le plan d'exécution et la preuve de
présentation approuvée, puis produira la page par ce seul chemin.

## Références

- [ADR-0034 — Plateforme multi-stack, renderers séparés](./0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md)
- [ADR-0039 — Frontière conception / réalisation LLM](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0066 — Preuve de présentation bornée](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0067 — Lier le plan d'exécution à la réalisation](./0067-lier-plan-execution-a-realisation-page.md)
- [ADR-0086 — Profil React natif minimal](./0086-profil-react-natif-minimal.md)
- [ADR-0087 — Contrat host React](./0087-contrat-host-react-pour-composition-de-page.md)
