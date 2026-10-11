# Sécurité des preuves Playwright

**Statut :** garde courant

**Version vérifiée :** `@playwright/test` 1.63.0

**Périmètre :** configurations Playwright suivies par Git

## Risque traité

Le plugin `webServer` de Playwright ajoute nativement `process.env` à
l'environnement du processus qu'il lance. Recopier `...process.env` dans
`webServer.env` est donc inutile pour faire fonctionner le serveur.

En revanche, les reporters JSON et blob officiels incluent la configuration
`webServer` dans leur résultat. Une copie explicite de l'environnement y rend
persistants les jetons et secrets présents dans le processus qui lance
Playwright. Un rapport local, un artefact ou un handoff peut alors diffuser ces
valeurs sans qu'un test échoue. Dans Playwright 1.63.0, le reporter HTML ne
publie que `metadata` depuis la configuration : l'artefact HTML n'est pas le
vecteur de cette fuite précise par `webServer.env`.

## Règle

`webServer.env` contient uniquement les overrides fonctionnels publics dont le
serveur a besoin, par exemple un port ou un nom d'application. Il ne recopie
jamais l'environnement complet.

Playwright conserve malgré tout son comportement normal : au démarrage réel du
serveur, il fusionne ses variables par défaut, l'environnement du processus et
les overrides explicites de `webServer.env`. Cette règle ne retire donc aucune
variable au serveur ; elle empêche seulement leur présence dans la configuration
sérialisable.

Si une future configuration doit publier explicitement une valeur héritée dans
`webServer.env`, le changement s'arrête pour une revue sécurité. Un secret ne
doit jamais y être placé.

## Garde automatisé

`bun run check:playwright-secret-safety` :

1. découvre avec Git toutes les configurations suivies nommées
   `playwright.config.*`, `playwright.<profil>.config.*` ou
   `playwright-<profil>.config.*`, y compris le nom officiel
   `playwright-ct.config.ts` ;
2. refuse le spread historique `...process.env` ;
3. résout ses blocs `webServer`, puis charge chaque configuration avec le
   reporter JSON officiel et `--list` ;
4. injecte seulement une sentinelle synthétique dans ces deux environnements
   enfants fermés ;
5. vérifie séparément si cette sentinelle atteint un bloc `webServer` résolu ou
   la sortie du reporter JSON ;
6. vérifie la surface actuelle de quatre profils principaux et cinq blocs
   `webServer`, tout en inspectant aussi les trois profils mémoire dérivés.

Le mode `--list` collecte les tests mais ne les exécute pas : aucun serveur ni
navigateur n'est démarré. Les fixtures propre et mutée utilisent un script de
faux serveur. Chaque test exécute d'abord sa commande hors Playwright, constate
la création du marqueur, le retire, puis vérifie que les deux inspections
Playwright ne le recréent pas.

Playwright 1.63.0 publie `webServer: null` dans le reporter JSON lorsqu'une
configuration contient plusieurs serveurs. La résolution synthétique séparée
empêche cet angle mort : les deux serveurs du backoffice sont inspectés même si
le reporter officiel ne les restitue pas.

Un échec de collecte restitue la première cause structurée dans
`errors[].message` du reporter JSON, avec une longueur bornée, au lieu de
masquer le défaut sous un simple code de sortie. Les processus Git, résolution
de configuration et reporter portent aussi des délais explicites ; le job CI
`guardrails` est plafonné à 30 minutes.

## Limites et échec fermé

- La sentinelle démontre une copie globale de l'environnement, notamment un
  spread ou un alias global. Elle ne couvre pas une variable nommée copiée
  seule, une sélection filtrée ni une branche conditionnelle qui n'est pas
  empruntée avec `CI=1`. Ces formes exigent toujours une revue humaine.
- La recherche statique du spread parcourt le texte complet, commentaires
  inclus. Une mention en commentaire peut donc produire un faux positif en échec
  fermé ; la sentinelle reste la preuve comportementale.
- Toute configuration Playwright suivie sans `webServer` est refusée. Avant
  d'introduire un profil qui n'en a volontairement pas, il faut faire évoluer et
  relire le contrat du garde au lieu de le laisser ignorer silencieusement cette
  nouvelle catégorie.
- L'entrée supportée est `bun run check:playwright-secret-safety`, qui lance les
  tests avec `node --test`. Le garde utilise `process.execPath` comme runtime
  Node ; lancer directement le fichier avec `bun test` n'est pas un claim
  supporté.

Le garde est une barrière de non-régression, pas un nettoyeur de rapports déjà
produits. La rotation d'un jeton exposé et la suppression ou le caviardage des
preuves historiques restent des opérations séparées.

## Vérification locale

```bash
bun run check:playwright-secret-safety
bun run check:ci-wiring
bun run check:secrets -- --no-git
```

Les suites E2E ordinaires restent les preuves que les vrais webservers
fonctionnent. Le garde de sécurité prouve que la copie globale observée ne
rejoint plus leurs blocs sérialisables ni la sortie JSON exercée ; il ne prouve
pas l'absence de toute transmission ciblée imaginable.
