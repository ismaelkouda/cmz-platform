# ADR-0089 — Montage navigateur React par host public fermé

- **Statut :** Accepted
- **Date :** 2026-10-07
- **Décideurs :** équipe plateforme CMZ

## Contexte

ADR-0087 définit le contrat qui relie la composition React C5 à un port de
requête et à une table fermée d'URL de services. L'adaptateur et ses tests
existent, mais la route publiée ne pouvait pas encore recevoir ce contrat avant
le bootstrap. Coder une URL, appeler `fetch` depuis la page ou importer une
configuration SEOS dans la présentation contournerait cette frontière.

Le shell possède déjà un point d'entrée public distinct pour la décision
d'accès. Il ne contient aucun secret et ne remplace pas l'autorisation du
backend. Le transport de page doit suivre la même discipline sans fusionner
accès, session, URL et présentation dans un objet implicite.

## Décision

Le host navigateur installe, avant le bootstrap React, une unique propriété :

```ts
window.__cmzUsersManagementPageHost = {
    serviceBaseUrls: { 'settings-api': 'https://example.invalid/' },
    request,
};
```

Cette propriété est une couture d'intégration publique, pas une configuration
métier ni une autorité de sécurité. Sa forme est fermée : elle contient
exactement `serviceBaseUrls` et `request`. L'adaptateur existant continue de
valider le service, l'URL absolue, le protocole et le confinement de chaque
requête. Une valeur absente, primitive, tableau, incomplète ou enrichie d'une
clé inconnue échoue fermée avant toute requête.

La future page visible appellera uniquement
`createBrowserUsersManagementPageRuntime`. Elle ne lira ni URL, ni token, ni
en-tête d'authentification et n'appellera pas directement le réseau. Les
permissions restent issues du contexte d'accès public déjà publié ; la commande
générée les revérifie avant le POST.

Le transport peut appliquer la session, le cache et l'observabilité du host. Le
backend reste l'autorité finale et doit refuser toute opération non autorisée.

## Conséquences

### Positives

- la route React peut consommer le runtime sans modifier le shell généré ;
- aucun environnement backend n'entre dans la présentation ;
- le harnais navigateur peut fournir un transport hermétique et synthétique ;
- le work order de réalisation continuera à protéger `page-host.ts` par hash ;
- une mauvaise installation produit un échec explicite avant le premier GET.

### Négatives

- le host de déploiement doit installer la couture avant le bootstrap ;
- ce contrat reste spécifique à C5 jusqu'à l'existence d'un second besoin
  convergent ;
- une fonction ne peut pas être fournie par un fichier JSON statique : le host
  JavaScript reste responsable du transport.

## Options écartées

- **`fetch` dans la page :** duplique session, cache et politiques du host.
- **URL Vite codée dans l'application :** lie la présentation à un environnement
  et expose une configuration non gouvernée.
- **Contexte React universel :** abstraction prématurée sans second consommateur
  ; le shell publié devrait en plus être élargi.
- **Objet global ouvert contenant token et permissions :** mélange secrets,
  infrastructure et autorisation, et rend les dérives silencieuses.
- **Valeurs de démonstration par défaut :** pourrait envoyer une requête vers un
  backend inattendu au lieu d'échouer fermé.

## Preuves exigées

- exécution réelle d'un GET via la couture navigateur ;
- refus des formes absentes, primitives, tableaux, incomplètes et enrichies ;
- conservation des tests de confinement URL/service d'ADR-0087 ;
- compilation, lint, tests et build React ;
- absence d'URL SEOS, token, `Authorization` ou `fetch` dans la page.

## Références

- [ADR-0070 — Prouver le rendu navigateur avant la baseline](./0070-harnais-navigateur-avant-baseline-visuelle.md)
- [ADR-0086 — Profil React natif minimal](./0086-profil-react-natif-minimal.md)
- [ADR-0087 — Contrat host React](./0087-contrat-host-react-pour-composition-de-page.md)
- [ADR-0088 — Réalisation de page ciblée par profil](./0088-realisation-page-ciblee-par-profil.md)
