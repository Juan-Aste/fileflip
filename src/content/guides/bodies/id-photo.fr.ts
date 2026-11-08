const body = `
Passeport, visa, permis de conduire ou démarche en ligne : on vous demande presque toujours la même chose, une photo de face, sur fond clair et à un format précis. Avec votre téléphone, un mur uni et une bonne lumière, vous pouvez la prendre chez vous, la recadrer au bon format et imprimer plusieurs copies sur un seul tirage 10 × 15 cm. Ce guide explique comment faire, et à quoi faire attention pour qu’elle ne soit pas refusée.

## D’abord : quel format vous faut-il

Chaque administration fixe ses propres exigences (format, fond, taille de la tête, lunettes acceptées ou non), et elles changent selon le pays et la démarche. Avant de prendre la photo, consultez les instructions officielles ou renseignez-vous auprès du service concerné. Pour beaucoup de pièces d’identité, la photo est d’ailleurs prise sur place.

Notre outil propose les formats les plus demandés :

| Format | Usage courant |
| --- | --- |
| 3,5 × 4,5 cm | Passeports, cartes d’identité et visas au standard international OACI, comme en France, en Belgique et au Mexique |
| 3 × 4 cm | Brésil (RG, permis) et nombreuses démarches au Chili et en Colombie |
| 4 × 4 cm | Nombreuses démarches en Argentine |
| 2,5 × 3 cm | Le « tamaño infantil » mexicain |
| 2 × 2 pouces (5,1 × 5,1 cm) | Passeport et visa américains |

Si votre démarche exige un autre format, cet outil ne l’a pas : vous pouvez recadrer la photo dans la proportion voulue avec [Recadrer une image](tool:crop-image), puis la mettre aux pixels exacts avec [Redimensionner une image](tool:resize-image).

## Comment prendre la photo avec son téléphone

Ces conseils valent pour presque tous les documents ; les détails dépendent de l’administration.

- **Une lumière égale, de face** : l’idéal est la lumière du jour, face à une fenêtre. Évitez la lumière qui tombe d’en haut (elle creuse les cernes) et celle qui vient d’un seul côté (la moitié du visage dans l’ombre). Le flash direct laisse souvent des reflets sur la peau et une ombre dure sur le mur.
- **Un fond uni et clair** : un mur blanc ou gris clair, sans cadre, porte ni prise derrière vous. Placez-vous à au moins un demi-mètre du mur pour que votre ombre n’y tombe pas.
- **Faites-la prendre par quelqu’un** : appareil à hauteur des yeux, à un mètre ou plus. Un selfie à bout de bras est trop proche et déforme le visage (le nez paraît plus gros). Seul, posez le téléphone sur un support stable et utilisez le retardateur.
- **Une expression neutre** : de face, en regardant l’objectif, bouche fermée, yeux bien ouverts. Ni casquette ni lunettes de soleil, et pas de cheveux sur le visage.
- **Pas de filtre** : désactivez le mode portrait, l’embellissement et les filtres. Beaucoup d’administrations refusent les photos retouchées, et l’outil ne retouche rien non plus.
- **Plusieurs prises** : gardez la plus nette. Inutile de cadrer précisément : laissez de la marge autour de la tête et des épaules, le recadrage vient ensuite.

## Faire une photo d’identité étape par étape

1. Ouvrez [Photo d’identité](tool:id-photo) et choisissez la photo. JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF et HEIC de l’iPhone sont acceptés, jusqu’à 50 Mo.
2. Sous **Format**, choisissez celui qu’on vous demande, par exemple **3,5 × 4,5 cm (passeport, OACI)**.
3. Déplacez le cadre et tirez ses coins pour que la tête soit dans l’ovale et les yeux sur la ligne pointillée.
4. Appuyez sur **Créer la photo**.
5. Téléchargez les deux fichiers avec **Télécharger**, ou ensemble avec **Tout télécharger en ZIP**.

![Une photo illustrée avec le cadre de 3,5 × 4,5 cm et l’ovale guide sur le visage](shot:foto-carnet-encuadrar "Le cadre garde les proportions du format choisi ; l’ovale et la ligne pointillée indiquent où placer la tête et les yeux.")

Tout se passe dans votre navigateur : la photo n’est envoyée à aucun serveur.

Choisissez le format avant de cadrer : quand vous le changez, le cadre se recentre avec les nouvelles proportions et il faut le réajuster.

## Bien cadrer le visage

Le cadre a toujours les proportions du format choisi : impossible de déformer le visage en l’étirant. Pour l’ajuster :

- **Au doigt ou à la souris** : faites glisser le cadre pour le déplacer, et ses coins pour l’agrandir ou le réduire.
- **Au clavier** : les flèches le déplacent, **Maj** + flèches le redimensionnent.
- **En chiffres** : les champs **X**, **Y**, **Largeur** et **Hauteur** (en pixels) servent aux réglages fins.

Le sommet du crâne va près du bord supérieur de l’ovale, le menton sur son bord inférieur. Le plus important est la hauteur, du sommet du crâne au menton : il est normal que les cheveux ou les oreilles dépassent un peu sur les côtés. La ligne verticale aide à vérifier que la tête est centrée et droite.

L’ovale occupe 72 % de la hauteur de la photo : environ 32 mm en 3,5 × 4,5 cm, 29 mm en 3 × 4 et 4 × 4 cm, et 37 mm en 2 × 2 pouces. Si les instructions indiquent la taille de la tête, comparez avec ces chiffres et réduisez ou agrandissez le cadre.

## Les fichiers téléchargés

![Les deux fichiers prêts : la photo seule et la planche 10 × 15 cm avec 8 copies](shot:foto-carnet-resultado "La photo seule à 600 ppp et une planche 10 × 15 cm avec toutes les copies qui tiennent.")

- **La photo seule**, en JPG à 600 ppp (par exemple 827 × 1063 pixels en 3,5 × 4,5 cm). C’est celle à envoyer pour une démarche en ligne ou à imprimer à sa taille réelle.
- **Une planche 10 × 15 cm** à 300 ppp, avec toutes les copies qui tiennent, espacées et entourées de traits de coupe gris : 9 copies en 3 × 4 cm, 6 en 4 × 4 cm, 8 en 3,5 × 4,5 cm, 15 en 2,5 × 3 cm ou 2 en 2 × 2 pouces.

Si la zone cadrée a une résolution trop faible pour une impression nette (moins de 300 ppp), l’outil vous prévient. Cela arrive quand le visage occupe très peu de la photo d’origine : mieux vaut la reprendre de plus près.

## Comment l’imprimer

Apportez la planche dans un laboratoire, une borne photo ou sur une imprimante photo et demandez un tirage 10 × 15 cm, **sans recadrage ni ajustement** : la planche a déjà ce format et les copies sont exactes. Découpez ensuite le long des traits gris, aux ciseaux ou, mieux, au cutter avec une règle.

Pour imprimer la photo seule chez vous, choisissez **taille réelle** ou 100 % dans les réglages de l’imprimante, et non « ajuster à la page » : le fichier porte sa résolution pour sortir au format exact.

## Si le mur n’est pas uni

L’outil recadre et met la photo à l’échelle telle quelle : il ne change pas le fond et ne retouche pas le visage. Sans mur clair sous la main, [Supprimer l’arrière-plan d’une image](tool:remove-background) peut aider : en mode **Personnes (automatique)**, il détecte la personne, et vous téléchargez le résultat sur fond **Blanc** ou d’une autre **Couleur**, en JPG et à la taille de l’original. Ouvrez ensuite ce JPG dans Photo d’identité. Le guide [Comment supprimer l’arrière-plan d’une photo](guide:remove-background) l’explique en détail.

Vérifiez bien le contour des cheveux, et sachez que certaines administrations refusent les photos dont le fond a été remplacé. Si possible, un mur clair reste le plus sûr. Si le fond d’un PNG est transparent, Photo d’identité le remplit de blanc.

## Pour une démarche en ligne

Les sites fixent en général un format de fichier, des dimensions en pixels et un poids maximal. La photo téléchargée est un JPG à 600 ppp :

- S’ils demandent **d’autres dimensions en pixels**, ajustez-la avec [Redimensionner une image](tool:resize-image).
- Si elle **pèse trop lourd**, allégez-la avec [Compresser une image](tool:compress-image).
- Si votre photo est en **HEIC** (iPhone), Photo d’identité l’ouvre directement. S’il vous faut aussi l’original en JPG, le guide [Convertir des photos HEIC en JPG](guide:heic-to-jpg) explique comment.

Les fichiers produits par Photo d’identité sont recréés à partir des pixels : ils ne contiennent pas les données EXIF de la photo d’origine, comme le modèle du téléphone ou la localisation. Si vous envoyez la photo d’origine telle quelle, vous pouvez retirer ces données avec [Supprimer les métadonnées EXIF](tool:remove-exif).

## En résumé

- Vérifiez le format et les exigences auprès de l’administration : ils changent selon le pays et la démarche.
- Prenez la photo de face, sous une lumière égale, devant un mur uni et clair, à un mètre ou plus et sans filtre.
- Dans [Photo d’identité](tool:id-photo), choisissez le format, placez la tête dans l’ovale et les yeux sur la ligne, puis téléchargez.
- Vous obtenez la photo à 600 ppp à envoyer et une planche 10 × 15 cm de copies à imprimer sans ajustement.
- Si le mur ne convient pas, essayez [Supprimer l’arrière-plan d’une image](tool:remove-background), en sachant que certaines administrations refusent les fonds remplacés.
`;

export default body;
