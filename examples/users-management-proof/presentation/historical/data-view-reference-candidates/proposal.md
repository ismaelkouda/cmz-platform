# Archive historique — anciennes maquettes de vue de données C5

- **Statut :** historique, retiré le 2026-10-03
- **Autorité :** aucune (`none`)
- **Page d'origine :** `page_6666666666666666`
- **Route d'origine :** `/settings-security/users`
- **Inventaire vérifiable :** [`archive.json`](./archive.json)
- **Décision courante :**
  [ADR-0078](../../../../../docs/adr/0078-vues-de-donnees-par-capacites-optionnelles.md)
- **Autorité de réalisation courante :**
  [`c5-adapt11c-autorite-accessibilite-mise-en-page-2026-10-02.md`](../../../../../docs/architecture/c5-adapt11c-autorite-accessibilite-mise-en-page-2026-10-02.md)

> **Interdiction d'autorité :** aucun fichier de ce dossier ne peut être utilisé
> comme preuve de présentation active, baseline visuelle, instruction de
> génération, contrat de capacité ou source de code runtime. Le dossier conserve
> une étape de conception pour traçabilité seulement.

## Pourquoi ces références ont été retirées

Les six images ont été utiles pour discuter de la géométrie générale d'une vue
de données. Elles ne constituent toutefois pas une référence sûre pour un humain
ou un LLM :

1. elles regroupent dans une même image un noyau de table et des capacités
   optionnelles (`Exporter`, actions de ligne) absentes du contrat C5 ;
2. leurs variantes nommées `medium` mesurent `1448 × 1086` et ne prouvent donc
   pas un comportement Medium ;
3. l'état générique `ready` ne décrit ni les capacités requises ni la région de
   l'image qui fait autorité ;
4. la toolbar historique place la recherche à gauche, alors que l'autorité
   courante place le titre de table à gauche et regroupe recherche et commandes
   à droite ;
5. le HTML de reproduction est une maquette visuelle, pas une implémentation
   Angular accessible : pseudo-table en `div`, contrôles non opérables,
   défilement simulé, cibles trop petites et contrastes insuffisants.

Leur publication dans
`designs/users-management-proof.presentation-evidence.json` a donc été retirée.
L'oracle dédié échoue si un chemin `presentation/historical/` revient dans ce
manifeste actif.

## Intentions encore utiles, mais non exécutables

Les idées suivantes peuvent alimenter une future phase de conception. Elles
doivent être redémontrées dans une nouvelle référence active, séparée par
capacité et conforme aux contrats courants :

- filtres de colonne synchronisés avec le panneau détaillé ;
- mise en évidence d'un filtre actif sans dépendre de la couleur seule ;
- panneau borné entre le haut de la zone de données et le rail horizontal ;
- zone d'actions de ligne optionnelle distincte du contenu défilant ;
- première colonne de rang uniquement lorsque le produit la demande ;
- total des résultats associé au titre de la vue.

Ces intentions ne justifient pas à elles seules l'ajout d'une action, d'un
endpoint, d'une permission ou d'une dépendance.

## Conditions d'une future référence active

Une nouvelle preuve doit être reconstruite depuis l'autorité courante et non
depuis ce HTML. Elle doit :

- séparer le noyau de vue, le panneau de filtres, les actions de ligne et
  l'export en références conditionnées par leurs capacités ;
- employer des états précis (`filters-open`, `filters-closed`, etc.), jamais un
  `ready` qui masque plusieurs situations ;
- déclarer le périmètre visuel faisant autorité et la base de mise en page
  réellement testée (viewport, conteneur ou composant) ;
- prouver les classes Compact, Medium et Expanded avec des conteneurs
  réalistes ;
- utiliser les primitives Angular/CDK/Material officielles avant tout
  comportement custom ;
- satisfaire les oracles clavier, focus, sémantique, contraste,
  redimensionnement et défilement du runtime.

## Conservation et intégrité

`archive.json` fixe le statut `historical`, l'autorité `none`, les usages
interdits, les intentions retenues, les dimensions et les SHA-256 des six PNG,
du HTML et du script de rendu. Le test
`users-management-proof-data-view-references.test.mjs` vérifie ce manifeste, les
hashes et l'absence totale de publication active.

Le script de rendu reste conservé pour l'archéologie. Son exécution ne promeut
jamais les sorties et ne modifie aucune autorité du dépôt.
