# Famille `dto` — index

Un DTO n'a jamais de comportement (pas de classe, pas de décorateur, pas de
logique). L'**observation du source** a montré qu'un `*.dto.ts` recouvre en
réalité **trois formes distinctes** ; conformément à la granularité SEOS (une
forme = un archétype), la famille est **scindée** en trois contrats :

| Archétype       | Forme                                          | Contrat                                                    |
| --------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `dto-interface` | forme d'objet (`interface`)                    | [`dto-interface.contract.md`](./dto-interface.contract.md) |
| `dto-enum`      | ensemble fermé de valeurs string de l'API      | [`dto-enum.contract.md`](./dto-enum.contract.md)           |
| `dto-const`     | table figée de primitives (`const … as const`) | [`dto-const.contract.md`](./dto-const.contract.md)         |

Le choix de l'archétype se fait sur **la forme de la donnée**, pas sur le nom du
fichier (tous restent `*.dto.ts`). Le pont vers le domaine appartient toujours
au `mapper`.
