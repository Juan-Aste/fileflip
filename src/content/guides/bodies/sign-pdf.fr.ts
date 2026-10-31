const body = `
On vous envoie un contrat, une autorisation ou un formulaire en PDF et on vous demande de le renvoyer signé. La méthode classique consiste à l'imprimer, le signer à la main, le scanner ou le prendre en photo, puis reconstituer le PDF. Ça marche, mais cela prend du temps et le résultat est souvent de travers et grisâtre. Ce guide explique comment apposer votre signature directement sur le PDF, depuis un ordinateur ou un téléphone, et en quoi cette signature diffère d'une signature électronique avec certificat.

## Avant de commencer : quel type de signature vous est demandé

Mieux vaut clarifier ce point d'abord, car il s'agit de choses différentes :

- **Signature manuscrite sur le PDF** : une image de votre signature placée sur la page, exactement comme si vous signiez le papier puis le scanniez. C'est ce que fait notre outil, et cela suffit pour beaucoup d'accords entre particuliers, d'autorisations, d'attestations et de formulaires.
- **Signature électronique avec certificat** : elle utilise un certificat délivré par un prestataire habilité (sur une clé, une carte ou une application officielle) et est inscrite de façon cryptographique dans le PDF. Toute modification ultérieure l'invalide. De nombreuses démarches officielles et certains contrats l'exigent.

La valeur juridique de chacune dépend du pays et de la démarche. Si l'organisme ou l'entreprise demande une « signature électronique » ou une « signature numérique », une image de votre signature ne la remplace pas ; si on vous demande de « signer et renvoyer le PDF », une signature manuscrite suffit généralement. En cas de doute, renseignez-vous auprès de la personne qui vous l'a demandé.

## Comment signer un PDF, étape par étape

1. Ouvrez [Signer un PDF](tool:sign-pdf) et choisissez le PDF.
2. Dans **Votre signature**, choisissez **La dessiner** et signez dans la zone avec le doigt, la souris ou un stylet ; ou choisissez **Importer une photo ou une image** de votre signature sur papier.
3. Choisissez la **Couleur de l’encre** (bleu ou noir) et appuyez sur **Utiliser cette signature**.
4. Allez à la page où doit figurer la signature avec les flèches et **touchez l'endroit** où vous la voulez, ou faites-la glisser.
5. Réglez la **taille de la signature** avec le curseur.
6. Appuyez sur **Signer et télécharger**.

![Une signature dessinée placée sur la ligne de signature d'une autorisation](shot:firmar-pdf-colocar "Vous placez la signature en touchant la page ; vous pouvez ensuite la déplacer et changer sa taille.")

Tout se passe dans votre navigateur : ni le document ni votre signature ne quittent votre appareil, et nous ne conservons pas votre signature. La prochaine fois, il faudra donc la dessiner ou l'importer de nouveau.

## La dessiner ou importer une photo

**La dessiner** est le plus rapide. Sur un téléphone, avec le doigt, le résultat est assez naturel ; avec une souris, c'est plus difficile. Si vous avez une tablette avec un stylet, c'est la meilleure option.

**Importer une photo** donne le résultat le plus proche de votre signature sur papier :

1. Signez sur une feuille **blanche et unie** avec un stylo à encre foncée (bleue ou noire).
2. Prenez-la en photo **avec une bonne lumière**, bien de face et sans ombres.
3. Importez-la avec **Importer une photo ou une image** et laissez cochée l'option **Retirer le fond blanc du papier**.

L'outil retire le blanc du papier et rogne les bords pour ne garder que le tracé, sur un fond transparent. La signature apparaît ainsi proprement sur la ligne du document, sans rectangle blanc autour. Il accepte les formats PNG, JPG ou WEBP jusqu'à 10 Mo.

## Bien la placer

- **Taille** : une vraie signature occupe entre un quart et un tiers de la largeur d'une page A4 (ou Letter US). Le curseur indique la taille en pourcentage de la largeur de la page.
- **Position** : faites en sorte que le tracé repose sur la ligne de signature, sans flotter au-dessus.
- **Au clavier** : sélectionnez la signature avec Tab et déplacez-la avec les flèches ; avec Maj, elle se déplace plus vite. Pratique pour les ajustements fins.

## Signer plusieurs pages

L'outil place la signature sur une page à la fois. Si le document doit être signé sur plusieurs pages (par exemple sur chaque page d'un contrat), signez la première, téléchargez le PDF et rouvrez ce PDF signé pour signer la suivante.

Si vous devez aussi **parapher** chaque page ou ajouter du texte comme votre nom, votre numéro de pièce d'identité ou la date, utilisez [Modifier un PDF](tool:edit-pdf) : il permet de taper du texte n'importe où sur la page, sur plusieurs pages, et aussi d'ajouter une image, par exemple votre signature enregistrée en PNG.

## Si le PDF est un formulaire

Beaucoup de formulaires PDF ont des champs à remplir (cases à cocher, zones de texte, listes). Remplissez d'abord les informations avec [Remplir un formulaire PDF](tool:fill-pdf-form) et enregistrez le PDF aplati, puis signez-le. Les données et la signature sont ainsi figées sur la page et s'affichent de la même façon dans n'importe quel lecteur ou à l'impression.

Si le formulaire n'a pas de champs, seulement des lignes à remplir à la main, saisissez les informations avec [Modifier un PDF](tool:edit-pdf).

## Après la signature

- **Vérifiez le résultat** avant de l'envoyer : ouvrez le PDF téléchargé et assurez-vous que la signature est sur la bonne page, au bon endroit.
- **S'il est trop lourd** pour être envoyé par e-mail, [Compresser un PDF](tool:compress-pdf) le réduit. Le guide [Comment réduire la taille d'un PDF](guide:reduce-pdf-size) explique quel niveau choisir.
- **S'il est confidentiel**, vous pouvez ajouter un mot de passe d'ouverture avec [Protéger un PDF par mot de passe](tool:protect-pdf) et transmettre le mot de passe par un autre canal.

La signature est dessinée sur la page sous forme d'image : elle s'affiche donc de la même façon dans n'importe quel lecteur PDF et à l'impression. Gardez à l'esprit que, contrairement à une signature électronique avec certificat, elle n'empêche personne de modifier le document ensuite : conservez une copie du PDF que vous avez envoyé.

## En résumé

- [Signer un PDF](tool:sign-pdf) appose votre signature manuscrite sur le PDF, sans imprimer ni scanner, et sans rien envoyer sur un serveur.
- Dessinez votre signature ou importez une photo sur papier blanc : le fond est retiré automatiquement.
- Signez une page à la fois ; pour d'autres pages, rouvrez le PDF signé.
- Remplissez les formulaires avant de signer, avec Remplir un formulaire PDF ou Modifier un PDF.
- Une signature manuscrite sur un PDF n'est pas une signature électronique avec certificat : si c'est celle-ci qui est exigée, elle ne la remplace pas.
`;

export default body;
