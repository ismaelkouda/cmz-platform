# ADR-0053 — `action-request` v2 référence le backend et explicite l'exécution

- **Statut :** Accepted
- **Date :** 2026-09-23

## Contexte

`action-request` v1 redéclare dans sa définition la méthode, le chemin,
l'authentification, l'accès, les champs d'entrée et les champs de sortie. Ces
informations peuvent diverger du `backend-contract`. Son exécution laisse aussi
implicites la concurrence, le retry, l'idempotence, l'invalidation de queries et
les effets locaux après un succès distant. L'audit Staff interdit donc de
composer cette v1 avec `list-query` v2.

Le prochain plan N×N dépend de contrats de primitives stabilisés. Commencer ce
plan avant `action-request` v2 l'obligerait à inventer lui-même ces règles et
créerait deux autorités concurrentes.

## Options envisagées

### Option A — Composer directement `action-request` v1

- Avantage : aucun nouveau contrat de primitive.
- Inconvénients : les divergences HTTP/auth/DTO restent possibles et les
  comportements dangereux restent implicites.

### Option B — Ajouter les champs manquants à v1

- Avantage : évolution locale du format existant.
- Inconvénients : changement incompatible sous la même version et maintien de
  deux autorités transport.

### Option C — Introduire une v2 référentielle et un migrateur strict

- Avantages : une seule autorité backend ; décisions d'exécution visibles ;
  migration déterministe et contrôlée.
- Inconvénient : une nouvelle version reste à compiler, rendre et publier avant
  toute composition.

## Décision

L'option C est retenue. `action-request` v2 référence un `backend-contract` par
URI relative normalisée, identité, version et SHA-256. Chaque action sélectionne
une opération et une réponse de succès, mappe les champs du body et du résultat,
puis déclare explicitement concurrence, retry, idempotence, invalidation et
effet post-succès.

La première tranche est volontairement fermée : mutations
`POST|PUT|PATCH|DELETE`, aucun paramètre, un body obligatoire
`application/json`, modèles objet à champs primitifs et réponse avec body. Les
formes non prouvées sont rejetées.

Le migrateur v1 → v2 exige un fichier de décisions. Il vérifie la parité de la
méthode, du chemin, de l'accès, de l'authentification, de l'enveloppe et des
types avec le backend. Il refuse les mappings inconnus, dupliqués ou ambigus,
n'écrase jamais une sortie et est idempotent sur une v2 valide.

## Justification

La référence content-addressed retire de la primitive toute redéclaration du
transport sans déplacer les intentions d'interface et d'exécution vers le
backend. L'idempotence et l'invalidation ne sont pas déduites : un auteur doit
les décider. Un retry manuel ou une exécution parallèle sont refusés sans clé
d'idempotence fournie par le host.

Deux preuves complémentaires bornent le claim : la fixture `support` démontre la
migration versionnée ; `forgot-password` confronte directement la v2 au code
Angular actif, à ses DTO, à son enveloppe et à son accès public `SKIP_AUTH`. Ce
second contrat est explicitement une observation du client implémenté, pas une
preuve serveur `verified-live`.

## Revue de simplification obligatoire

L'incrément ajoute **1 141 lignes de production contractuelle** : un core de 697
lignes, une CLI de 177 lignes et un schéma de 267 lignes. Il dépasse donc le
seuil SIMPL de 1 000 lignes et déclenche cette revue.

La surface est acceptée pour ce premier incrément car elle ferme cinq classes de
divergence et matérialise les décisions de sécurité nécessaires à la future
composition. Elle reste limitée à deux modules exécutables et un schéma. Aucun
renderer, runtime framework, cache, journal, verrou, LLM, transaction de
workspace ou nouvelle commande de génération n'est créé. La CLI reprend le petit
protocole déjà prouvé de `migrate:list-query` et écrit un seul fichier.

La suite ne peut ajouter de nouvelle généralité sur cette base sans preuve
active. Le prochain incrément doit compiler ce contrat vers un modèle neutre et
réutiliser les ports/runtime du host ; il ne doit pas enrichir le schéma.

## Conséquences

### Positives

- HTTP, auth, accès, enveloppe et DTO ont une seule autorité vérifiable.
- Les décisions dangereuses ne dépendent plus de valeurs par défaut cachées.
- Une dérive des sources actives invalide le hash de provenance.
- Le plan N×N pourra référencer une primitive avec des règles d'exécution
  explicites.

### Négatives / dette acceptée

- Cette tranche ne compile, ne rend et n'exécute encore aucune action v2.
- Paramètres, multipart, modèles imbriqués, réponses sans body et plusieurs
  media types sont volontairement refusés.
- L'invalidation `caller-declared` n'a pas encore de cibles : elles
  appartiendront au futur plan de page qui connaît les instances de query.
- Le cas actif prouve le contrat attendu par le client, pas la disponibilité du
  serveur.

### Points à réévaluer

- Ouvrir une forme aujourd'hui refusée seulement avec un second cas réel et un
  oracle hostile.
- Réévaluer les effets post-succès lors du cas actif `login`, où un succès
  distant peut être suivi d'un échec local de session.
- Autoriser la composition seulement après compilation, host Angular, parité
  React et publication durable de `action-request` v2.

## Références

- [Audit `action-request`](../architecture/audit-action-request-2026-09-15.md)
- [Audit de composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
- [ADR-0039](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0047](./0047-list-query-v2-reference-backend-et-migration-explicite.md)
