# ADR-0087 — Contrat host React pour une composition de page

- **Statut :** Accepted
- **Date :** 2026-10-07
- **Décideurs :** équipe plateforme CMZ

## Contexte

La composition C5 React matérialise déjà deux queries et une commande depuis le
même `page-execution-plan` que la cible Angular. Le shell React C5 existe aussi,
mais les sources générées et l'application restaient séparées. Les clients
générés demandent volontairement au host d'exécuter leurs politiques
d'authentification et de cache : leur faire lire un token, une variable globale
ou une URL SEOS directement aurait recréé un couplage au backend et contredit
les ADR-0034, 0051, 0056 et 0086.

Une simple copie des sources ou un import inutilisé ne constitue pas une preuve
d'intégration. À l'inverse, réaliser maintenant toute l'interface React
mélangerait le raccord d'exécution avec les décisions de présentation qui
doivent rester revues séparément.

## Décision

La composition React C5 est publiée transactionnellement sous :

```text
apps/users-management-react-proof/src/app/generated/
  page_6666666666666666/reactjs/
```

Le code applicatif la raccorde par un adaptateur explicite `page-host.ts`. Ce
contrat reçoit uniquement :

1. une table fermée d'URL de base indexée par l'identifiant de service déclaré
   par le plan ;
2. un port `request` appartenant au host, responsable d'appliquer
   authentification, cache et transport selon la politique générée.

L'adaptateur :

- instancie les trois clients générés et les hooks React officiels ;
- transmet les politiques host sans les traduire ni les affaiblir ;
- refuse une URL non absolue, non HTTPS hors loopback, munie de credentials,
  d'une query ou d'un fragment ;
- refuse un service non déclaré et toute requête sortant du chemin de base
  configuré ;
- ne contient aucun endpoint d'environnement, token, en-tête `Authorization` ou
  composant Angular ;
- laisse la permission courante comme entrée du hook de composition. La commande
  continue donc à la revérifier immédiatement avant le POST.

La première publication peut désormais être appliquée avec l'identifiant du
Change Set relu, même si les répertoires parents n'existent pas. Le publisher
les crée avant le verrou, revalide le Change Set sous verrou et conserve sa
transaction atomique.

## Portée de cette tranche

Cette décision prouve le raccord compilable et exécutable entre le plan C5 et le
shell React. Elle ne monte pas encore la composition dans la page visible et ne
revendique aucune parité de présentation. La tranche suivante consommera ce
contrat depuis une réalisation React accessible et adaptative ; elle ne devra ni
recopier le HTML Angular ni contourner le port host.

## Conséquences

### Positives

- Le backend peut rester Spring Boot, Laravel, .NET, Django ou changer
  d'environnement : seule la configuration du host varie.
- Les tests de page peuvent fournir un transport hermétique sans serveur ni
  secret.
- La composition générée reste régénérable et adressée par contenu.
- Les responsabilités sont lisibles : plan et clients pour le comportement, host
  pour l'infrastructure, future page pour la présentation.

### Négatives

- Le host de déploiement devra fournir le transport authentifié et les URL ; en
  leur absence, la future page devra échouer fermée.
- Le contrat est volontairement spécifique aux services exigés par cette page.
  Une abstraction globale ne sera extraite qu'après un second cas réel
  convergent.

## Options écartées

- **Coder les URL SEOS dans l'app :** non portable et dangereux pour les
  environnements.
- **Ajouter directement un bearer avec `window.fetch` :** duplique la gestion de
  session et expose une politique de sécurité implicite.
- **Réutiliser le host Angular :** mélange les stacks et viole la séparation des
  renderers.
- **Créer dès maintenant une abstraction universelle :** prématuré sans second
  consommateur réel ; contraire à YAGNI.

## Références

- [ADR-0034 — Plateforme multi-stack, renderers séparés, sorties mono-stack](./0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md)
- [ADR-0051 — `list-query` v2 React utilise un port hôte explicite](./0051-list-query-v2-react-utilise-un-port-hote-explicite.md)
- [ADR-0056 — `action-request` v2 React utilise un port hôte explicite](./0056-action-request-v2-react-utilise-un-port-hote.md)
- [ADR-0065 — Composer C5 sur les trois contrats utilisateurs observés](./0065-composition-c5-utilisateurs-sur-contrats-observes.md)
- [ADR-0086 — Profil React natif, minimal et qualifié par capacité](./0086-profil-react-natif-minimal.md)
