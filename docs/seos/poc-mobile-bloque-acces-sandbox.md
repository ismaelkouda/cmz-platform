# POC mobile (Kotlin/Swift) — bloqué par accès réseau du sandbox

- **Date :** 2026-08-11
- **Statut :** en pause, pas abandonné. Reprise conditionnée à un accès
  réseau/outillage à obtenir par le porteur du projet.

## Contexte

Suite à `principes-transferables-multi-plateforme.md` (Bloc A, principes
validés sur le papier pour iOS/Android), tentative de Bloc B : construire
un premier module Kotlin réel (`crud-entity`, exemple `settings-security/
users`) pour vérifier en pratique que l'architecture et l'Oracle
transposés tiennent.

## Constat

Le sandbox d'exécution (Linux `aarch64`, JDK 11 seul outil présent)
n'a :
- Ni Kotlin ni Gradle installés.
- Pas d'accès `sudo`/root pour les installer via `apt-get`
  (`sudo: The "no new privileges" flag is set`).
- Pas d'accès réseau aux dépôts nécessaires pour les télécharger :
  `repo1.maven.org` (Kotlin, Gradle) et
  `release-assets.githubusercontent.com` (releases GitHub) répondent
  `403 Forbidden` / `X-Proxy-Error: blocked-by-allowlist`.

Vérifié que ceci **n'est pas propre à Kotlin** : la même tentative pour
Swift échoue de façon identique (`download.swift.org` également
`blocked-by-allowlist`), avec en plus un obstacle structurel
supplémentaire — Xcode et la toolchain Swift complète ne tournent
officiellement que sur macOS, alors que ce sandbox est Linux
(`uname -a` → `Linux ... aarch64 aarch64 aarch64 GNU/Linux`). Même un
accès réseau débloqué ne permettrait donc pas de faire tourner un vrai
projet iOS ici.

## Piste explorée et écartée

Le réglage Claude.ai « Capabilities → Liste d'autorisation de domaines »
a été vérifié par l'utilisateur : déjà positionné sur « Tous les
domaines ». Le blocage persiste malgré ce réglage — ce qui indique que
Cowork applique une couche de filtrage réseau distincte de ce réglage
général, sans qu'un menu précis pour l'ajuster ait été identifié avec
certitude dans l'interface actuelle.

## Décision

Mis en pause à la demande du porteur du projet, qui compte chercher un
accès (menu Cowork spécifique, ou exécution sur sa propre machine) plus
tard. Pas de perte : le Bloc A (`principes-transferables-multi-
plateforme.md`) reste valide et réutilisable tel quel à la reprise —
aucune remise en cause du raisonnement de fond, seulement un blocage
d'outillage.

## Reprise — ce qu'il faudra

- Confirmer un accès effectif à un compilateur Kotlin (et/ou Swift) —
  soit via un déblocage réseau du sandbox, soit en travaillant
  directement sur une machine du porteur du projet qui a déjà les
  outils (Android Studio / Xcode).
- Reprendre au point exact où le Bloc B a été interrompu : écrire le
  module `crud-entity` (`settings-security/users`) en Kotlin pur
  (`kotlin("jvm")`, sans Android SDK), tests JUnit équivalents à ceux
  de T3-3, `ktlint` configuré — périmètre déjà validé avec le porteur
  du projet avant ce blocage.

## Références

- `docs/seos/principes-transferables-multi-plateforme.md` — Bloc A,
  toujours valide.
- `docs/architecture/poc-few-shot-legacy-nx.md` — limite distincte
  (traduction historique), sans rapport avec ce blocage d'outillage.
