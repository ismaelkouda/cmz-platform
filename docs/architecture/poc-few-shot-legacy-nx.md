# POC few-shot legacy → Nx — résultat avant tout investissement GPU

- **Date :** 2026-08-11
- **Contexte :** suite à ADR-0023 (titularité du legacy levée), avant
  d'engager le chantier N-2/N-3/N-5 (extension du corpus + fine-tuning),
  validation à coût nul de l'hypothèse : « un modèle peut-il, à partir de
  quelques exemples legacy → Nx déjà vérifiés, traduire correctement un
  nouveau fichier du même module qu'il n'a jamais vu ? »

## Méthode prévue

1. Choisir un module 100 % vérifié du corpus (`requests`, chaîne
   `requests.queues.list`, 18 paires vérifiées, aucune modification du
   legacy depuis le pin `legacy.lock.json` sur cette chaîne — confirmé par
   `git diff cb15bf80..HEAD -- src/presentation/pages/requests` = vide).
2. Montrer à un modèle 2 exemples complets (`queues-props.interface.ts` →
   `queues-requests.props.ts`, `queues.entity.ts` →
   `queues-requests.entity.ts`).
3. Lui demander de traduire un 3ᵉ fichier de la même chaîne
   (`queues-filter.entity.ts`) sans lui montrer la cible.
4. Comparer au résultat réel déjà vérifié dans le corpus
   (`queues-requests-filter.entity.ts`), puis faire passer par l'Oracle.

## Résultat — le test n'a même pas eu besoin d'un modèle pour trancher

En préparant les exemples et la cible à masquer, la lecture directe des
trois fichiers a suffi à révéler le problème que ce POC devait précisément
détecter — avant toute dépense de calcul.

### Ce que montrent les 2 exemples (few-shot)

- `queues-props.interface.ts` → `queues-requests.props.ts` : renommage +
  passage des enums en imports partagés (`@shared/domain/enums/*` →
  `@cmz/shared-domain`). Traduction mécanique, un modèle la devinerait
  probablement sans peine.
- `queues.entity.ts` → `queues-requests.entity.ts` : même schéma, **mais**
  la version Nx a **supprimé** deux membres présents dans le legacy
  (`actionsRef`, `operatorsStyle(operator)`) — déplacés ailleurs dans
  l'architecture cible (probablement la couche UI). Rien dans le fichier
  legacy seul n'indique où ils sont censés aller, ni qu'ils doivent
  disparaître d'ici.

### Ce que devait produire la 3ᵉ traduction (cachée), et pourquoi elle est hors de portée d'un few-shot naïf

Le fichier legacy `queues-filter.entity.ts` porte un objet `DatePeriod`
opaque (`{ start, end }`, construit via `DatePeriod.create`, qui valide
juste que `start <= end`). Le fichier cible réel, déjà vérifié dans le
corpus (`queues-requests-filter.entity.ts` + son contrat
`queues-requests-filter.contract.ts`), fait trois choses qu'aucun des deux
exemples few-shot ne préfigure :

1. Éclate `DatePeriod` en deux champs plats `startDate`/`endDate` — un
   changement de représentation qu'on pourrait éventuellement deviner par
   analogie avec d'autres modules déjà vus.
2. Transforme une **classe** avec constructeur positionnel
   (`constructor(phone?, uniqId?, ...)`) en une **fonction pure**
   (`queuesRequestsFilterEntity(contract)`) — rupture de style par rapport
   aux deux exemples montrés, qui étaient tous les deux des classes.
3. Applique une **règle métier absente du legacy** :
   `resolveOpenEndedEndDate` — « si une date de début est fournie sans date
   de fin, traiter la période comme ouverte jusqu'à aujourd'hui ». Cette
   règle n'existe **nulle part** dans `DatePeriod.create` ni dans aucun
   fichier legacy de la chaîne. Le commentaire du spec Nx lui-même la
   date : *« Chantier L (onzième passe, 2026-08-04) — règle métier
   partagée [...] Jamais testé »* — confirmation directe qu'elle a été
   ajoutée par une décision humaine, après plusieurs passes de revue, pas
   déduite mécaniquement du code source legacy.

## Conclusion

Le point 3 est celui qui tranche. Un modèle, même très compétent en
génération de code, ne peut pas déduire une règle métier qui n'est écrite
nulle part dans les données qu'on lui montrerait — ni dans le legacy, ni
dans les deux exemples few-shot choisis ici. Ce n'est pas une limite du
prompt ou du choix des exemples : c'est une limite de nature, la même que
celle décrite en anticipation dans la réponse donnée avant ce POC (risque
de mémorisation plutôt que généralisation, sur un corpus d'une seule
application).

**Ce POC n'a donc pas eu besoin d'invoquer un modèle pour produire une
preuve exploitable** : la simple lecture comparée de 3 fichiers déjà
vérifiés dans le corpus existant suffit à démontrer que la traduction
legacy → Nx de ce projet n'est pas, au moins dans ce cas, une transformation
mécanique apprenable par l'exemple seul — elle encode des décisions de
conception prises pendant les revues humaines successives du projet
(« onzième passe »), qui ne sont pas présentes dans les données d'entrée.

## Conséquence pour le chantier N (ADR-0019, Option B)

- Ceci ne veut pas dire que l'Option B (étendre le corpus, fine-tuner un
  modèle) est sans valeur — un modèle peut très bien apprendre la partie
  mécanique (renommage, passage aux imports partagés, changement de
  représentation classe → fonction pure une fois qu'il l'a vu plusieurs
  fois) et rester un bon **assistant de suggestion** (première ambition
  proposée, plus réaliste).
- Mais l'ambition retenue au départ de cette conversation — **génération
  autonome validée par l'Oracle, sans intervention humaine** — est
  directement mise en doute par ce cas concret : si une partie non
  négligeable des traductions du corpus encode des règles métier ajoutées
  après coup et absentes du legacy, aucun volume de données legacy → Nx ne
  suffira à les couvrir toutes sans une supervision humaine sur les cas
  nouveaux.
- Recommandation avant d'engager le chantier N-2/N-3/N-5 (effort XL) : un
  humain devrait échantillonner un nombre plus large de paires déjà
  `verified` du corpus (pas seulement cette chaîne) et compter combien
  d'entre elles encodent une règle absente du legacy, comme celle trouvée
  ici. Ce chiffre donnerait une estimation concrète du taux de cas qu'un
  modèle raterait structurellement, quel que soit le volume de
  fine-tuning — avant de dépenser l'effort XL de N-5 sur cette base.

## Références

- `corpus/requests.pairs.jsonl` — chaîne `requests.queues.list`, paires
  `list-item-props`, `list-item-entity`, `filter-entity`.
- `libs/shared/domain/src/lib/utils/resolve-open-ended-end-date.util.ts` et
  son spec (commentaire « Chantier L, onzième passe »).
- [ADR-0019](../adr/0019-nature-du-corpus-seos.md) — nature du corpus,
  Option B.
- [ADR-0023](../adr/0023-titularite-des-droits-sur-le-legacy.md) —
  titularité qui a rendu ce test possible.
