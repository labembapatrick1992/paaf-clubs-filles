# Application Android « PAAF Clubs Filles »

Tableau de bord du suivi-évaluation des clubs des filles, installable sur téléphone et tablette Android.
Les données sont téléchargées depuis ce dépôt GitHub, **chiffrées** : sans le mot de passe de l'équipe, elles sont illisibles.

## Contenu du dépôt
- `app/` : l'application (tableau de bord dans `app/src/main/assets/index.html`).
- `.github/workflows/compiler-apk.yml` : GitHub fabrique l'APK automatiquement.
- `donnees/donnees.enc` : les données chiffrées (le seul fichier à changer chaque mois).
- `outils/chiffrer_donnees.py` : le script qui fabrique `donnees.enc`.

**Ne déposez jamais ici** de fichier CSV, d'export SurveyCTO ni de fichier `config_surveycto.ini` : le dépôt est public.

## Mise en place (une seule fois)
1. Créez un compte gratuit sur github.com.
2. Cliquez sur **New repository** : nom `paaf-clubs-filles`, visibilité **Public**, puis **Create repository**.
3. Cliquez sur **uploading an existing file**. Ouvrez le dossier `paaf_app` sur votre ordinateur, sélectionnez **tout son contenu** (y compris le dossier `.github`) et glissez-le dans la page. Cliquez sur **Commit changes**.
4. Vérifiez que le fichier `.github/workflows/compiler-apk.yml` apparaît bien dans le dépôt. S'il manque : **Add file → Create new file**, nom `.github/workflows/compiler-apk.yml`, collez le contenu du fichier, puis **Commit changes**.
5. Onglet **Actions** : « Compiler l'APK » démarre seul (sinon : cliquez dessus, puis **Run workflow**). Attendez la coche verte (5 à 10 minutes).
6. Téléchargez l'APK par ce lien permanent : https://github.com/labembapatrick1992/paaf-clubs-filles/releases/latest/download/PAAF-Clubs-Filles.apk

## Installer sur les téléphones
1. Envoyez `PAAF-Clubs-Filles.apk` par WhatsApp ou e-mail.
2. Sur le téléphone, ouvrez le fichier et autorisez « Installer des applications inconnues » quand Android le demande.
3. Ouvrez « PAAF Clubs Filles ». Pour le premier essai, le mot de passe des données de test est : `PaafTest2026`.

## Mettre vos vraies données (chaque mois)
1. Exportez F1 à F6 depuis SurveyCTO dans `exports_surveycto`, puis lancez `scto_vers_tableau.py` (▶). Il crée `export_tableau/tableau_de_bord.json`.
2. Lancez `chiffrer_donnees.py` (▶), placé dans le même dossier `pont_surveycto`. Première fois seulement : `python -m pip install cryptography` dans le terminal.
   Tapez le **mot de passe de l'équipe** (au moins 8 caractères, toujours le même).
3. Sur GitHub, ouvrez le dossier `donnees`, puis **Add file → Upload files**, déposez le nouveau `donnees.enc` (il remplace l'ancien) et **Commit changes**.
4. Sur les téléphones : bouton **↻ Actualiser**. Comptez quelques minutes avant que GitHub diffuse le nouveau fichier.

Changer le mot de passe : chiffrez avec le nouveau mot de passe et déposez le fichier ; chaque téléphone le redemandera.
Communiquez le mot de passe séparément de l'APK (par exemple par appel ou SMS, pas dans le même groupe WhatsApp).

## Bon à savoir
- L'application garde la dernière version des données : elle s'ouvre même sans connexion.
- Le tableau de bord a 8 rubriques : Vue d'ensemble, Carte des écoles, Mise en œuvre, Les filles, Qualité et supervision, Formation, Résultats, Protection ; avec des filtres par mois, province, milieu, cohorte, tranche d'âge, superviseure et école.
- Le bouton 🔒 efface le mot de passe enregistré sur l'appareil.
- Pour installer une nouvelle version de l'APK plus tard, désinstallez d'abord l'ancienne (les mises à jour mensuelles des données, elles, ne demandent aucune réinstallation).
