# ADR-0023 — Titularité des droits sur le code legacy (`cmz-backoffice-frontend`)

- **Statut :** Accepted
- **Date :** 2026-08-11

## Contexte

ADR-0019 (« Nature du corpus SEOS ») laissait ouverte une question non
tranchée, listée explicitement comme un obstacle à l'Option B (étendre le
corpus pour qu'il porte un vrai jeu d'apprentissage `(legacy, cible)`) :

> Le second [obstacle] est un obstacle qui n'est pas technique du tout [...] :
> personne n'a encore tranché sous quel régime de licence ou de diffusion le
> contenu de l'ancien système (« legacy ») pourrait être inclus dans ce
> corpus.

`docs/architecture/licences-tierces.md` et `LICENSE` pointaient tous les deux
vers le même manque : ils couvrent respectivement les dépendances npm tierces
et le code de `cmz-platform` lui-même, mais renvoient explicitement la
question du **code du legacy** (`cmz-backoffice-frontend`, la source que
`SEOS_LEGACY_ROOT` référence, hébergée sur GitLab privé
`ansut-apps/cmz-backoffice-frontend`) à une décision du « porteur métier/
juridique », non encore prise.

La question factuelle qui manquait : qui détient les droits d'auteur sur ce
code — l'auteur qui l'a écrit, ou l'organisation qui héberge/exploite le
dépôt (ANSUT/CMZ) ?

## Options envisagées

### Option A — Attendre une clarification contractuelle formelle

- Avantages : couvre tout scénario, y compris ceux où plusieurs contributeurs
  ou un contrat de prestation existeraient.
- Inconvénients : bloque indéfiniment toute avancée sur le chantier N
  (Option B d'ADR-0019) sans raison si la situation réelle est en fait
  simple à trancher.

### Option B — Confirmer directement auprès de l'auteur du code

- Avantages : rapide, factuel, suffisant si l'auteur et le porteur du projet
  sont la même personne et qu'aucun tiers (employeur, client sous contrat de
  cession) n'est impliqué.
- Inconvénients : ne couvre pas les cas où un contrat de prestation ou de
  travail aurait pu transférer les droits malgré la paternité du code — à
  vérifier avant de conclure.

## Décision

**Option B, confirmée dans ce cas précis.** L'auteur du projet `cmz-platform`
(porteur du projet dans cette conversation) a confirmé avoir développé
`cmz-backoffice-frontend` (le legacy référencé par `SEOS_LEGACY_ROOT` et
`legacy.lock.json`) à titre de **projet personnel**, en dehors de tout
contrat de travail ou de prestation avec ANSUT/CMZ, et sans cession des
droits à un tiers depuis.

Dans ce cadre — pas de lien d'emploi au moment de la création, pas de
contrat de prestation avec cession de propriété intellectuelle, pas de
cession ultérieure signée — les droits patrimoniaux et moraux sur ce code
reviennent, par défaut légal, à son auteur : le porteur du projet lui-même.

**Conséquence pour ADR-0019 :** l'obstacle juridique identifié pour
l'Option B (étendre le corpus avec du contenu réel) est levé. Le porteur du
projet, étant titulaire des droits sur le legacy, peut décider librement
d'inclure son contenu (ou un hash/extrait) dans le corpus `cmz-platform`,
y compris dans un futur jeu de données destiné à l'apprentissage — sous
réserve des points de vigilance ci-dessous.

## Justification

Le droit d'auteur attribue par défaut la titularité des droits patrimoniaux
au créateur de l'œuvre, sauf disposition contraire (contrat de travail avec
œuvre de commande, contrat de prestation avec clause de cession explicite,
ou cession ultérieure signée). Aucune de ces exceptions ne s'applique au cas
confirmé ici : développement en dehors de tout cadre contractuel avec
ANSUT/CMZ, à titre personnel. Il n'y a donc pas de tiers dont les droits
seraient affectés par une décision du porteur du projet sur ce code.

## Conséquences

### Positives

- Le second obstacle listé par ADR-0019 pour l'Option B (extension du
  corpus avec du contenu réel) est levé — la décision de construire un vrai
  jeu d'apprentissage `(legacy, cible)` redevient une question purement
  technique et budgétaire (effort N-2/N-3/N-5), plus juridique.
- `LICENSE` et `licences-tierces.md` peuvent être mis à jour pour refléter
  cette clarification plutôt que de continuer à renvoyer la question comme
  non tranchée.

### Négatives / dette acceptée

- Cette décision documente une **déclaration** du porteur du projet, pas une
  vérification externe (contrat écrit, dépôt légal, ou avis d'un tiers
  qualifié). Si un doute apparaissait plus tard (ex. contribution d'un tiers
  au legacy non mentionnée ici, code réutilisé depuis un précédent employeur
  sous obligation de confidentialité), cette décision devrait être
  rouverte.
- Ceci ne couvre que le **code source du legacy lui-même**. Le contenu
  métier qui y transite (données de production, éventuel contenu tiers
  embarqué comme des icônes/librairies non-npm) reste hors périmètre de
  cette décision — à vérifier séparément si le corpus venait à inclure de
  telles données.
- Ceci ne tranche pas la question distincte, non résolue par cet ADR, de
  savoir si CMZ/ANSUT (l'organisation qui héberge et exploite
  `ansut-apps/cmz-backoffice-frontend` en production aujourd'hui) a acquis
  un quelconque droit d'usage ou de licence sur ce code par un autre biais
  (contrat de service, accord verbal, usage prolongé) — seule la question
  de la **titularité des droits d'auteur** est tranchée ici, pas celle des
  droits d'exploitation qu'ANSUT/CMZ pourrait détenir en tant qu'opérateur
  du service.

### Points à réévaluer

- Si un contrat écrit avec ANSUT/CMZ concernant le legacy est retrouvé ou
  signé après cette date, et qu'il contredit cette déclaration : rouvrir
  cet ADR.
- Si le corpus venant à être étendu (Option B d'ADR-0019) est un jour
  publié ou partagé à des tiers externes à ce projet : revérifier qu'aucun
  contenu tiers (dépendance non-npm, snippet copié d'une source externe) ne
  s'est glissé dans le legacy au fil du temps, indépendamment de la
  titularité du reste.

## Références

- [ADR-0019](./0019-nature-du-corpus-seos.md) — obstacle juridique initial,
  section « Option B ».
- [ADR-0014](./0014-figer-le-legacy-via-lock-json.md) — provenance technique
  du legacy (`legacy.lock.json`, dépôt GitLab `ansut-apps/
  cmz-backoffice-frontend`).
- `docs/architecture/licences-tierces.md` — périmètre distinct (dépendances
  npm tierces), ne couvre pas le legacy lui-même.
- [`LICENSE`](../../LICENSE) — renvoi explicite de cette question au porteur
  métier/juridique, désormais partiellement répondu par cet ADR.
