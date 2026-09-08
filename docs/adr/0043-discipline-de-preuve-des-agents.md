# ADR-0043 — Discipline de preuve des agents

- **Statut :** Proposed
- **Date :** 2026-09-08

## Contexte

Trois jours de travail sur `add-library` (ADR-0041, ADR-0042) ont produit une
mesure exploitable, parce que trois agents ont travaillé sur le même code : un
agent constructeur, un agent relecteur, puis l'inverse.

Répartition observée des défauts, par emplacement :

| Défaut                                            | Trouvé par        | Situé dans          |
| ------------------------------------------------- | ----------------- | ------------------- |
| Bac à sable lisant `$HOME` et `~/.ssh`            | relecture (Opus)  | code d'un autre     |
| `bun.lock` réel illisible par son propre contrôle | relecture (Opus)  | code d'un autre     |
| Deux fichiers de tests non câblés                 | relecture (Opus)  | code d'un autre     |
| `node_modules` imbriqués comptés comme mutations  | exécution (Opus)  | code d'un autre     |
| Cache natif Nx, workers de plugins                | exécution (Opus)  | dépendance          |
| Syntaxe `--mount` invalide                        | exécution (Opus)  | **son propre code** |
| `redirect: 'follow'` — hôte non contraint         | relecture (Codex) | **code d'Opus**     |
| Preuves runtime en `development`, jamais en prod  | relecture (Codex) | **code d'Opus**     |
| Coexistence dépendante de l'ordre d'installation  | exécution (Codex) | **code d'Opus**     |
| Binaire extrait réutilisé sans revalidation       | relecture (Codex) | **code d'Opus**     |
| Appariement de paquets par suffixe (heuristique)  | exécution (Codex) | **code d'Opus**     |

La régularité n'est pas dans la compétence des agents : elle est dans la
**posture**. Un agent qui relit demande « comment ça casse ». Le même agent, en
construisant, demande « est-ce que ça marche ». Les deux questions ne produisent
pas le même travail, et aucun agent n'a produit seul la rigueur qu'il exigeait
des autres.

Trois conséquences observées, toutes documentées dans l'historique :

1. **Arrêt au premier vert.** Un `8/8 EXIT=0` a été traité comme une ligne
   d'arrivée. Le même vert, relu, posait deux questions immédiates : et en build
   de production ? et dans l'autre ordre d'installation ?
2. **Garanties écrites avant d'être prouvées.** « L'hôte est limité à
   `download_host` » figurait dans un message de commit, dans un ADR et dans un
   commentaire de code pendant que `fetch` suivait les redirections hors hôte.
3. **Oracles choisis pour leur coût.** `build:development` (plus rapide) et une
   page `file://` (plus simple) ont retiré du test la dimension réseau — celle
   qui décide de la cible PWA hors ligne.

## Décision

Cinq règles. Chacune énonce son **déclencheur**, son **obligation**, son **mode
d'échec**, et surtout la **nature de sa vérification** — machine, humaine, ou
processus. Les mélanger reviendrait à écrire une garantie sans son contre-test,
c'est-à-dire à commettre R1 en l'énonçant.

### R1 — Aucune garantie affichée sans contre-test nommé

- **Déclencheur** : toute phrase affirmant une propriété de sécurité ou de
  correction, dans un message de commit, un ADR, un commentaire de code ou la
  sortie d'un outil.
- **Obligation** : nommer le test qui tombe si la propriété saute, et la
  **mutation exacte** qui le fait tomber. « J'ai retiré la branche `anyOf`, deux
  tests tombent » est une preuve ; « c'est couvert » n'en est pas une.
- **Échec** : la phrase ne s'écrit pas. Pas de version atténuée, pas de «
  devrait ».
- **Vérification** : humaine à l'écriture ; mécanisable par M1.

### R2 — Un vert déclare ce qu'il n'a pas exercé

- **Déclencheur** : toute preuve qui passe.
- **Obligation** : énoncer les dimensions **non couvertes**, par écrit, au même
  endroit que le résultat. « Vert en dev, jamais en production. » « Vert dans un
  sens, l'autre non testé. » « Vert sur macOS, conteneur non exercé. »
