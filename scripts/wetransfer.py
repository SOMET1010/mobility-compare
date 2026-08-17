#!/usr/bin/env python3
"""Télécharge un envoi WeTransfer en ligne de commande (sans dépendances).

Usage : python3 scripts/wetransfer.py <lien we.tl ou wetransfer.com> <destination>
Suit le protocole public du site (page → jeton CSRF → lien direct).
Si l'API du site change, repli : télécharger depuis un navigateur puis
`scp <fichier> root@SERVEUR:/root/donnees/`.
"""

import json
import re
import sys
import urllib.request
from http.cookiejar import CookieJar

def principal() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    url, dest = sys.argv[1], sys.argv[2]

    bocal = CookieJar()
    ouvre = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(bocal))
    ouvre.addheaders = [('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64)')]

    reponse = ouvre.open(url, timeout=60)
    finale = reponse.geturl()
    page = reponse.read().decode('utf-8', 'replace')
    if '/downloads/' not in finale:
        raise SystemExit(f'Lien inattendu après redirection : {finale}')

    jeton = ''
    m = re.search(r'name="csrf-token" content="([^"]+)"', page)
    if m:
        jeton = m.group(1)

    morceaux = finale.split('/downloads/')[1].split('?')[0].strip('/').split('/')
    destinataire = None
    if len(morceaux) == 2:
        transfert, hachage = morceaux
    elif len(morceaux) == 3:
        transfert, destinataire, hachage = morceaux
    else:
        raise SystemExit(f'Format de lien non reconnu : {finale}')

    corps = {'security_hash': hachage, 'intent': 'entire_transfer'}
    if destinataire:
        corps['recipient_id'] = destinataire
    demande = urllib.request.Request(
        f'https://wetransfer.com/api/v4/transfers/{transfert}/download-link',
        data=json.dumps(corps).encode(),
        headers={
            'Content-Type': 'application/json',
            'X-CSRF-Token': jeton,
            'X-Requested-With': 'XMLHttpRequest',
        },
    )
    lien = json.load(ouvre.open(demande, timeout=60)).get('direct_link')
    if not lien:
        raise SystemExit('Pas de lien direct dans la réponse (API changée ?)')

    print('Lien direct obtenu, téléchargement…')
    with ouvre.open(lien, timeout=900) as source, open(dest, 'wb') as sortie:
        total = 0
        while True:
            bloc = source.read(1 << 20)
            if not bloc:
                break
            sortie.write(bloc)
            total += len(bloc)
    print(f'OK : {dest} ({total / 1_048_576:.1f} Mo)')

if __name__ == '__main__':
    principal()
