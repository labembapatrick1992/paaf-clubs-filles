# -*- coding: utf-8 -*-
"""
Chiffre le fichier du tableau de bord pour l'application « PAAF Clubs Filles » (version 2).

Entrée  : export_tableau/tableau_de_bord.json (produit par scto_vers_tableau.py)
Sortie  : export_tableau/donnees.enc, à déposer dans le dossier « donnees » du dépôt GitHub de l'application.

Compression (zlib) puis chiffrement PBKDF2-SHA256 (200 000 itérations) + AES-256-GCM.
Sans le mot de passe, le fichier est illisible. Utilisez TOUJOURS le même mot de passe d'équipe.

Première fois seulement, dans le terminal : python -m pip install cryptography
Utilisation : placez ce fichier dans le dossier pont_surveycto (à côté de scto_vers_tableau.py), puis bouton ▶ de VS Code.
"""
import base64, getpass, json, os, sys, zlib

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
    chemin = os.path.join(source, "tableau_de_bord.json")
    if not os.path.exists(chemin):
        sys.exit(f"Fichier introuvable : {chemin}\nLancez d'abord scto_vers_tableau.py (version 2).")
    with open(chemin, encoding="utf-8") as fh:
        donnees = json.load(fh)
    if donnees.get("version") != 2:
        sys.exit("Ce fichier n'est pas au format version 2. Mettez à jour scto_vers_tableau.py et relancez-le.")

    mdp = os.environ.get("PAAF_MOT_DE_PASSE")
    if not mdp:
        mdp = getpass.getpass("Mot de passe de l'équipe (il ne s'affiche pas) : ")
        if len(mdp) < 8:
            sys.exit("Choisissez un mot de passe d'au moins 8 caractères.")
        if getpass.getpass("Retapez-le pour confirmer : ") != mdp:
            sys.exit("Les deux mots de passe sont différents. Rien n'a été écrit.")

    clair = zlib.compress(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")).encode("utf-8"), 9)
    sel, iv = os.urandom(16), os.urandom(12)
    cle = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=sel, iterations=ITERATIONS).derive(mdp.encode("utf-8"))
    chiffre = AESGCM(cle).encrypt(iv, clair, None)
    b64 = lambda b: base64.b64encode(b).decode("ascii")
    sortie = os.path.join(source, "donnees.enc")
    with open(sortie, "w", encoding="ascii") as fh:
        json.dump({"format": "paaf-enc-1", "kdf": "PBKDF2-SHA256", "iter": ITERATIONS, "z": 1,
                   "salt": b64(sel), "iv": b64(iv), "ct": b64(chiffre)}, fh)
    print(f"OK : fichier chiffré prêt ({os.path.getsize(sortie) // 1024} Ko) :", sortie)
    print("Déposez-le dans le dossier « donnees » de votre dépôt GitHub (Add file → Upload files).")

if __name__ == "__main__":
    main()
