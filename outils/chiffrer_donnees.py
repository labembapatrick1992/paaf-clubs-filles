# -*- coding: utf-8 -*-
"""
Chiffre les deux fichiers du tableau de bord pour l'application « PAAF Clubs Filles ».

Entrée  : club_mois.csv et enquete_filles.csv (produits par scto_vers_tableau.py, dossier export_tableau)
Sortie  : donnees.enc, à déposer dans le dossier « donnees » du dépôt GitHub de l'application.

Chiffrement : PBKDF2-SHA256 (200 000 itérations) + AES-256-GCM. Sans le mot de passe, le fichier est illisible.
Utilisez TOUJOURS le même mot de passe d'équipe, sinon les téléphones ne pourront plus l'ouvrir.

Première fois seulement, dans le terminal : python -m pip install cryptography
Utilisation : placez ce fichier dans le dossier pont_surveycto (à côté de scto_vers_tableau.py), puis bouton ▶ de VS Code.
"""
import base64, getpass, json, os, sys
from datetime import datetime, timezone

ITERATIONS = 200_000

def main():
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes
    except ImportError:
        sys.exit("Il manque la bibliothèque « cryptography ». Tapez dans le terminal :\n"
                 "    python -m pip install cryptography\npuis relancez ce script.")

    dossier = os.path.dirname(os.path.abspath(__file__))
    source = sys.argv[1] if len(sys.argv) > 1 else os.path.join(dossier, "export_tableau")
    fichiers = {}
    for nom in ("club_mois", "enquete_filles"):
        chemin = os.path.join(source, nom + ".csv")
        if not os.path.exists(chemin):
            sys.exit(f"Fichier introuvable : {chemin}\nLancez d'abord scto_vers_tableau.py.")
        with open(chemin, encoding="utf-8-sig") as fh:
            fichiers[nom] = fh.read()

    mdp = os.environ.get("PAAF_MOT_DE_PASSE")
    if not mdp:
        mdp = getpass.getpass("Mot de passe de l'équipe (il ne s'affiche pas) : ")
        if len(mdp) < 8:
            sys.exit("Choisissez un mot de passe d'au moins 8 caractères.")
        if getpass.getpass("Retapez-le pour confirmer : ") != mdp:
            sys.exit("Les deux mots de passe sont différents. Rien n'a été écrit.")

    clair = json.dumps({"maj": datetime.now(timezone.utc).isoformat(timespec="seconds"), **fichiers},
                       ensure_ascii=False).encode("utf-8")
    sel, iv = os.urandom(16), os.urandom(12)
    cle = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=sel, iterations=ITERATIONS).derive(mdp.encode("utf-8"))
    chiffre = AESGCM(cle).encrypt(iv, clair, None)
    b64 = lambda b: base64.b64encode(b).decode("ascii")
    sortie = os.path.join(source, "donnees.enc")
    with open(sortie, "w", encoding="ascii") as fh:
        json.dump({"format": "paaf-enc-1", "kdf": "PBKDF2-SHA256", "iter": ITERATIONS,
                   "salt": b64(sel), "iv": b64(iv), "ct": b64(chiffre)}, fh)
    print("OK : fichier chiffré prêt :", sortie)
    print("Déposez-le dans le dossier « donnees » de votre dépôt GitHub (Add file → Upload files).")

if __name__ == "__main__":
    main()