- **Échec** : un vert sans périmètre déclaré est traité comme non concluant.
- **Vérification** : mécanisable par M2 dès que les dimensions sont un ensemble
  clos déclaré.

### R3 — L'espace des états est énuméré, jamais parcouru

- **Déclencheur** : toute propriété reliant deux entités ou deux configurations
  (« A coexiste avec B », « la commande construit l'app »).
- **Obligation** : énumérer le produit des dimensions **avant** de tester, puis
  couvrir chaque point ou y renoncer explicitement, avec une date de revue. Le
  chemin que la fixture rend disponible n'est pas l'espace des états :
  `add-library angular-material` sur une app qui a déjà Tailwind était le seul
  chemin offert, et l'ordre inverse n'existait dans aucun test.
- **Échec** : un point non couvert et non déclaré est un défaut, pas un manque.
- **Vérification** : mécanisable par M2.

### R4 — Un oracle est choisi pour la propriété, pas pour son coût

- **Déclencheur** : le choix d'une configuration d'exécution pour une preuve
  (build, environnement, source des données).
- **Obligation** : retenir la configuration **la plus proche de la cible
  déclarée**. Si une configuration moins coûteuse est retenue, la divergence est
  écrite avec ce qu'elle retire de la preuve.
- **Échec** : une preuve dont la configuration a été choisie pour sa vitesse ou
  sa simplicité, sans divergence déclarée, ne compte pas.
- **Vérification** : humaine. M2 la rend visible mais ne la remplace pas — c'est
  un jugement sur ce que la cible exige.

### R5 — Le diff est relu par un agent qui ne l'a pas écrit

- **Déclencheur** : tout lot destiné à être fusionné.
- **Obligation** : relecture adverse par un agent distinct de l'auteur, avec
  mandat explicite de chercher l'échec — pas de valider.
- **Échec** : un lot relu par son seul auteur n'est pas relu.
- **Vérification** : **processus**. Ni mécanisable ni remplaçable par la
  discipline individuelle. C'est la seule règle dont ce dépôt possède déjà la
  preuve d'efficacité : la totalité des défauts du tableau ci-dessus a été
  trouvée par un agent lisant le code d'un autre, ou par l'exécution réelle —
  aucun par relecture de soi.

## Ce que cet ADR ne fait pas

**Il n'applique rien.** C'est de la prose, revue par un humain. Écrire qu'une
règle « est appliquée » ici serait exactement la faute R1.

Deux mécanismes peuvent la rendre exécutable, et ils restent à construire :

- **M1 — registre d'interrupteurs.** Chaque garde déclare, dans un artefact
  structuré, la mutation qui doit le faire tomber et le test qui doit tomber. Le
  gate applique la mutation et exige l'échec. Un garde dont aucune mutation ne
  fait tomber aucun test est décoratif. Le patron existe déjà :
  `check:library-setup` confronte `runtime_acceptance.status` au registre
  d'oracles, dans les deux sens.
- **M2 — dimensions de couverture déclarées.** Chaque preuve déclare ses
  coordonnées dans un ensemble clos de dimensions (configuration de build, ordre
  d'installation, backend, réseau). Le gate exige le produit couvert, ou un
  renoncement daté et nommé.

Aucun des deux ne doit prendre la forme d'une recherche de formulations dans du
texte libre : cette voie a déjà été écartée dans ce dépôt, un contrôle qui
cherche des mots dans un commentaire ne peut pas régresser et donne une fausse
confiance.

## Conséquences

- Le coût de construction augmente : R3 impose d'énumérer avant de tester, R4
  interdit l'oracle le moins cher par défaut.
- Le coût de relecture augmente aussi : R5 exige un second agent sur chaque lot.
- En échange, la classe de défaut dominante de ces trois jours — une garantie
  écrite, jamais attaquée — devient détectable au lieu d'être découverte par le
  relecteur suivant.
- R1 et R2 sont applicables immédiatement, sans outillage. R3 l'est aussi, au
  prix d'une énumération écrite. R5 dépend de l'organisation du travail, pas du
  code.
- Tant que M1 et M2 n'existent pas, ces règles reposent sur la relecture
  humaine. Le dire fait partie de la décision.
