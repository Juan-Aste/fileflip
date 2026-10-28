const body = `
JPG, PNG, WebP et AVIF font tous la même chose, enregistrer une image, mais chacun répond à un problème différent. Se tromper de format a des conséquences bien concrètes : une photo enregistrée en PNG qui pèse dix fois trop, un logo en JPG avec des bavures autour des lettres, ou une image AVIF refusée par un formulaire administratif. Ce guide vous aide à choisir à partir de chiffres mesurés avec nos propres outils, et non de généralités.

## La réponse courte

- **Photos à envoyer, à déposer sur un formulaire ou à imprimer** : JPG. Absolument tout sait l'ouvrir.
- **Captures d'écran, logos, graphiques ou images à fond transparent** : PNG.
- **Images pour un site web** : WebP, ou AVIF si vous voulez le fichier le plus léger possible.
- **Si vous ne savez pas quel logiciel ou quelle personne ouvrira le fichier** : JPG pour les photos et PNG pour tout le reste.

La suite du guide explique pourquoi et montre de combien le poids du fichier varie dans chaque cas.

## Ce qui distingue chaque format

**JPG** (ou JPEG) utilise une compression avec perte : il supprime des détails que l'œil remarque à peine et obtient des fichiers légers à partir de photos. C'est le format le plus compatible qui soit, mais il ne gère pas la transparence et, autour des contours nets comme les lettres ou les traits fins, la compression laisse de petites bavures. Chaque nouvel enregistrement d'un JPG lui fait perdre encore un peu de qualité.

**PNG** ne perd rien : l'image qui en sort est exactement celle qui y est entrée, pixel par pixel. Il gère la transparence et garde des contours nets, ce qui en fait le format naturel des captures d'écran et des logos. Le prix à payer, c'est le poids : pour une photo, un PNG est énorme.

**WebP** est un format plus moderne qui compresse avec ou sans perte et gère la transparence. Pour les photos, il est un peu plus léger qu'un JPG de qualité comparable, et tous les navigateurs actuels l'ouvrent. Certains logiciels de bureau et certains sites ne l'acceptent pas encore.

**AVIF** est le plus récent des quatre. Il compresse nettement mieux que JPG et WebP, gère la transparence et les navigateurs actuels l'ouvrent, mais il est plus long à créer et moins de logiciels et de formulaires l'acceptent.

## Ce que nous avons mesuré sur une photo

Nous avons pris une photo de la NASA du domaine public, l'avons ramenée à la taille d'une photo de téléphone (12 mégapixels, 3024 × 4032) et enregistrée en JPG de 2,4 Mo. Nous l'avons ensuite convertie avec notre convertisseur (celui qui fait tourner [JPG en AVIF](conv:jpg-avif)) dans chaque format, avec la qualité par défaut (82 sur 100) :

| Format | Poids | Par rapport au JPG |
| --- | --- | --- |
| JPG | 822 Ko | — |
| WebP | 763 Ko | 7 % plus léger |
| AVIF | 329 Ko | 60 % plus léger |
| PNG | 23,4 Mo | 28 fois plus lourd |

En regardant la photo entière à l'écran, impossible de les distinguer. Avec un zoom à 100 %, l'AVIF adoucit certains détails fins dans les zones sombres (le feuillage, sur cette photo) ; le JPG et le WebP les conservent un peu mieux. Pour une photo destinée à être vue sur un téléphone ou une page web, cette différence n'a pas d'importance ; pour une photo que vous allez recadrer ou imprimer en grand format, si.

Le PNG est l'exemple à ne pas suivre : il enregistre chaque pixel sans perte, y compris le bruit naturel de la photo, et finit plus lourd que le JPG de départ.

Nous avons aussi chronométré sur un ordinateur de bureau : le JPG et le WebP ont pris environ 3 secondes, l'AVIF 7,5. Sur un téléphone, tout est plus long, et avec l'AVIF cela se sent.

## Ce que nous avons mesuré sur une capture d'écran

Avec une capture d'écran de notre site (texte, icônes et aplats de couleur, 2560 × 1600 pixels), le résultat s'inverse. Le PNG produit par le navigateur pesait 363 Ko ; converti en JPG, il pesait 184 Ko, en WebP 117 Ko et en AVIF 68 Ko.

Les formats avec perte sont plus légers, mais dans une capture d'écran, le contour des lettres est justement ce que la compression avec perte abîme le plus : zoomez et vous verrez des halos autour du texte. Si la capture doit servir à documenter quelque chose, pour un tutoriel ou pour que quelqu'un lise ce qu'elle contient, gardez-la en PNG. Si elle est destinée à un site où le poids compte, le WebP est un bon compromis.

## La transparence : quand le format s'impose

Si l'image a un fond transparent, comme un logo à poser sur une autre couleur, une signature détourée ou une image dont vous avez [supprimé l'arrière-plan](tool:remove-background), **ne l'enregistrez pas en JPG**. Le JPG ne gère pas la transparence : notre convertisseur remplit le fond de blanc et, si vous posez ensuite l'image sur un fond sombre, un rectangle blanc apparaît.

Pour la transparence, utilisez le PNG si l'image va dans un document ou un autre logiciel, et le WebP ou l'AVIF si elle va sur une page web.

## La compatibilité : qui ouvre chaque format

- **JPG et PNG** : n'importe quel ordinateur, téléphone, logiciel, imprimante, réseau social ou formulaire.
- **WebP** : tous les navigateurs actuels et la plupart des réseaux sociaux. Certains logiciels de retouche anciens et certains formulaires en ligne ne l'acceptent pas.
- **AVIF** : les navigateurs actuels. Beaucoup de logiciels et de formulaires ne le reconnaissent pas encore.

Une règle pratique : si le fichier vous échappe (vous l'envoyez par e-mail, quelqu'un d'autre le dépose sur un formulaire, un imprimeur l'imprime), utilisez JPG ou PNG. Les formats récents brillent quand vous maîtrisez l'endroit où ils s'affichent, comme votre propre site.

## Comment convertir d'un format à l'autre

1. Ouvrez le convertisseur (par exemple [JPG en WebP](conv:jpg-webp) ou [PNG en JPG](conv:png-jpg)) et faites-y glisser une ou plusieurs images.
2. Choisissez le format de sortie.
3. Si vous le souhaitez, ouvrez **Options** pour régler la qualité ou réduire la taille de l'image. Une qualité plus faible donne un fichier plus léger.
4. Appuyez sur **Convertir** et téléchargez chaque image, ou toutes ensemble dans un ZIP.

![Le convertisseur d'images avec une photo prête à être convertie](shot:formatos-convertir "Les images sont converties dans votre navigateur : elles ne sont jamais envoyées sur un serveur.")

La conversion se fait dans votre propre navigateur : les photos ne quittent jamais votre appareil. Vous pouvez convertir jusqu'à 50 images à la fois.

## Si vous voulez surtout un fichier plus léger

Changer de format est une façon de réduire le poids, mais pas la seule. Si un formulaire exige une photo de moins de 200 Ko, [Compresser une image](tool:compress-image) vous permet de fixer ce poids exact : l'outil cherche la meilleure qualité qui tient dans la limite et, si cela ne suffit pas, réduit les dimensions de l'image. Vous pouvez aussi la [redimensionner](tool:resize-image) en pixels : une photo de 12 mégapixels dépasse largement ce qu'il faut pour l'afficher sur un écran, et la ramener à 2000 pixels de large réduit davantage le poids que n'importe quel changement de format.

Si vos photos viennent d'un iPhone au format HEIC, il faut d'abord les convertir en JPG, le format qu'acceptent presque tous les formulaires. Le guide [Comment convertir les photos HEIC de l'iPhone en JPG](guide:heic-to-jpg) explique comment faire.

## En résumé

- Une photo qui doit pouvoir aller partout : **JPG**.
- Capture d'écran, logo, graphique ou transparence : **PNG**.
- Votre propre site : **WebP**, ou **AVIF** pour le poids le plus faible.
- N'enregistrez jamais une photo en PNG ni un logo transparent en JPG.
- Pour un poids de fichier précis, utilisez Compresser une image plutôt que d'essayer plusieurs formats.
`;

export default body;
