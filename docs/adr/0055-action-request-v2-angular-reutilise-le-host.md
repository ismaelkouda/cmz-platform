# ADR-0055 — `action-request` v2 Angular réutilise le host réel

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

ADR-0054 produit un modèle d'exécution neutre, mais ne prouve pas que ses
contrats survivent au raccordement avec Angular. Les risques déjà identifiés par
l'audit Staff sont concrets : envoyer le Bearer du host sur une action publique,
valider après l'appel HTTP, confondre DTO wire et résultat métier, accepter une
enveloppe mal formée, ou rendre une double soumission imprévisible.

Le cas actif `forgot-password` est volontairement étroit : une action publique
`POST`, un payload JSON avec un email obligatoire, une réponse enveloppée et
aucun effet local post-succès. Il permet de prouver le raccordement au vrai host
sans inventer les formes voisines.

## Options envisagées

### Option A — Générer un runtime Angular autonome

- Avantage : le générateur contrôle toute l'exécution.
- Inconvénients : duplication de l'authentification, des erreurs et de la
  configuration ; tokens privés que les intercepteurs du host ne lisent pas ;
  diagnostic plus difficile.

### Option B — Adapter le code généré aux ports publics du host

- Avantages : réutilisation de `HttpClient`, des URLs injectées, de `SKIP_AUTH`
  et de la boucle d'erreurs existante ; sortie Angular ordinaire.
- Inconvénient : chaque service backend doit avoir un binding explicite.

### Option C — Garder uniquement des tests textuels du renderer

- Avantage : coût faible.
- Inconvénient : ne détecte ni un mauvais token de contexte, ni un Bearer
  réellement ajouté, ni les interactions asynchrones du contrôleur.

## Décision

Le renderer Angular génère six artefacts lisibles : modèles, validation,
décodeur strict, client HTTP, façade d'exécution et API publique. Ils sont liés
à un `artifact-plan` exhaustif, formatés, compilés puis exécutés. Le calcul de
cible relit les octets backend exacts, vérifie leur provenance et refuse les
bindings host inconnus ou non fermés.

L'adaptateur `createActionRequestContext` traduit la politique neutre
`omit|host` vers le token public `SKIP_AUTH` déjà consommé par l'intercepteur
réel. Il ne crée aucun token, client, cache ou mécanisme d'authentification
parallèle.

La validation est exécutée avant `HttpClient`. Elle refuse les champs inconnus,
les emails vides, entourés d'espaces ou invalides. Le décodeur reçoit `unknown`,
contrôle exactement l'enveloppe, ses indicateurs, le message et le DTO wire
avant de construire le résultat métier. Une erreur métier utilise
`ServerResponseError`; une forme inattendue utilise `InvalidPayloadError`; une
erreur HTTP reste celle typée par l'intercepteur du host.

La façade expose les états compilés et applique `reject-while-pending`. Une
seconde soumission échoue sans annuler ni altérer la première. Une nouvelle
tentative efface l'ancien résultat avant validation afin de ne pas présenter une
donnée périmée comme le résultat de la commande courante.

Le renderer accepte exactement la forme active prouvée. Méthodes, paramètres,
media types, champs, politiques, invalidations ou effets post-succès adjacents
échouent fermés.

## Oracle exécutable

Un test natif Angular 22 instancie les artefacts avec `TestBed`,
`HttpTestingController`, le vrai `authInterceptor`, le vrai `errorInterceptor`,
`AUTH_API_URL` et `SKIP_AUTH`. Il vérifie :

- validation avant tout appel HTTP et payload exact ;
- absence de `Authorization` malgré une session active ;
- décodage strict et séparation réponse wire / résultat ;
- erreurs d'enveloppe et HTTP typées ;
- rejet des champs d'entrée et de réponse inconnus ;
- cycle succès → nouvelle tentative et double soumission.

La suite générateur compile les sources produites et exécute 44 tests Angular.
La bibliothèque `core` passe ses 36 tests, son build et son lint. Le build de
production `backoffice-angular` passe également.

## Revue de simplification obligatoire

La surface directe `action-request` v2 atteint **2 436 lignes de production** :
1 777 lignes acquises par ADR-0054, renderer Angular 455, calcul de cible 158,
adaptateur host 21 et 25 lignes nettes pour le catalogue/schema d'artefacts.
Elle comprend six modules exécutables propres à la capacité et son schéma
auteur. Les fichiers de tests et la matérialisation éphémère du harnais ne sont
pas comptés dans cette surface de production.

Cette croissance est acceptée parce que :

- aucun runtime, CLI, journal, verrou, cache ou format persistant n'est ajouté ;
- l'exécution s'appuie sur les ports et intercepteurs existants du host ;
- les six sorties sont des sources Angular ordinaires, éphémères dans l'oracle ;
- le calcul de cible est l'unique chemin validation → compilation → rendu →
  type-check, réutilisable par la future publication ;
- chaque branche non prouvée est refusée au lieu d'être simulée ;
- aucun helper commun avec `list-query` n'est extrait avant le second host : la
  similarité ne suffit pas encore à prouver une abstraction stable.

## Conséquences

### Positives

- Une action publique ne transporte pas le Bearer du host.
- Une entrée invalide ne peut pas atteindre le réseau.
- Les formes wire invalides ne franchissent pas la frontière domaine.
- Les états concurrents et les erreurs restent prévisibles et observables.
- Le code généré reste compréhensible et débogable comme du code Angular
  standard.

### Limites

- Seul le cas public `forgot-password` est réalisé : un email, `POST`, JSON,
  sans paramètre, retry, idempotence, invalidation ou effet post-succès.
- La transition `committed-with-local-error` reste prouvée dans le compilateur,
  pas dans un host réel faute de cas actif correspondant.
- Aucun renderer React ni publisher durable `action-request` v2 n'est livré.
- Le contrat backend reste observé côté client, pas vérifié sur un serveur live.
- La capacité reste `experimental` et ne permet pas encore une page N×N.

## Prochain incrément

Prouver la parité React depuis le même modèle compilé. Le client React devra
déléguer transport, URL et authentification à un port host explicite, sans
recréer les mécanismes Angular. La publication durable ne vient qu'après cette
parité.

## Références

- [ADR-0054](./0054-action-request-v2-modele-execution-commit-safe.md)
- [ADR-0051](./0051-list-query-v2-react-utilise-un-port-hote-explicite.md)
- [Audit Staff `action-request`](../architecture/audit-action-request-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
