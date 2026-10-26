# ADR-0102 — Atelier réutilisable et preuves indépendantes des projets

- **Statut :** Accepted
- **Date :** 2026-10-23
- **Décideur produit :** Ismael, propriétaire de `cmz-platform`
- **Supersède pour la priorité du cas sur les capacités de l’atelier (§Décision)
  :** [ADR-0101](./0101-premiere-application-reelle-et-priorite-produit.md)

## Contexte

La demande explicite du propriétaire du 23 octobre 2026 rectifie le pilotage :
SEOS est un exemple quelconque ; la finalité du dépôt est un atelier
réutilisable. La progression de cet exemple, ses faits ou sa connexion ne
peuvent conditionner une capacité générale. Cette décision conserve les
principes d’ADR-0094 et la trace historique d’ADR-0101.

## Décision

L’atelier reçoit les contrats de l’application choisie et produit du code
standard pour une cible explicite. Ni nom, racine, URL, opération, rôle,
permission, enveloppe ni authentification SEOS ne doivent être imposés par le
moteur générique. Les contrôles de propriété physique, de sécurité, de
provenance et de cohérence contractuelle restent requis pour toutes les
applications.

La qualification doit utiliser des entrées indépendantes du corpus SEOS, avec
des différences structurelles qui réfutent une spécialisation cachée. Un simple
renommage ne suffit pas. Un support Angular et React exige des preuves séparées.
Les tests historiques de migration restent utiles pour leur périmètre, sans
constituer à eux seuls la preuve de réutilisabilité.

Une source fournie admissible suit son adaptateur. La capture est une autre voie
d’acquisition, nécessaire seulement à un projet dont les contrats manquent. Les
faits inconnus bloquent la sélection ou l’exécution qui en dépend ; aucune
valeur n’est inventée. Les fixtures sont explicitement fictives et ne deviennent
jamais des observations d’un backend réel.

Au 23 octobre 2026, l’incrément borné retenu est la compilation documentaire
extérieure EXT-03a (#287), avec les garanties d’identité et de publication
existantes. Ses détails techniques et ses preuves relèvent du work order et de
la revue ; son état de livraison est suivi dans la feuille de route courante. La
branche de capture HAR/Redocly garde une utilité distincte, sans en faire un
préalable à cette compilation.

## Portée et conséquences

- ADR-0101 reste Accepted pour son relevé historique et les permissions propres
  à son cas ; sa priorité sur l’avancement des capacités est supersédée.
- Aucun projet antérieur n’est déclaré abandonné, livré ou généralisé.
- Aucune suppression de corpus, baisse de gate ou promotion de maturité n’est
  décidée. Le schéma et les autorités propres aux projets restent stricts.
- Le progrès est mesuré par capacité réutilisable, contrat indépendant du
  projet, preuve réelle par cible, intégration et publiabilité.
- Cette décision ne lève aucun gel de maintenance en vigueur et n’autorise ni
  installation, appel réel, publication ou fusion.

## Références

- [Autorité produit](../../PROJECT_AUTHORITY.md)
- [Feuille de route](../architecture/feuille-de-route.md)
- [Principes conservés](./0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)
- [Raccord extérieur #287](https://github.com/ismaelkouda/cmz-platform/issues/287)
