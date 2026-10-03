# ADR-0079 — JEV comme évaluateur probabiliste en replay/shadow

- **Statut :** Accepted
- **Date :** 2026-10-03

## Contexte

La preuve de composition N×N est achevée : la plateforme sait construire une
page à partir de plusieurs lectures et actions sans déléguer ses invariants à un
modèle. Le futur workbench pourra cependant rencontrer des demandes en langage
naturel pour lesquelles un jugement étroit apporte un signal utile avant la
compilation, par exemple : « manque-t-il une décision produit ? » ou
« manque-t-il un élément du contrat backend ? ».

JEV est un modèle de décision : il reçoit un état et des questions typées, puis
retourne des valeurs, distributions et niveaux de confiance. Cette spécialité
le rend plus pertinent pour des classifications bornées que pour générer une
page, expliquer librement une erreur ou modifier le dépôt.

Son adoption directe serait néanmoins prématurée :

- la qualité publiée reste précoce et dépend fortement de la tâche, du seuil et
  de la langue ;
- une instruction ou une opinion ajoutée dans l'état peut déplacer la décision,
  et deux appels identiques ne sont pas nécessairement identiques ;
- `www.jevai.org` se présente comme un site communautaire et non comme
  l'autorité du modèle ou de son API centrale ; plusieurs fournisseurs exposent
  JEV avec des contrats et politiques distincts ;
- les informations publiques examinées ne suffisent pas à établir précisément
  la rétention, la suppression et l'usage d'entraînement des contenus soumis ;
- une probabilité convaincante ne remplace ni une règle déterministe, ni une
  permission, ni une revue humaine.

Le corpus cible est principalement français. Les critères de jugement peuvent
être définis en anglais, mais traduire les demandes avec un second modèle
ajouterait un facteur de confusion et empêcherait de mesurer la capacité réelle
de JEV sur nos entrées.

## Options envisagées

### Option A — Intégration live dans la génération ou l'approbation

- avantage : décision immédiatement exploitable ;
- inconvénients : dépendance réseau et fournisseur sur le chemin critique,
  résultat probabiliste doté d'une autorité excessive, exposition de données et
  échec potentiellement silencieux.

### Option B — Compétence d'agent ou plugin sans protocole d'évaluation

- avantage : POC rapide ;
- inconvénients : état, version, seuil et fournisseur difficiles à reproduire ;
  absence de corpus aveugle et risque de sélectionner seulement les exemples
  favorables.

### Option C — Évaluateur isolé, provider-neutral, en replay/shadow

- avantage : valeur, stabilité, sécurité, coût et latence mesurés sans modifier
  le comportement courant ; réponses rejouables hors ligne ; fournisseur
  remplaçable ;
- coût : constitution et annotation d'un corpus, adaptateur et rapport
  d'évaluation à maintenir pendant l'expérience.

### Option D — Ne pas expérimenter

- avantage : aucune dépendance ni dépense supplémentaire ;
- inconvénient : abandon sans mesure d'un signal structuré potentiellement utile
  aux clarifications du workbench.

## Décision

**Option C.** JEV peut être étudié uniquement comme évaluateur optionnel du
`model plane`, dans un POC isolé en replay/shadow. Cette acceptation autorise
l'expérience ; elle **n'autorise pas l'adoption en production**.

### Autorité et frontière d'exécution

- En mode **shadow**, la réponse JEV est enregistrée et comparée à une étiquette
  humaine établie auparavant ; elle ne change aucun plan, diagnostic, fichier,
  statut, contrôle ou écran.
- En mode **replay**, des requêtes et réponses assainies, immuables et adressées
  par contenu sont relues sans réseau ni nouvel appel au modèle.
- JEV ne peut ni compiler, écrire, lancer une commande, accorder une permission,
  approuver, fusionner, publier, ni contourner un oracle.
- L'indisponibilité, le rate limiting, une réponse invalide ou une confiance
  insuffisante reviennent au chemin humain et déterministe existant. Aucun
  échec ne devient une autorisation implicite.
- Aucun appel live n'entre dans la CI obligatoire, le runtime des applications
  générées ou le chemin de génération déterministe.

### Premier jugement borné

Le premier cas évalue une demande produit française avant sa transformation en
définition. Il ne produit pas une décision exclusive artificielle : plusieurs
manques peuvent coexister. Le jeu de questions initial reste atomique :

- `needs_product_clarification` (`noul`) : une décision produit manquante peut
  modifier matériellement le comportement ou la présentation ;
- `needs_backend_contract_clarification` (`noul`) : une information de contrat
  backend manque pour construire la définition sans invention ;
- `outside_supported_scope` (`noul`) : la demande exige une capacité que le
  périmètre déclaré du workbench ne couvre pas.

JEV ne juge pas si une opération est autorisée : permissions, approbations et
ownership restent des faits contractuels. L'état soumis conserve le français
original ; les questions et leurs critères sont versionnés en anglais afin de
mesurer le comportement multilingue direct, sans traduction préalable.

### Reproductibilité et fournisseur

- Le harnais dépend d'un port interne minimal et d'un adaptateur fournisseur ;
  aucun format d'API JEV ne fuit dans les contrats du générateur.
