# ADR-0007 — Configuration injectée à l'exécution

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Phase concernée :** application en Phase 06
- **Origine :** observations O1 et O2 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Contexte

Le projet d'origine ne configure pas son application à la compilation. Un script
`tools/env/generate-env.js` produit un fichier `src/assets/config/env.js` qui
alimente `window.__env` **au chargement de la page** :

```js
(function (window) {
    window.__env = {
        authenticationUrl: '…',
        reportUrl: '…',
        enableDebug: true,
    };
    window.__env.buildInfo = {
        environment: 'dev',
        version: '…',
        commitHash: '…',
    };
})(this);
```

C'est un bon choix d'architecture, et il mérite d'être conservé explicitement
plutôt que d'être reproduit par habitude.

Deux défauts d'application sont en revanche à corriger :

1. le fichier généré et sa source (`tools/env/config.js`) **sont versionnés**,
   bien que listés dans `.gitignore` — la règle ne s'applique pas aux fichiers
   déjà suivis. Aucun secret ne s'y trouve aujourd'hui, uniquement des URL de
   services internes et des paramètres d'apparence ; le risque est qu'un jour
   quelqu'un y ajoute une clé sans réaliser qu'elle sera publiée ;
2. quatre environnements sont décrits dans un unique fichier au dépôt, ce qui
   oblige à modifier le code pour changer une URL de production.

## Options envisagées

### Option A — Configuration à la compilation (`environment.ts` d'Angular)

Un build par environnement, valeurs figées dans le bundle.

- Avantages : mécanisme natif d'Angular, aucune infrastructure.
- Inconvénients : N environnements = N builds = N artefacts à tester. Ce qui est
  déployé en production n'est jamais exactement ce qui a été validé en recette.

### Option B — Configuration injectée à l'exécution (mécanisme d'origine)

Un seul build ; un fichier de configuration monté ou généré au démarrage du
conteneur.

- Avantages : **un artefact unique** promu de recette en production, donc testé
  tel qu'il sera déployé ; changer une URL ne demande ni recompilation ni
  redéploiement d'image ; compatible avec la gestion de secrets d'un
  orchestrateur.
- Inconvénients : une requête supplémentaire au démarrage ; la configuration
  doit être injectée par l'infrastructure, ce qui déplace une part de la
  complexité vers le déploiement.

## Décision

**Option B**, en conservant le principe du projet d'origine, avec trois
corrections :

1. Les **valeurs par environnement sortent du dépôt**. Le dépôt ne contient
   qu'un `env.example.js` documentant les clés attendues, jamais les valeurs
   réelles.
2. Le fichier généré (`assets/config/env.js`) est ignoré par Git — et
   effectivement, pas seulement inscrit au `.gitignore` : `git check-ignore -v`
   fait foi.
3. L'application **valide sa configuration au démarrage** et échoue
   explicitement si une clé requise manque, plutôt que de partir avec une URL
   `undefined`. Le projet d'origine avait déjà cette intuition avec son
   `config-validator.js` — à conserver.

## Justification

L'argument décisif n'est pas la commodité mais la confiance dans le déploiement
: avec un build par environnement, l'artefact promu en production n'a jamais été
exécuté tel quel. Avec un artefact unique, ce qui est validé en recette est
littéralement ce qui tourne en production, à la configuration près.

La correction 1 relève de l'hygiène plutôt que de la sécurité au vu du contenu
actuel — mais un dépôt où la configuration est versionnée est un dépôt où le
premier secret ajouté le sera aussi, sans que personne ne s'en aperçoive.

## Conséquences

### Positives

- Un seul artefact à construire, tester et promouvoir.
- Les URL et paramètres deviennent des données d'exploitation, pas de code.
- Le dépôt cesse de documenter la topologie interne du réseau.

### Négatives / dette acceptée

- Le déploiement doit fournir la configuration (montage de volume, `ConfigMap`,
  génération à l'entrée du conteneur) : la complexité est déplacée, pas
  supprimée. À traiter en Phase 06.
- Un environnement de développement local a besoin de sa propre configuration,
  non versionnée : le `env.example.js` doit donc être réellement à jour, sinon
  l'amorçage d'un nouveau poste devient pénible.

### Points à réévaluer

- Si un jour la configuration doit varier par client (multi-tenant), ce
  mécanisme devra être étendu — le projet d'origine évoquait déjà des « tenants
  » dans sa CI.

## Références

- `tools/env/generate-env.js` et `tools/env/config.js` du projet d'origine.
- [Revue de socle du 2026-07-21, observations O1 et O2](../reviews/2026-07-21-revue-socle-avant-phase-02.md)
