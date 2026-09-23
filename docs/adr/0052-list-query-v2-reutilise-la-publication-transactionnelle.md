# ADR-0052 — `list-query` v2 réutilise la publication transactionnelle

- **Statut :** Accepted
- **Date :** 2026-09-23

## Contexte

Les renderers `list-query` v2 produisent déjà cinq fichiers Angular et six
fichiers React déterministes, compilés et exécutés par leurs oracles natifs.
Ces fichiers restent toutefois éphémères : aucune commande ne les publie avec
ownership, manifests, dry-run, verrou, rollback et reprise après interruption.

La plateforme possède déjà ce protocole pour les générateurs v1. En créer un
second pour v2 contredirait le budget SIMPL-7 et multiplierait les chemins de
reprise. À l'inverse, faire passer v2 pour un modèle sémantique v1 rendrait les
hashes et le plan d'artefacts mensongers. Enfin, la sortie Angular v2 importe
les vrais ports `@cmz/core`, `@cmz/shared-domain` et
`@cmz/shared-application`; le type-check isolé historique ne résolvait pas les
alias officiels du workspace.

## Options envisagées

### Option A — Ajouter une commande et un publisher propres à v2

- Avantage : aucune adaptation du chemin v1.
- Inconvénients : second verrou, second journal, seconde reprise et nouveau
  contrat opératoire à maintenir.

### Option B — Convertir artificiellement v2 vers les IR et plans v1

- Avantage : aucune extension des contrats de publication.
- Inconvénients : perte de la vraie identité de l'entrée, responsabilités
  fictives et risque de divergence silencieuse.

### Option C — Adapter v2 au publisher générique existant

- Avantages : un seul protocole durable et une seule commande utilisateur ;
  manifests fondés sur le vrai modèle d'exécution.
- Inconvénient : le plan d'artefacts et le type-checker communs doivent
  reconnaître explicitement les responsabilités et ports déjà prouvés par v2.

## Décision

L'option C est retenue. L'unique commande `generate:list-query` détecte les
schémas auteur `1.0.0` et `2.0.0`. Pour v2, elle compile une seule fois la
définition et son backend content-addressed, matérialise le même plan neutre
sur Angular et React, puis appelle sans exception le publisher existant.

Le plan v2 contient cinq responsabilités : modèle domaine, décodeur de
réponse, client d'intégration, contrôleur d'exécution et API publique. Le
control plane persiste seulement `artifact-plan.json` et
`list-query-execution-model.json`. Chaque target conserve les identités de
profil existantes `angular-nx` et `react-typescript`, ainsi que son manifest de
fichiers et ses hashes.

Le type-checker de publication résout les alias déclarés par le
`tsconfig.base.json` du workspace. Il ne crée aucun alias de test et continue
de refuser un import `@cmz/*` inconnu. La cible `angular-layered`, propre à la
v1 gelée, est refusée explicitement pour une définition v2.

La publication reste soumise au contrat `offline-activation` d'ADR-0035 : même
système de fichiers local APFS/ext4, verrou exclusif, journal, rollback et
reprise. Une création sur un chemin absent peut être directe ; toute évolution
d'une sortie existante exige le `change_set_id` obtenu par `--dry-run`.

## Preuve

Le test d'intégration v2 :

1. valide le plan par son JSON Schema et l'égalité de ses hashes Angular/React ;
2. publie réellement les deux arbres, leurs manifests et le control plane ;
3. vérifie qu'un second dry-run donne 13 artefacts `unchanged` ;
4. prépare une évolution vers un autre cas réel sans modifier la sortie ;
5. applique exactement le change-set relu et vérifie suppression/création ;
6. refuse `angular-layered` avant toute écriture ;
7. prouve qu'un alias host déclaré compile et qu'un alias inconnu échoue.

Les suites historiques de change-set, publication, concurrence, `SIGKILL`,
reprise et rollback restent vertes ; v2 n'introduit aucun embranchement dans
ces primitives.

## Revue de simplification obligatoire

L'incrément ajoute **210 lignes nettes de production contractuelle** sur sept
fichiers existants, sans nouveau module exécutable, schéma,
journal, lock, renderer ou runtime. La surface v2 cumulée du même périmètre
passe de **2 649 à 2 859 lignes**. Un fichier de test d'intégration est ajouté,
mais il ne fait pas partie de la surface de production.

La croissance reste au-dessus du budget SIMPL et n'autorise donc aucune
nouvelle généralisation. Elle est acceptée car elle connecte une sortie déjà
existante à des primitives déjà durcies, ferme une absence de chemin utilisateur
et retire toute nécessité d'un publisher v2 parallèle.

## Conséquences

### Positives

- Les sorties v2 deviennent inspectables, content-addressed et récupérables.
- V1 et v2 partagent la même commande et le même protocole opératoire.
- Le dry-run reste sans écriture et l'évolution exige une approbation exacte.
- Les dépendances au host Angular sont vérifiées contre le workspace réel.

### Négatives / dette acceptée

- La sortie publiée matérialise exactement les sources déjà prouvées ; elle
  n'est pas encore un package Nx autonome avec `project.json` ou `package.json`.
- Le profil Angular dépend du workspace CMZ pour ses trois ports host.
- `list-query` v2 reste `experimental` tant qu'une page composée N×N ne
  consomme pas cette sortie.

### Points à réévaluer

- Définir l'installation dans un composition root au moment du vertical slice
  N `list-query` + N `action-request`, sans déplacer cette responsabilité dans
  le renderer métier.
- Réévaluer un package autonome seulement si un consommateur hors workspace
  réel l'exige.

## Références

- [ADR-0035](./0035-contrat-durabilite-publication-generation.md)
- [ADR-0051](./0051-list-query-v2-react-utilise-un-port-hote-explicite.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