- Chaque observation conserve fournisseur, endpoint logique, modèle épinglé,
  `model_version` effectivement retournée, révision des questions, hash de
  l'entrée assainie, identifiant de requête, paramètres, réponse brute scellée,
  réponse normalisée, usage, coût et latence.
- Un alias mouvant tel que `jev-latest` est interdit dans une campagne mesurée.
  Une évolution de modèle ouvre une nouvelle campagne ; elle ne réécrit pas les
  résultats passés.
- Un fournisseur direct de l'autorité amont est préféré à une façade
  communautaire, sous réserve de conditions de sécurité et de confidentialité
  acceptables. Le choix effectif reste une configuration documentée du POC et
  non une dépendance métier.
- Les clés restent côté serveur, distinctes par environnement et absentes des
  fixtures, logs et artefacts. Les retries respectent idempotence,
  `Retry-After` et budgets bornés.

### Données et protocole d'évaluation

- La première campagne utilise uniquement des demandes synthétiques ou
  assainies et versionnées dans le dépôt. Aucun secret, donnée personnelle,
  contenu client ou donnée réglementée n'est envoyé.
- Une utilisation de données sensibles reste bloquée tant que rétention,
  suppression, entraînement, localisation, sous-traitants et engagements
  contractuels du fournisseur ne sont pas explicitement établis.
- Les étiquettes humaines et leur guide sont produits avant l'observation des
  sorties JEV. Les désaccords sont conservés puis arbitrés ; le jeu final
  sépare développement, calibration et holdout.
- Taille du corpus, strates, métriques, seuils cibles et règle de décision sont
  préenregistrés avant les appels live. Un petit smoke test peut valider le
  harnais, jamais justifier une adoption.
- Les seuils sont calibrés sur le split prévu, jamais fixés automatiquement à
  `0.5` ni ajustés après lecture du holdout.
- La campagne mesure au minimum matrices de confusion, précision/rappel/F1 par
  question, taux critique de faux « aucune clarification nécessaire », Brier
  score, log loss, calibration, courbe couverture/risque, répétabilité sur
  appels identiques, robustesse aux opinions/instructions injectées dans
  l'état, indisponibilité, p50/p95 de latence et coût.

Le livrable du POC est un rapport reproductible accompagné des fixtures replay.
Une décision distincte conclura : rejet, poursuite limitée ou proposition de
promotion. Toute promotion exigera un nouvel ADR ; elle pourra seulement
assister une revue humaine tant qu'une preuve plus forte ne justifie pas une
autorité supplémentaire.

## Justification

Cette frontière exploite la force annoncée de JEV — des jugements étroits et
typés — sans lui confier les responsabilités où la plateforme exige exactitude,
traçabilité et autorisation. Le shadow évite le rayon d'impact opérationnel ; le
replay rend les régressions observables ; le port fournisseur préserve la
neutralité déjà imposée au workbench.

Le protocole traite explicitement quatre risques souvent masqués par une simple
démo : choix opportuniste des exemples, seuil inadapté, variance entre appels
et sensibilité de l'état à une injection. Il mesure également le français réel
au lieu d'inférer sa qualité depuis un benchmark anglophone.

## Conséquences

### Positives

- signal probabiliste mesuré sans affaiblir les oracles existants ;
- expérience reproductible et comparable entre versions ou fournisseurs ;
- coût, latence, calibration et cas d'échec visibles avant toute adoption ;
- corpus français réutilisable pour d'autres évaluateurs du `model plane` ;
- retrait simple du POC si la valeur n'est pas démontrée.

### Négatives / dette acceptée

- annotation humaine et arbitrage nécessaires avant les appels ;
- coût d'un harnais, de fixtures et d'une campagne pour un composant qui peut
  être finalement rejeté ;
- absence d'explication riche native : une confiance n'indique pas à elle seule
  quelle information demander ;
- résultat dépendant du modèle, du fournisseur, des critères et des seuils.

### Points à réévaluer

- modification des conditions de confidentialité ou du modèle épinglé ;
- dérive mesurée sur une nouvelle langue, un nouveau domaine ou une nouvelle
  révision des critères ;
- instabilité, injection, faux négatifs critiques, coût ou latence au-delà des
  budgets préenregistrés ;
- besoin réel d'utiliser le signal hors shadow, qui impose un nouvel ADR.

## Références

- [JEV — documentation de l'API de décision](https://jev-ai.org/docs/)
- [JEV — décisions et idempotence](https://jev-ai.org/docs/decisions/)
- [JEV — versions de modèles](https://jev-ai.org/docs/models/)
- [JEV — authentification](https://jev-ai.org/docs/authentication/)
- [JEV — limites](https://jev-ai.org/docs/limits/)
- [JEV AI Community — statut communautaire](https://www.jevai.org/)
- [Jev AI — politique de confidentialité publique](https://thejevai.com/privacy-policy)
- [Evaluating and Benchmarking System One Model Jev](https://arxiv.org/abs/2609.37647)
- [JevAdvBench](https://arxiv.org/abs/2609.31142)
- [System-1 Decision Models: An Early Evidence Audit](https://arxiv.org/abs/2609.32160)
- [Vision du workbench contractuel](../architecture/vision-produit-workbench-contractuel.md)
- [ADR-0039 — frontière contractuelle conception/réalisation/LLM](./0039-frontiere-contractuelle-conception-realisation-llm.md)
