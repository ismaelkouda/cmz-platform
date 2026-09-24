# ADR-0057 — `action-request` v2 réutilise la publication transactionnelle

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

Les cibles `action-request` v2 matérialisent et exécutent déjà six artefacts
Angular et six artefacts React depuis un même modèle d'exécution. Elles
restaient cependant limitées à des sorties temporaires d'oracle : aucun chemin
utilisateur ne leur donnait manifests d'ownership, dry-run, verrou, rollback et
reprise après interruption.

Le générateur v1 et `list-query` v2 possèdent déjà ce protocole. Ajouter une
commande, un publisher ou un journal propres à `action-request` v2 créerait un
second chemin de récupération et contredirait la revue de simplicité. Faire
passer la v2 pour le modèle sémantique v1 rendrait en revanche son identité et
son plan mensongers.

## Décision

L'unique commande `generate:action-request` sélectionne le pipeline depuis le
`schema_version` fermé de la définition. La v1 conserve exactement ses sorties
plates et en couches. La v2 accepte seulement `angular`, `reactjs` et `all`, car
aucune sortie v2 en couches n'a été conçue ni prouvée.

La commande lit une seule fois les octets de définition v2, compile un seul
modèle et matérialise les deux cibles depuis le même plan. Le control plane
publie :

- `artifact-plan.json` ;
- `action-request-execution-model.json`.

Il ne fabrique ni `semantic-model.json` ni `evidence-model.json` v1. Les
manifests Angular et React référencent le même SHA-256 du vrai modèle
d'exécution. La sortie passe sans exception par `createGenerationOutput`,
`inspectGenerationChangeSet` et `applyGenerationChangeSet`.

Une création exige un chemin absent. Une évolution exige le `change_set_id`
exact produit par `--dry-run`. Le contrat d'activation reste celui d'ADR-0035 :
filesystem local APFS/ext4 supporté, verrou exclusif, journal synchronisé,
rollback et reprise ; les consommateurs restent hors ligne jusqu'au succès de la
commande.

## Preuve

Le test d'intégration publie réellement `forgot-password` sur Angular et React,
puis vérifie :

1. les deux fichiers du control plane et l'absence des faux modèles v1 ;
2. l'égalité des hashes d'entrée des deux manifests ;
3. un second dry-run entièrement stable avec 14 artefacts inchangés ;
4. un changement documentaire du domaine qui ne réécrit aucun source généré ;
5. un dry-run sans mutation, puis l'application de ses deux remplacements de
   contrôle avec l'identifiant exact ;
6. le refus d'`all-layered` et d'une version de schéma inconnue avant création
   de la sortie.

Les suites v1 plates et en couches restent vertes. Les suites historiques du
publisher couvrent toujours concurrence, dérive, journal, `SIGKILL`, rollback et
reprise sur les primitives exactes réutilisées ici.

## Revue de simplification obligatoire

L'incrément ajoute **67 lignes nettes de production** dans deux modules
existants. La surface directe `action-request` v2 passe de **2 792 à 2 859
lignes de production**. Un fichier de test d'intégration est ajouté hors de
cette mesure.

Aucun module exécutable, schéma, CLI, renderer, runtime, journal, verrou ou
cache supplémentaire n'est créé. La petite adaptation du lecteur de cible évite
une seconde lecture des octets de définition et une divergence entre détection
de version et compilation. Aucune abstraction générique nouvelle n'est ajoutée
entre les commandes `list-query` et `action-request` : leur ressemblance ne
justifie pas encore un framework de commandes supplémentaire.

## Conséquences

### Positives

- `action-request` v2 possède enfin un chemin utilisateur durable et
  récupérable.
- V1 et v2 gardent une seule commande sans confondre leurs modèles.
- Angular et React sont publiés depuis la même entrée content-addressed.
- Les mécanismes difficiles de concurrence et de reprise restent uniques.

### Limites

- La publication produit des sources plates, pas des packages Nx autonomes.
- Seule la forme active `forgot-password` reste acceptée par les renderers.
- Le host React réel et le serveur live ne sont toujours pas prouvés.
- La capacité reste `experimental` tant que le vertical slice composé N×N ne
  consomme pas les publications `list-query` et `action-request` v2.

## Prochain incrément

Commencer le `page-execution-plan` target-neutral et son composition root à
partir des deux primitives v2 désormais compilées, exécutées et publiées. Aucun
troisième générateur métier ne doit être créé.

## Références

- [ADR-0035](./0035-contrat-durabilite-publication-generation.md)
- [ADR-0052](./0052-list-query-v2-reutilise-la-publication-transactionnelle.md)
- [ADR-0056](./0056-action-request-v2-react-utilise-un-port-hote.md)
- [Audit de composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
