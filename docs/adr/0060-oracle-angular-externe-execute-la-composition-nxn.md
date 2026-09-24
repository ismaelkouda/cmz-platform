# ADR-0060 — Un oracle Angular externe exécute la composition N×N

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

ADR-0059 matérialise deux queries et une commande dans un même composition root
Angular, mais sa preuve C3 reste structurelle : elle compile et publie les
fichiers sans observer les trois opérations HTTP dans une même instance DI.
Tester séparément chaque primitive ne suffit pas à détecter un partage d'état,
une annulation trop large, une invalidation cachée ou un mauvais raccord des
providers de page.

C4 doit apporter cette preuve sans ajouter un orchestrateur de production, sans
faire dépendre les fichiers générés de leur test et sans accéder à un backend ou
à des secrets réels.

## Décision

Le préparateur des tests Angular matérialise désormais la sortie C3 complète
dans son répertoire éphémère et ignoré `.stack-test-runtime`. La même fixture de
plan est partagée par les tests de publication C3 et par ce préparateur afin
d'éviter deux scénarios presque identiques qui dériveraient séparément.

Un spec Vitest situé hors de la sortie générée importe uniquement l'API publique
du composition root et sa liste de providers. Il l'instancie dans le vrai
contexte DI Angular avec `HttpClient`, les intercepteurs auth, erreur et cache
du host, puis remplace seulement le backend réseau par `HttpTestingController`.
L'oracle observe donc de vrais objets de requête Angular et leurs effets, tout
en restant hermétique et sans socket externe.

La preuve couvre dans une même composition :

1. deux GET concurrents et un POST avec URL, méthode, payload, auth et contexte
   cache exacts ;
2. l'indépendance des trois états locaux ;
3. une panne d'une query qui conserve l'autre query utilisable ;
4. un retry manuel limité à la query en erreur, avec contournement du cache ;
5. l'annulation `latest-wins` limitée au nœud supplanté ;
6. l'annulation des deux GET à la destruction du scope de page ;
7. le rejet du double submit sans second POST ;
8. l'absence d'idempotency key et d'invalidation/replay implicite, conformément
   aux politiques `none` du plan courant.

## Indépendance de l'oracle

Le spec ne lit ni le plan, ni les modèles, ni les manifests, ni les fonctions du
générateur. Il ne peut donc pas dériver ses attentes de la structure qui les a
produites. Ses URLs, payloads, headers, états et réponses attendues sont écrits
du point de vue du host consommateur.

Le générateur prépare les sources avant le type-check et Vitest, mais les
fichiers générés ne contiennent aucun branchement de test, aucune fixture et
aucune assertion de conformité.

## Revue de simplification obligatoire

C4 n'ajoute **aucune ligne au runtime de production généré**. Le seul raccord
est dans le préparateur de tests existant. La grande fixture C3 a été extraite à
l'identique vers un support de test partagé ; elle n'est ni un nouveau modèle,
ni un nouveau runtime.

Aucun transport, cache, orchestrateur, façade, publisher, journal, verrou,
schéma ou dépendance n'est ajouté. Les politiques restent possédées par les deux
primitives v2 et par le host Angular.

## Limites

- La preuve couvre Angular uniquement. React ne sera pas déclaré équivalent par
  symétrie.
- Le backend HTTP est hermétique en mémoire : le pipeline Angular et ses
  intercepteurs sont réels, mais aucun socket TCP n'est ouvert.
- Le plan courant déclare retry automatique, invalidation, idempotence et effet
  post-succès à `none`. C4 observe ces absences et le double-submit, mais ne
  prétend pas prouver une capacité positive non encore supportée.
- Aucun composant, template, accessibilité ou vertical slice SEOS n'est couvert
  ; cela reste le lot C5.
- La capacité de composition reste `experimental` jusqu'aux preuves C5/C6 et à
  la revue humaine prévue.

## Références

- [ADR-0058](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [ADR-0059](./0059-composition-angular-materialise-les-noeuds-du-plan.md)
- [Audit Staff de la composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
