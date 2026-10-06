# Politique de tests live React contre SEOS

> Cette politique encadre l'usage futur des services de test SEOS. Elle
> n'autorise aucun appel réseau et ne remplace pas la configuration runtime de
> l'[ADR-0007](../adr/0007-configuration-runtime.md).

## 1. Pourquoi séparer cette politique du profil React

Les services SEOS sont utiles pour détecter une divergence entre nos contrats
et un backend réel. Ils ne définissent ni l'architecture générique, ni le
transport d'une nouvelle application, ni la disponibilité de la CI.

Le backend pourra être Laravel, Spring Boot, .NET, Django ou autre. La cible
React dépend d'un contrat HTTP observé et de son `FetchPort`, jamais d'une
technologie serveur ni d'un domaine SEOS codé dans la présentation.

## 2. Autorité de configuration

Les URL de test déjà communiquées existent dans les exemples opérationnels du
`Dockerfile`. Les noms de variables et la forme de la configuration sont
définis par `deploy/env.template.js.in`. Ces fichiers et ADR-0007 sont la source
opérationnelle ; ce document ne recopie pas les URL afin d'éviter une seconde
vérité qui divergerait.

Règles :

- les URL sont injectées au runtime via les variables `CMZ_*` ;
- aucun composant, hook ou client généré ne contient une URL d'environnement ;
- aucun secret, jeton, compte ou donnée personnelle n'est versionné ;
- la configuration est validée avant le premier appel ;
- la même construction est promue entre environnements.

## 3. Trois niveaux de preuve

| Niveau                    | Réseau             | Quand                            | Autorité                              |
| ------------------------- | ------------------ | -------------------------------- | ------------------------------------- |
| PR hermétique             | interdit           | chaque changement                | bloquant                              |
| live lecture seule        | opt-in             | manuel ou nightly contrôlé       | diagnostic, puis gate séparée décidée |
| live mutation/destruction | environnement isolé | campagne explicitement autorisée | jamais implicite                      |

### 3.1 PR hermétique

La PR utilise le serveur déterministe local et des fixtures contractuelles. Elle
doit couvrir succès, erreurs, latence, annulation, retry, pagination,
invalidation et réponses malformées sans dépendre d'Internet.

Un test live ne remplace jamais cette preuve : un backend disponible peut
masquer un cas limite, et un backend indisponible ne doit pas rendre un diff
innocent impossible à fusionner.

### 3.2 Live lecture seule

Une campagne live commence par des opérations idempotentes et non sensibles.
Elle vérifie seulement ce que le mock ne peut pas prouver : TLS, CORS,
authentification réelle, chemins, encodage, forme wire et compatibilité
déployée.

Elle est déclenchée explicitement, utilise un compte de test minimal et produit
un rapport assaini. Son échec doit distinguer au moins : contrat incompatible,
authentification refusée, réseau/DNS, certificat/TLS, CORS, timeout, quota et
service indisponible.

### 3.3 Live avec mutations

POST, PUT, PATCH et DELETE exigent :

- un environnement et un tenant dédiés ;
- des données synthétiques identifiables et non personnelles ;
- un identifiant de campagne unique ;
- une stratégie de nettoyage vérifiée ;
- l'idempotence ou une clé de déduplication lorsqu'elle existe ;
- un compte de moindre privilège ;
- une autorisation explicite pour la campagne.

Un nettoyage `finally` n'est pas une garantie suffisante. Les ressources
abandonnées doivent être détectables et supprimables par une procédure séparée.

## 4. Frontières de sécurité

- Les secrets viennent du coffre CI ou de l'environnement local, jamais d'un
  fichier suivi.
- Les logs excluent `Authorization`, cookies, tokens, mots de passe, payloads
  personnels et réponses complètes non nécessaires.
- Une erreur affiche la classification et un identifiant de corrélation, pas le
  secret ni la donnée brute.
- Les appels ont timeout et annulation. Les retries sont bornés, avec backoff,
  uniquement sur erreurs transitoires et opérations sûres.
- Aucun retry aveugle d'une mutation sans preuve d'idempotence.
- Le job live possède une concurrence bornée et n'est pas lancé depuis une
  contribution non approuvée avec secrets.
- Les artefacts de preuve sont assainis avant publication.

## 5. Contrat de comparaison

La campagne ne valide pas « la réponse semble correcte ». Chaque assertion se
rattache à :

- une opération et une version de contrat ;
- la base runtime utilisée, sans secret ;
- la requête assainie ;
- la cardinalité attendue (`one`, `many`, `page` ou forme explicitée) ;
- les statuts et erreurs connus ;
- la normalisation appliquée ;
- les effets post-succès déclarés ;
- l'horodatage et le commit testé.

Une différence inconnue arrête la promotion du contrat. Elle ne déclenche pas
une heuristique de compatibilité dans le renderer.

## 6. Séquence d'introduction

1. Produire le vertical slice React sur le mock déterministe.
2. Lister les observations impossibles à obtenir localement.
3. Écrire un test live lecture seule, désactivé par défaut.
4. L'exécuter manuellement avec configuration et compte de test.
5. Mesurer stabilité, durée, valeur et taux d'échec externe.
6. Décider séparément son éventuelle place dans le nightly.
7. N'autoriser une mutation qu'après environnement isolé et cleanup prouvé.

Cette séquence empêche un service SEOS de devenir une dépendance cachée du
développement React ou de la CI générale.

## 7. Conditions de promotion en nightly

Un test live peut rejoindre un workflow planifié seulement si :

- sa valeur marginale face au mock est documentée ;
- son propriétaire et sa procédure d'incident sont connus ;
- ses secrets, permissions et logs ont été revus ;
- son échec externe est classifié séparément d'une régression code ;
- sa durée et sa fiabilité sont mesurées ;
- il ne bloque pas arbitrairement les PR ordinaires ;
- une commande locale de reproduction sûre existe.

Le nightly reste un observateur d'intégration. Il ne devient pas la première
ligne de détection d'une règle qui peut être prouvée hermétiquement.

## 8. État courant

- Les bases SEOS de test sont connues par la configuration opérationnelle.
- Aucun credential n'a été fourni ou demandé.
- Aucun appel live n'est effectué par ce lot documentaire.
- Aucun test live React n'est encore promu.
- La prochaine étape reste le vertical slice hermétique ; elle précède toute
  campagne réelle.
