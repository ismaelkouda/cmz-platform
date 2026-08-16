# ADR-0035 — Contrat de durabilité de la publication générée

- **Statut :** Accepted
- **Date :** 2026-08-16

## Contexte

ADR-0033 impose une publication transactionnelle, mais laissait deux questions
ouvertes : faut-il une vue continuellement atomique pour des lecteurs externes,
et sur quels stockages la reprise après arrêt brutal est-elle supportée ? Sans
réponse bornée, PLAT-5F ne peut être ni fermé honnêtement ni testé de manière
reproductible.

Un échange atomique portable de deux répertoires non vides n'existe pas dans les
API Node utilisées. Ajouter un pointeur atomique imposerait aussi à tous les
consommateurs un protocole de lecture spécifique, alors que les sorties sont des
artefacts de génération hors ligne, pas un datastore servi en continu.

## Décision

### Modèle des lecteurs

La version v1 adopte le modèle `offline-activation` :

- la sortie est inactive pendant la génération ;
- aucun lecteur externe non coopératif ne doit la consommer pendant que la
  commande de publication est en cours ;
- l'orchestrateur appelant active ou remet la sortie aux consommateurs seulement
  après le succès de la commande ;
- les écrivains concurrents restent sérialisés par le verrou de génération.

La visibilité continuellement atomique n'est donc pas une garantie v1. Si un
produit exige ultérieurement des lectures concurrentes sans interruption, il
devra utiliser des releases immuables et un pointeur atomique, avec un contrat
de lecture explicite.

### Modèle de stockage

La publication est supportée uniquement lorsque la sortie, le candidat, le
journal et la sauvegarde résident sur le même système de fichiers local :

- APFS sur macOS (`statfs.type = 26`) ;
- ext4 sur Linux (`statfs.type = 61267`, soit `0xEF53`).

NFS, SMB, les publications cross-filesystem, les sorties symboliques et les
fichiers spéciaux sont refusés. Le runtime détecte le profil avant toute
écriture et échoue fermé s'il n'appartient pas à cette liste.

### Modèle de panne

La garantie couvre :

- l'arrêt brutal du processus éditeur, y compris `SIGKILL` après chacun des deux
  renommages critiques ;
- l'arrêt de l'hôte après le retour réussi des synchronisations de fichiers et
  de répertoires, selon le contrat de durabilité fourni par APFS/ext4 ;
- l'interruption du nettoyage post-publication.

Elle ne couvre pas la perte du média, une violation des garanties du système de
fichiers, ni une mutation externe concurrente de la sortie. Un arrêt électrique
physique n'est pas simulé à chaque CI : la plateforme teste réellement les
primitives sur le système de fichiers du runner, injecte les interruptions à
chaque frontière critique et s'appuie sur le contrat documenté de `fsync` et du
renommage atomique du profil accepté.

## Preuves bloquantes

Le contrat exécutable
`tools/generator-platform/contracts/publication-durability.contract.json`
déclare les profils et les preuves requises. Le gate
`check:publication-durability` :

1. vérifie strictement le contrat et refuse tout champ ou profil ambigu ;
2. compare le système réel au profil attendu par la CI ;
3. exerce une publication complète sur le vrai système de fichiers ;
4. tue réellement les éditeurs après les deux renommages ;
5. vérifie reprise, manifests, hashes, rollback et états contradictoires.

La CI exécute ce gate sur `ubuntu-24.04`/ext4 et `macos-14`/APFS. Une évolution
de runner ou de type de stockage échoue au lieu d'élargir silencieusement la
garantie.

## Conséquences

- PLAT-5F possède désormais un périmètre de support testable et fail-closed.
- Les générateurs restent simples pour le cas hors ligne réellement visé.
- Un consommateur qui lit pendant la publication viole explicitement le contrat
  v1 ; il ne peut invoquer une garantie d'atomicité continue.
- Ajouter Windows, un stockage réseau ou un autre système de fichiers exige un
  profil, une justification et une preuve CI dédiés.
- La première exécution verte de la matrice externe reste nécessaire avant de
  promouvoir la capacité au niveau M3 ; le code local seul ne constitue pas ce
  résultat externe.

## Références

- [ADR-0033](./0033-propriete-artefacts-regeneration-non-destructive.md)
- [`generation-platform-capability-matrix.md`](../architecture/generation-platform-capability-matrix.md)
- [`publication-durability.contract.json`](../../tools/generator-platform/contracts/publication-durability.contract.json)
