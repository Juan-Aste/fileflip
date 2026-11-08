const body = `
Une photo de produit sur fond blanc fait plus soignée dans une boutique en ligne ; un portrait détouré sert pour un CV, un badge ou une photo de profil ; un objet ou un logo sans arrière-plan se pose sur n’importe quelle maquette. Ce guide explique comment supprimer l’arrière-plan d’une photo gratuitement et sans l’envoyer sur aucun serveur, quand utiliser chaque mode de l’outil, comment corriger les contours et quel format télécharger selon l’usage de l’image.

## Quel mode choisir : personnes ou objets

[Supprimer l’arrière-plan d’une image](tool:remove-background) propose deux modes, et c’est ce choix qui compte le plus pour le résultat :

- **Personnes (automatique)** : pour les portraits, les selfies et les photos d’une ou plusieurs personnes. Dès que vous choisissez la photo, un modèle d’intelligence artificielle (MediaPipe Selfie Segmenter, de Google) repère la personne et supprime le fond tout seul. La première fois, environ 4 Mo sont téléchargés depuis Fileflect (ils restent ensuite dans le cache du navigateur), et WebGL est nécessaire. Il ne reconnaît que les personnes : s’il n’y a pas de personne nette sur la photo, il vous prévient et propose **Utiliser le mode rectangle**.
- **Objets et produits (rectangle)** : pour tout le reste, comme un produit posé sur une table, un objet, un logo photographié ou un animal. Vous encadrez le sujet avec un rectangle et une méthode classique (GrabCut, sans aucun modèle) sépare ses couleurs de celles du fond. Rien n’est téléchargé, et cela marche mieux quand les couleurs du sujet se distinguent du fond.

Dans les deux modes, la photo est traitée dans votre navigateur : ni la photo ni le résultat ne quittent votre appareil.

## Supprimer l’arrière-plan étape par étape

Voici la marche à suivre pour une photo de produit ; avec une personne, c’est pareil, sauf que le premier détourage se fait tout seul et qu’il n’y a pas de rectangle.

1. Ouvrez [Supprimer l’arrière-plan d’une image](tool:remove-background), choisissez le mode **Objets et produits (rectangle)** puis la photo.
2. Ajustez le rectangle sur la **Photo d’origine** pour qu’il entoure l’objet avec un peu de marge. Tout ce qui est à l’extérieur est supprimé.
3. Regardez le **Résultat**. S’il reste du fond, choisissez **Pinceau : supprimer** et peignez dessus ; si une partie de l’objet a disparu, choisissez **Pinceau : garder** et peignez dessus. Le détourage est recalculé après chaque trait.
4. Sous **Arrière-plan**, choisissez **Transparent**, **Blanc** ou **Couleur**, et sous **Format**, PNG, WEBP ou JPG.
5. Appuyez sur **Supprimer l’arrière-plan** et téléchargez l’image. Elle garde la taille d’origine et son nom se termine par « -sans-fond ».

![Une tasse photographiée sur une table, encadrée par le rectangle, et le résultat sans fond sur le damier](shot:quitar-fondo-producto.fr "Le rectangle délimite l’objet ; à droite, le résultat avec un fond transparent sur le damier.")

La ligne d’état indique quelle part de la photo est conservée (par exemple « Détourage prêt : 15 % de la photo est conservé. »). Si le chiffre est bien plus élevé que prévu, il reste sans doute une partie du fond.

## Corriger les contours

Un détourage automatique est rarement parfait du premier coup. L’outil a deux sortes de pinceaux, qui ne font pas la même chose :

- **Pinceau : garder** et **Pinceau : supprimer** sont des indications : ils disent à la méthode « ceci est le sujet » ou « ceci est le fond », et le détourage est recalculé à partir de là. Ils servent pour les grandes zones, comme une étiquette de la même couleur que le mur ou une ombre collée à l’objet. Un trait qui traverse la zone suffit, inutile de la remplir.
- **Gomme** et **Restaurer** modifient exactement les pixels que vous peignez, sans rien recalculer. Ils servent pour les détails : des restes dans les coins, le creux de l’anse d’une tasse, l’espace entre les doigts. Vous pouvez régler le **Bord du pinceau** : **Doux** pour des bords naturels ou **Net** pour des coupes franches.

Pour travailler avec précision, zoomez (molette de la souris, pincement à deux doigts ou boutons, jusqu’à 800 %) et déplacez-vous en maintenant la barre d’espace, avec **Main (déplacer)** ou en glissant à deux doigts. Les touches [ et ] changent la **Taille du pinceau**, et **Annuler** et **Rétablir** (Ctrl + Z et Ctrl + Y) parcourent toutes les étapes.

Une astuce utile : sous **Voir sur**, passez l’aperçu en **Noir** ou **Magenta**. Sur une couleur vive, les restes clairs et le halo de l’ancien fond sautent aux yeux, alors qu’ils passent inaperçus sur le damier. Cela ne change que l’aperçu, pas l’image téléchargée.

Gardez une limite en tête : le détourage est calculé sur une copie réduite de la photo (480 pixels sur le plus grand côté), puis appliqué à la taille d’origine avec un bord adouci. Les contours nets d’un produit s’en sortent bien, mais des cheveux libres ou le poil d’une peluche sont adoucis, pas détourés mèche par mèche.

## Un fond blanc pour une boutique en ligne

Beaucoup de boutiques et de places de marché préfèrent ou exigent des photos de produits sur fond blanc uni. Avec cet outil :

1. Choisissez **Blanc** sous **Arrière-plan** (ou **Couleur** et la teinte voulue dans **Couleur de fond**).
2. Choisissez JPG ou WEBP comme format : pour une photo, ils pèsent bien moins lourd que le PNG.
3. Vérifiez le résultat avec **Fond choisi**, qui montre l’image telle qu’elle sera téléchargée.

![La même tasse avec le fond blanc et le format JPG sélectionnés](shot:quitar-fondo-blanco.fr "Avec « Blanc » et JPG, l’aperçu montre la photo exactement comme elle sera téléchargée.")

Si vous choisissez JPG alors que l’arrière-plan est sur **Transparent**, l’outil passe tout seul à **Blanc**, car le JPG ne gère pas la transparence.

Quelques conseils pour un rendu professionnel :

- **Prenez la photo en pensant au détourage** : un fond uni, d’une couleur différente de celle du produit (une feuille de carton, un mur), facilite beaucoup le travail. Évitez les fonds de la même couleur que l’objet.
- **Attention à l’ombre** : une ombre douce sur la table peut rester collée au produit. Retirez-la avec **Pinceau : supprimer** ou la **Gomme**.
- **Gardez le produit centré avec de la marge** : vous pourrez ensuite le passer au format carré avec [Recadrer une image](tool:crop-image) et à la taille demandée par la boutique avec [Redimensionner une image](tool:resize-image).
- **Surveillez le poids** : si la boutique limite la taille des fichiers ou si vous voulez une page rapide, [Compresser une image](tool:compress-image) allège le fichier sans changer ses dimensions.

## Un fond transparent : quel format télécharger

Si l’image doit être posée sur une autre maquette (une présentation, un catalogue, une page web), téléchargez-la avec l’arrière-plan **Transparent** en PNG, le format avec transparence le mieux pris en charge. Le JPG ne gère pas la transparence. Les différences entre formats sont expliquées dans [JPG, PNG, WebP ou AVIF : quel format choisir](guide:image-formats).

Pour une photo de profil ronde, passez le PNG détouré dans [Arrondir une image](tool:round-image).

Un cas à part est le **faux fond transparent** : des images téléchargées sur internet qui affichent le damier gris et blanc, mais l’ont en réalité dessiné dans leurs pixels. Si vous en ouvrez une, l’outil le détecte et propose **Supprimer le faux fond**, qui transforme ce damier en vraie transparence sans détourage à la main.

## Un fond blanc pour une photo d’identité

Pour une photo d’identité ou de passeport sur fond blanc, supprimez l’arrière-plan en mode **Personnes (automatique)**, choisissez **Blanc** et téléchargez l’image ; ouvrez-la ensuite dans [Photo d’identité](tool:id-photo) pour la cadrer au format demandé et préparer la planche de copies. Cet outil-là ne change pas le fond tout seul. Le guide [Comment faire une photo d’identité](guide:id-photo) explique le cadrage et l’impression.

Avant cela, vérifiez les exigences de la démarche : certaines administrations refusent les photos retouchées ou veulent le fond d’origine de la prise de vue. Dans ce cas, le plus sûr est de prendre la photo devant un mur blanc, ou de la couleur demandée.

## Limites et formats

- Une photo à la fois, jusqu’à 30 Mo et 40 mégapixels.
- Formats acceptés : JPG, PNG, WEBP, AVIF, GIF (première image seulement) et BMP. Les photos HEIC de l’iPhone doivent d’abord être converties en JPG avec [HEIC en JPG](conv:heic-jpg).
- Le fichier téléchargé garde la taille en pixels de la photo d’origine.

## En résumé

- Pour les personnes, utilisez **Personnes (automatique)** ; pour les produits, les objets et les animaux, **Objets et produits (rectangle)**.
- Corrigez les grandes zones avec **Pinceau : garder** et **Pinceau : supprimer**, et les détails avec **Gomme** et **Restaurer**, en zoomant.
- Vérifiez les contours en affichant l’image sur **Noir** ou **Magenta**.
- Fond blanc ou de couleur en JPG ou WEBP pour les boutiques ; fond transparent en PNG pour les maquettes.
- Tout se passe sur votre appareil : la photo n’est pas envoyée.
`;

export default body;
