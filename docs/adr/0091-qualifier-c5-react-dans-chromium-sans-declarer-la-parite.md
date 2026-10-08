# ADR-0091 — Qualifier C5 React dans Chromium sans déclarer la parité

- **Statut :** Accepted
- **Date :** 2026-10-08
- **Décideurs :** équipe plateforme CMZ

## Contexte

ADR-0090 a relié la première surface C5 React à sa composition générée et à son
host, mais uniquement sous compilation, build, lint et tests DOM. Le prochain
seuil exigeait un vrai navigateur, axe, des mesures de réseau et de cycle de
vie, ainsi que des rendus Compact, Medium et Expanded.

Une capture ne suffit toutefois pas à prouver une interface. Elle ne démontre ni
le transport exact, ni les permissions, ni le focus, ni les erreurs, ni la
destruction des ressources. Inversement, rendre une suite Playwright verte ne
permet pas de déclarer une parité visuelle quand une inspection humaine révèle
encore des écarts avec l'autorité C5 active.

## Décision

La surface C5 React reçoit un harnais Playwright propre à l'application, mais
extérieur aux fichiers du shell généré. Il utilise :

- le build de production réel servi par le serveur statique allowlisté ;
- un host navigateur installé avant le bootstrap React ;
- une API locale déterministe derrière le vrai port `request` du host ;
- Chromium, un worker, zéro retry et aucun service externe ;
- `axe-core` sur la page, le panneau de filtres et le dialogue ;
- des mesures de géométrie, de débordement, de ressources et d'erreurs console ;
- un profil CDP séparé du smoke de PR pour la mémoire et le DOM.

Le smoke de PR couvre les contrats observables suivants :

1. deux GET au montage et aucun POST implicite ;
2. recherche, filtres appliqués et rafraîchissement avec paramètres wire exacts
   ;
3. refus de création sans permission avant le réseau ;
4. validation locale et focus sur le premier champ invalide ;
5. POST exact, fermeture, notification, restitution du focus et un seul GET
   d'invalidation après succès ;
6. conservation du dialogue et des valeurs après une erreur métier ;
7. zéro violation axe WCAG automatisable dans les surfaces testées ;
8. absence de débordement global à 320 CSS px et sous texte à 200 % ;
9. géométrie vérifiée à 390×844, 900×900 et 1440×900 ;
10. budget navigateur initial `script + style <= 512 KiB`.

Les captures `ready`, `filters-open` et `create-open` sont produites pour les
trois fenêtres, soit neuf candidats. Elles sont publiées comme artefacts de PR
pendant sept jours. Elles ne sont ni committées comme exemples génériques, ni
promues automatiquement en baselines. Une décision humaine explicite reste
nécessaire.

Le profil nightly exécute 30 cycles d'échauffement puis 100 cycles de montage et
destruction du dialogue. Trois campagnes locales indépendantes ont mesuré :

- `1 document`, `372 nœuds` et `169 listeners`, strictement constants ;
- une croissance du heap de 225 à 227 KiB sur 100 cycles ;
- 35 à 36 KiB sur le dernier quart.

Les budgets bloquants sont fixés à 512 KiB au total et 128 KiB sur le dernier
quart. Ils laissent plus de deux et trois fois la variance observée sans masquer
une rétention significative. Le profil JSON est conservé trente jours par le
nightly.

## Défauts découverts et corrigés

La première exécution a trouvé deux défauts de produit réels :

- la région tabulaire défilable n'était pas atteignable au clavier ; elle est
  désormais une région nommée, focusable et dotée d'un focus visible ;
- le reset Tailwind annulait la marge automatique du dialogue. La géométrie
  active d'ADR-0081 est désormais explicite : plein écran en étroit, centrée en
  régulier et large, avec une colonne puis deux au maximum selon l'espace.

Le correctif de page reste soumis au work order C5. Le harnais, ses données et
la CI n'entrent pas dans l'allowlist de réalisation et ne peuvent pas modifier
le contrat métier.

## Verdict et limites visibles

La preuve navigateur automatisable est acquise, mais la parité produit M4 ne
l'est pas. L'inspection des candidats conserve trois écarts C5 Compact :

- pagination explicite au lieu du chargement progressif silencieux d'ADR-0075 ;
- panneau de filtres en une étape au lieu du parcours modal à deux niveaux
  d'ADR-0073 ;
- action de création compacte intégrée à la toolbar au lieu du FAB C5 approuvé.

Ces écarts ne sont ni ignorés, ni transformés en attentes de test. Ils forment
la prochaine tranche de réalisation React et devront passer par un nouveau work
order. Les références génériques de mise en page ne deviennent pas une autorité
métier pour les combler.

Restent également humains : revue des neuf candidats, VoiceOver/NVDA et zoom
navigateur multi-OS. Une lecture live SEOS demeure opt-in et séparée de la CI
hermétique.

## Conséquences

- Toute modification de la surface React C5 déclenche désormais le smoke
  navigateur en PR.
- Les captures et la preuve JSON sont disponibles pour une revue réelle sans
  alourdir durablement Git.
- Le profil coûteux de fuite reste nightly, pas dans chaque PR.
- La matrice reste M3 tant que les écarts Compact et la revue humaine ne sont
  pas fermés.
- Aucun package, store, client de query, formulaire ou widget n'est ajouté.

## Références

- [ADR-0073 — Filtrage adaptatif](./0073-filtrage-adaptatif-par-panneau-unique.md)
- [ADR-0075 — Chargement progressif compact](./0075-chargement-progressif-mobile-silencieux.md)
- [ADR-0081 — Surface de création selon la tâche](./0081-surface-creation-selon-tache-et-espace-utile.md)
- [ADR-0090 — Surface C5 React gouvernée](./0090-realiser-surface-c5-react-par-work-order.md)
- [Profil plateforme React](../architecture/react-platform-profile.md)
