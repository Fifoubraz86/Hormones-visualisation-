# Consignes d'audit réutilisables

Chemins à adapter : remplacer <REFERENTIEL> par le dossier qui contient p1-pages.txt et p2-pages.txt, et <RAPPORTS> par le dossier des rapports.

## Partie 1 — relecture (lecture seule)

### Consignes communes — audit médical de l'Atlas endocrinien (2e audit, complet)

Projet : /home/user/Hormones-visualisation- (atlas pédagogique zoomable des axes endocriniens, JS/SVG vanilla, interface en français, destiné à des internes d'endocrinologie). Auteur : Philippe Thuillier, endocrinologue.

Référence principale : *Polycopié de sémiologie endocrinienne*, CEEDMM, 2e édition (2023).
Texte intégral, découpé par page PDF (marqueurs « ===== PARTIE x — PAGE PDF n ===== ») :
- <REFERENTIEL>/p1-pages.txt (partie 1)
- <REFERENTIEL>/p2-pages.txt (partie 2)

Règle éditoriale du projet : tout ce qui vient du polycopié peut être affirmé (idéalement avec la page) ; tout le reste doit être marqué « (complément) ». Rien ne doit être inventé ; un chiffre douteux doit être retiré ou marqué.

Décisions déjà prises par l'auteur (ne pas re-signaler) : voir la section « Décisions sur les points à trancher » à la fin de docs/audit.md. Les valeurs des précurseurs surrénaliens et de la testostérone en « × N » (valeurs relatives) sont un choix assumé. Les normes de laboratoire sont présentées comme indicatives.

## Ce que tu fais
1. Lis le code de ton périmètre : textes (HV.INFO, fiches, notes et noms de scénarios, `lead`, `points`, pas à pas `steps`/`HV.spotlight`, interprétations `interpret`, libellés des nœuds et liens, lésions), modèles (`targets`, `labs` et leurs normes, `interpret`), tests dynamiques.
2. Fais tourner les modèles pour vérifier les résultats simulés de CHAQUE scénario : soit dans Node en chargeant les fichiers comme le fait tools/verif/simtest.js (lis-le et réutilise-le, il imprime les labs et l'interprétation de chaque scénario des axes de axes-sim.js), soit avec Playwright (`require('/opt/node-tools/node_modules/playwright')`, `chromium.launch()`, page file:///home/user/Hormones-visualisation-/index.html, cliquer `#warnOk` pour fermer l'avertissement, puis `HV.scenes.<id>.sim` : `setScenario(id)`, `settle()`, `lab(k)`, `interpret()`). Les tests dynamiques sont dans js/tests.js (harnais : tools/verif/testsim.js, à lire avant usage).
3. Confronte chaque affirmation et chaque valeur au polycopié (cherche-la dans p1-pages.txt / p2-pages.txt et note la page PDF), et pour les compléments à tes connaissances des recommandations actuelles (SFE, Endocrine Society, ESC, ATA/ETA, KDIGO… citer la référence).
4. Vérifie aussi : cohérence entre les textes et les valeurs simulées (une note qui dit « < 120 » quand le modèle donne 128), cohérence entre scènes (même notion décrite différemment), mentions « (complément) » manquantes ou abusives, pages citées fausses, unités et conversions (µg/dL ↔ nmol/L ×27,6 pour le cortisol, etc.), orthographe et typographie françaises si flagrant.

## Ce que tu NE fais PAS
- Ne modifie AUCUN fichier du dépôt. Ne commite rien. Tu écris uniquement ton rapport.
- Ne signale pas les choix de présentation purement esthétiques.

## Rapport
Écris ton rapport en Markdown dans le fichier qui t'est indiqué, avec un tableau par gravité :
- **Erreur médicale** : affirmation ou résultat simulé faux, conduite clinique erronée.
- **Imprécision** : inexact, incomplet, non sourcé, « complément » manquant, page fausse.
- **Forme** : rédaction, typographie, cohérence interne sans enjeu médical.

Colonnes : n° | fichier:ligne | texte ou valeur actuels (citation exacte, courte) | problème | source (page PDF du polycopié ou référence) | correction proposée (texte exact prêt à remplacer) | confiance (haute/moyenne/basse).

Termine par une section « Points à trancher par l'auteur » (questions où le polycopié et les recommandations divergent, ou où le choix est pédagogique), et une ligne de synthèse (nombre de constats par gravité). Sois exhaustif mais n'invente pas de problème : chaque constat doit être vérifié dans le code (ligne exacte) et dans la source.
Ton dernier message (rapport au parent) : 10 lignes maximum, la synthèse et le chemin du fichier.

## Partie 2 — application des corrections

### Consignes pour appliquer les corrections de ton rapport

Tu as maintenant le droit de modifier le dépôt /home/user/Hormones-visualisation-, uniquement pour appliquer les constats de TON rapport.

1. Applique tous les constats « Erreur médicale », « Imprécision » et « Forme » de confiance haute ou moyenne dont la correction est sûre. N'applique PAS la section « Points à trancher par l'auteur » (l'auteur décidera par un quiz) ; si un constat de confiance basse ou une refonte lourde te paraît risqué, laisse-le et liste-le.
2. D'autres agents modifient EN MÊME TEMPS les fichiers partagés (js/axes-sim.js, js/axes-data.js, js/axes-steps.js, js/tests.js, js/info.js, js/sheets-molecules.js, js/sheets-organs.js, js/poly-figs.js). Donc :
   - utilise UNIQUEMENT l'outil Edit, avec un old_string court et unique, après avoir relu la zone (Read avec offset) juste avant ; jamais de réécriture complète d'un fichier, jamais de sed/python qui réécrit un fichier partagé ;
   - si un Edit échoue parce que le texte a changé, relis et recommence.
3. Respecte la règle éditoriale : polycopié avec page, sinon « (complément) ». N'invente rien.
4. Après tes modifications : `node --check` sur chaque fichier touché ; refais tourner les scénarios et tests de ton périmètre (mêmes harnais que pour l'audit ; pour la page complète : tools/verif/allscen.js, à lancer avec node depuis le dossier du dépôt) et vérifie qu'aucun scénario n'a changé d'interprétation de façon inattendue. Pour une modification visuelle, fais une capture Playwright et regarde-la (cliquer `#warnOk` après le chargement).
5. Ne commite pas, ne pousse pas.
6. Ajoute à la fin de ton rapport une section « Corrections appliquées » (n° du constat → fait / non fait et pourquoi), puis rends un compte rendu de 10 lignes maximum.
