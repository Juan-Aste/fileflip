const body = `
Si vous avez un iPhone, vos photos sont très probablement au format HEIC. Sur le téléphone, on ne s'en rend pas compte, mais le problème apparaît dès qu'on les transfère sur un PC Windows, qu'on les dépose sur un formulaire en ligne ou qu'on les envoie à quelqu'un qui n'a pas d'appareil Apple : le fichier ne s'ouvre pas, il n'y a pas de miniature, ou le site affiche « format non pris en charge ». Ce guide explique ce qu'est le HEIC, comment convertir les photos en JPG sans rien installer et comment éviter le problème directement sur l'iPhone.

## Ce qu'est le HEIC et pourquoi l'iPhone l'utilise

HEIC est le nom qu'Apple donne aux images enregistrées au format HEIF avec le codec vidéo HEVC. Depuis iOS 11, l'appareil photo de l'iPhone enregistre les photos ainsi pour une raison pratique : à qualité comparable, un fichier HEIC occupe environ moitié moins de place qu'un JPG, et sur un téléphone qui contient des milliers de photos, cela fait beaucoup de stockage.

Le problème, c'est la compatibilité. Le JPG est ouvert depuis des décennies par tous les logiciels, navigateurs, réseaux sociaux et formulaires ; le HEIC, non. Windows peut avoir besoin d'extensions du Microsoft Store pour l'afficher, de nombreux sites administratifs et d'entreprise ne l'acceptent pas, et certains logiciels de retouche anciens ne le reconnaissent pas.

## Comment convertir des photos HEIC en JPG

1. Ouvrez [HEIC en JPG](conv:heic-jpg) et faites glisser les photos, ou touchez la zone pour les choisir. Vous pouvez en sélectionner beaucoup d'un coup.
2. Vérifiez que **JPG** est bien choisi sous « Convertir en ».
3. Si vous les voulez plus légères, ouvrez **Options** et baissez la qualité ou la taille. Sinon, gardez les réglages par défaut.
4. Appuyez sur **Convertir** et téléchargez chaque photo, ou toutes ensemble avec **Tout télécharger en ZIP**.

![Le convertisseur avec une photo HEIC prête à être transformée en JPG](shot:heic-convertir "Les photos HEIC sont converties dans votre navigateur : elles ne sont jamais envoyées sur un serveur.")

La conversion se fait dans votre navigateur : les photos ne sont jamais envoyées sur un serveur, ce qui compte quand il s'agit de photos personnelles ou de photos de documents. Elle fonctionne dans Chrome, Edge, Firefox et Safari, sur ordinateur comme sur le téléphone lui-même, avec jusqu'à 50 photos à la fois.

La photo garde son orientation : si vous l'avez prise à la verticale, le JPG est aussi à la verticale, même si le fichier d'origine enregistre la rotation à part.

## Depuis le téléphone ou depuis un ordinateur

**Sur l'iPhone** : ouvrez la page dans Safari, touchez la zone pour choisir des fichiers, puis « Photothèque ». Une fois la conversion terminée, téléchargez le JPG ; Safari l'enregistre dans l'app Fichiers, dans le dossier Téléchargements, d'où vous pouvez l'envoyer ou l'enregistrer dans Photos.

**Sur un PC Windows** : copiez d'abord les photos de l'iPhone vers l'ordinateur (par câble, via le cloud ou par e-mail). Faites-les ensuite toutes glisser d'un coup dans le convertisseur. S'il y en a beaucoup, le ZIP vous évite de les télécharger une par une.

**Sur Android** : si quelqu'un vous a envoyé des photos HEIC et que votre téléphone ne les ouvre pas, la marche à suivre est la même que sur l'iPhone : choisissez les fichiers depuis le navigateur et téléchargez les JPG.

## Bon à savoir avant de convertir

**Les données de la photo ne passent pas dans le JPG.** En plus de l'image, les fichiers HEIC de l'iPhone enregistrent des informations comme la date et l'heure, le modèle du téléphone et, si la localisation est activée pour l'appareil photo, les coordonnées GPS de l'endroit où la photo a été prise. Notre convertisseur redessine l'image et l'enregistre de nouveau : le JPG obtenu ne contient donc pas ces données. Pour partager des photos avec des inconnus, c'est un avantage : vous ne révélez pas où vous étiez. Mais si vous comptez trier les photos par date dans un logiciel ensuite, sachez que cette information ne sera pas dans le fichier.

Si vous voulez retirer la localisation de photos qui sont déjà en JPG, [Supprimer les métadonnées EXIF](tool:remove-exif) le fait sans les convertir de nouveau.

**Le JPG est plus lourd que le HEIC.** C'est normal : le HEIC compresse mieux. Avec la qualité par défaut, le JPG peut être nettement plus lourd que l'original. Si le formulaire impose un poids maximal (par exemple « moins de 500 Ko »), utilisez ensuite [Compresser une image](tool:compress-image), qui permet de fixer ce poids exact.

**Une Live Photo, c'est une photo plus une courte vidéo.** En convertissant une Live Photo, vous n'obtenez que la photo fixe. Le mouvement est perdu, exactement comme lorsque vous l'envoyez par e-mail comme une photo normale.

## Comment faire prendre des photos en JPG à l'iPhone

Si vous avez toujours besoin de JPG, vous pouvez changer le format de l'appareil photo :

1. Ouvrez **Réglages** sur l'iPhone.
2. Allez dans **Appareil photo**, puis **Formats**.
3. Choisissez **Le plus compatible**.

À partir de là, les nouvelles photos sont enregistrées en JPG et les vidéos en H.264. Les photos que vous avez déjà restent en HEIC. En contrepartie, les nouvelles photos prennent plus de place sur le téléphone ; si vous manquez de stockage, vous préférerez peut-être garder le HEIC et ne convertir que les photos à envoyer.

## Comment copier les photos sur un ordinateur directement en JPG

L'iPhone propose une autre option, prévue pour le branchement par câble à un ordinateur : dans **Réglages → Photos**, tout en bas, la section **Transférer sur Mac ou PC**. Avec **Automatique**, l'iPhone convertit les photos dans un format compatible pendant la copie ; avec **Conserver les originaux**, il les copie en HEIC.

Cette option ne concerne que la copie par câble. Si vous transférez les photos via le cloud, une messagerie ou par e-mail, le format dépend de chaque service : certains convertissent en JPG, d'autres envoient le fichier tel quel. Si le destinataire ne peut pas les ouvrir, convertissez-les avant de les envoyer.

## Les autres formats de sortie

Le JPG est le choix le plus sûr, mais pas le seul :

- **PNG** : ne perd aucune qualité, mais une photo en PNG est beaucoup plus lourde. Cela n'a de sens que si vous allez retoucher l'image de nombreuses fois. Vous pouvez utiliser [HEIC en PNG](conv:heic-png).
- **WebP** : plus léger que le JPG et ouvert par les navigateurs actuels, mais tous les formulaires ne l'acceptent pas.
- **PDF** : si vous devez envoyer plusieurs photos d'un document (le recto et le verso d'une carte d'identité, une facture de plusieurs pages), [Images en PDF](tool:images-to-pdf) accepte directement le HEIC et crée un seul PDF avec une photo par page.

Le guide [JPG, PNG, WebP ou AVIF : quel format choisir](guide:image-formats) explique les différences entre ces formats, poids mesurés à l'appui.

## En résumé

- Le HEIC est le format de l'iPhone : des fichiers plus légers, mais que tout le monde ne sait pas ouvrir.
- Pour convertir, utilisez [HEIC en JPG](conv:heic-jpg) : dans votre navigateur, sans envoyer les photos, plusieurs à la fois.
- Le JPG ne garde ni la date ni la localisation de la photo, et il est plus lourd que le HEIC.
- Pour que l'iPhone prenne des photos en JPG : **Réglages → Appareil photo → Formats → Le plus compatible**.
- Pour les copier par câble déjà converties : **Réglages → Photos → Transférer sur Mac ou PC → Automatique**.
`;

export default body;
