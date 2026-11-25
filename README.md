# EquiMoG

Web app installable sur iPhone pour saisir les bilans EquiMoG (début et fin de cycle, 26 items, vitesse de marche, commentaires) et produire un PDF A4 à importer dans Vega.

- Tout est dans `app/` : HTML, CSS et JavaScript, sans framework ni étape de compilation.
- Aucune donnée ne quitte le téléphone (stockage local du navigateur). Pas de serveur, pas de compte.
- Le PDF est créé sur le téléphone avec jsPDF (`app/vendor/`, inclus dans le dépôt, aucun appel externe).
- Fonctionne hors ligne une fois installé (`app/sw.js`).

Mode d'emploi pour l'utilisatrice : [GUIDE.md](GUIDE.md).

## Tester sur le Mac

```bash
python3 -m http.server 8123 --directory app
```

Puis ouvrir http://localhost:8123/?demo (patients fictifs des maquettes, rien n'est enregistré). Sans `?demo`, l'app démarre vide.

## Mettre en ligne

Il suffit d'héberger le dossier `app/` tel quel sur n'importe quel hébergement statique en HTTPS. L'adresse ne doit plus jamais changer ensuite : les bilans sont liés à cette adresse sur l'iPhone.

## Publier une nouvelle version

1. Modifier les fichiers dans `app/`.
2. Augmenter `VERSION` en haut de `app/sw.js` (par exemple `equimog-1.0.1`).
3. Remettre le dossier `app/` en ligne. L'iPhone récupère la nouvelle version à l'ouverture suivante de l'app.

## Structure

- `app/js/questionnaire.js` : la grille des 26 items et le calcul du score (section F inversée).
- `app/js/store.js` : les données (patients, cycles, bilans), la sauvegarde et la restauration.
- `app/js/pdf.js` : la mise en page du PDF.
- `app/js/views/` : les écrans (accueil, nouveau bilan, saisie, récapitulatif, réglages).
