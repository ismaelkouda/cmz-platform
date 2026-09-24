# ADR-0059 — La composition Angular matérialise les nœuds du plan avant l'UI

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

ADR-0058 compile un `page-execution-plan` target-neutral qui référence deux
queries et une commande par identité, version, URI et SHA-256. Il ne produit
encore aucun raccord Angular. Les sorties v2 existantes sont plates et ne sont
pas des packages Nx autonomes ; inventer des imports vers des packages absents
rendrait le composition root mensonger.

Le lot C3 doit donc rendre le plan compilable et publiable avant toute écriture
UI, sans recopier dans le composition root les règles de transport, de cache,
d'authentification ou d'état déjà possédées par les renderers v2.

## Décision

Une cible `angular` de composition matérialise chaque instance du plan dans un
répertoire distinct `src/nodes/<node-id>`. Les fichiers de chaque nœud sont
produits par les renderers `list-query` v2 et `action-request` v2 existants.
Même si deux nœuds utilisent un jour la même primitive, leurs classes Angular
restent donc des identités DI distinctes et leurs états ne peuvent pas être
partagés accidentellement.

Le code spécifique à la composition est limité à trois fichiers :

- `page-composition.ts`, service qui injecte et expose chaque façade par ID de
  nœud ;
- `page-composition.providers.ts`, liste explicite des sources, façades et du
  service de page ;
- `index.ts`, API publique et namespaces de nœuds.

Les bindings host sont un document fermé et versionné. Le renderer ne fournit
aucune URL : il réutilise les tokens publics du host. La cible annonce une
allowlist de capacités Angular indépendante du plan ; une capacité requise mais
absente est refusée au lieu d'être déclarée supportée par tautologie.

Avant rendu, C3 relit le contrat de page et chaque modèle depuis leur URI sous
une racine explicite, refuse liens symboliques et traversées, recalcule les
SHA-256 et recroise modèle, opération backend et nœud. La sortie passe ensuite
par le plan d'artefacts, le type-check strict et le publisher transactionnel
existants. Création, dry-run et évolution revue conservent donc le même verrou,
journal, rollback et protocole de reprise que les primitives.

## Preuve

La fixture C3 compile puis matérialise deux queries réelles, dont une
paramétrée, et une commande réelle. Elle vérifie :

1. 19 sources Angular déterministes, réparties sous trois identités de nœud ;
2. un composition root et des providers compilés strictement avec Angular 22 ;
3. la liaison du manifest au hash canonique du plan ;
4. le rejet d'un service host absent, d'un modèle périmé et d'une capacité
   Angular inconnue ;
5. une publication réelle puis un dry-run entièrement stable ;
6. l'absence de composant, template ou fichier UI dans la sortie.

Les suites natives des primitives restent les autorités de leur comportement. C3
prouve le raccord statique et la publication ; il ne prétend pas encore que les
trois appels HTTP ont été observés ensemble.

## Revue de simplification obligatoire

Le lot ajoute **654 lignes de production contractuelle** : 604 lignes pour la
cible, le renderer, la commande et le schéma host ; 18 lignes de fixture host ;
32 lignes nettes dans le plan d'artefacts et la commande package.

Il n'ajoute aucun cache, transport, façade métier, mécanisme DI, journal,
verrou, publisher ou runtime générique. Le composition root assemble les classes
déjà générées et ne contient aucune politique métier. Une seule cible, Angular,
est ouverte : React attendra la preuve C4 Angular et ne sera pas déduit par
symétrie.

## Limites et prochain incrément

- La commande consomme un plan déjà compilé ; la publication du plan depuis
  l'intention produit reste un raccord de pipeline à fermer ultérieurement.
- La cible publiée reste plate, conformément aux limites actuelles des sorties
  v2 ; elle n'est pas maquillée en package Nx autonome.
- Le service expose les façades indépendantes mais ne déclenche aucun appel de
  lui-même.
- Aucun composant ni rendu de binding n'est généré dans C3.

C4 doit posséder un oracle externe hermétique, instancier ce composition root
réel et observer deux GET et un POST avec URL, payload, auth, cache, erreur
partielle, retry/cancellation et double soumission. Cette preuve doit rester
hors des fichiers générés et sans secrets.

## Références

- [ADR-0058](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [Audit Staff de la composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
