const body = `
On vous envoie un PDF et vous devez y changer quelque chose : corriger une date, ajouter votre nom sur une ligne, signaler un paragraphe, apposer un logo ou masquer un numéro de téléphone avant de le transférer. Beaucoup de logiciels qui promettent de « modifier un PDF » demandent une installation, un compte ou un paiement pour télécharger le résultat. Ce guide explique comment le faire gratuitement dans le navigateur, sur ordinateur ou sur téléphone, et surtout ce qu’on peut changer dans un PDF et ce qu’on ne peut pas, pour ne pas perdre de temps à chercher une fonction qu’aucun éditeur en ligne ne fait bien.

## Ce qu’on peut modifier dans un PDF (et ce qu’on ne peut pas)

Un PDF n’est pas un document Word. Il ne contient pas des paragraphes qui se réorganisent quand on tape, mais des lettres dessinées à des positions fixes sur la page. Il existe donc deux sortes de modifications très différentes :

- **Ajouter des éléments par-dessus la page** : du texte, du surlignage, des flèches, des cadres, une image ou un cadre blanc qui cache quelque chose. C’est ce que fait [Modifier un PDF](tool:edit-pdf), et c’est ce dont on a besoin la plupart du temps.
- **Changer le texte déjà présent dans le PDF** : réécrire une phrase et voir le reste du paragraphe se réajuster tout seul. Notre outil **ne fait pas cela**. Il faut alors convertir le PDF en Word, le modifier puis l’enregistrer de nouveau en PDF ; nous expliquons plus bas comment, et quand cela vaut la peine.

Avec Modifier un PDF, vous pouvez :

- Écrire du **texte** n’importe où, sur plusieurs lignes, en Helvetica (normal ou gras), Times ou Courier, de 4 à 144 points et dans la couleur de votre choix.
- **Surligner** des phrases avec une couleur transparente qui laisse lire le texte en dessous.
- **Dessiner** à main levée et tracer des **rectangles**, des **lignes** et des **flèches**, de 1 à 20 points d’épaisseur.
- Placer une **image** PNG ou JPG de 10 Mo maximum : un logo, un tampon ou votre signature enregistrée en image.
- **Masquer** des parties de la page avec un cadre blanc.

Tout se passe dans votre navigateur : le PDF et ce que vous ajoutez ne quittent pas votre appareil.

## Comment modifier un PDF, étape par étape

1. Ouvrez [Modifier un PDF](tool:edit-pdf) et déposez le PDF dans la zone prévue, ou touchez-la pour choisir le fichier.
2. Choisissez la page dans les miniatures et utilisez **Zoom avant** pour travailler avec précision.
3. Dans la barre d’outils, choisissez ce que vous voulez ajouter : **Texte**, **Surligner**, **Dessiner**, **Rectangle**, **Ligne**, **Flèche**, **Masquer** ou **Image**.
4. Pour écrire, choisissez la **Police**, la **Taille (pt)** et la **Couleur**, touchez la page à l’endroit voulu et tapez le texte dans la zone **Texte** qui apparaît au-dessus.
5. Pour corriger, choisissez **Sélectionner**, touchez l’élément et faites-le glisser ; **Supprimer** l’efface, **Annuler** et **Rétablir** parcourent vos modifications.
6. Appuyez sur **Enregistrer le PDF**, puis sur **Télécharger**.

![L’éditeur avec un avis en PDF : une date surlignée, une flèche rouge et l’heure corrigée](shot:editar-pdf-texto "L’ancienne heure est masquée par un cadre blanc et la nouvelle est écrite par-dessus. Au-dessus de la page, on règle la police, la taille et le texte de l’élément sélectionné.")

Quelques détails qui font gagner du temps :

- Sur les images, le surlignage et les cadres blancs, le **petit carré dans le coin** permet de redimensionner. Le texte n’a pas ce carré : on l’agrandit ou on le réduit avec la **Taille (pt)**.
- Chaque outil garde sa propre couleur : le texte commence en noir, le surlignage en jaune et les formes en rouge. **Autre couleur** permet de choisir n’importe quelle teinte.
- Vous pouvez modifier plusieurs pages avant d’enregistrer : les miniatures des pages modifiées portent un point.
- Sur téléphone, tout se fait au doigt. Sur ordinateur, Ctrl+Z annule et Ctrl+Y rétablit (Cmd sur Mac).

## Corriger un texte déjà présent dans le PDF

C’est la demande la plus fréquente : changer une date, un montant, un nom mal orthographié. Comme le texte d’origine ne peut pas être réécrit, l’astuce consiste à **masquer et écrire par-dessus** :

1. Choisissez **Masquer** et faites glisser sur le mot ou le chiffre à changer.
2. Choisissez **Texte** et touchez exactement l’endroit où commençait l’ancien texte.
3. Tapez le nouveau, dans une police et une taille proches de l’original.

Pour que cela passe inaperçu : **Helvetica** ressemble à Arial et à la plupart des polices sans empattement ; **Times**, aux polices à empattement des documents plus formels. Dans presque tous les documents, le texte courant fait entre 10 et 12 points. Avec un zoom à 200 % ou 300 %, il est facile d’ajuster la position.

Cette astuce fonctionne bien pour des mots isolés, des chiffres et des lignes courtes. S’il faut réécrire des paragraphes entiers, le nouveau texte ne tiendra pas dans la place de l’ancien. Dans ce cas, convertissez le PDF avec [PDF en Word](conv:pdf-docx), modifiez-le comme n’importe quel document et reconvertissez-le avec [Word en PDF](conv:docx-pdf). Sachez que cette conversion se fait sur notre serveur et que le fichier Word obtenu est un document propre, pas une copie exacte de la mise en page : le guide [Comment convertir un PDF en Word](guide:pdf-to-word) détaille ce qui est conservé.

## Masquer n’est pas effacer : attention aux données personnelles

C’est un point important si vous partagez le PDF. Un cadre blanc **ne fait que cacher à la vue** : le texte en dessous reste dans le fichier, et n’importe qui peut le sélectionner, le copier ou le trouver avec la recherche du lecteur PDF. L’éditeur vous le rappelle par un message dès que vous utilisez **Masquer**.

Si ce que vous masquez ne doit être vu par personne (un numéro de sécurité sociale, un IBAN, une adresse), procédez ainsi :

1. Avec **Sélectionner**, touchez le cadre blanc.
2. Cochez **Masquer vraiment (transforme cette page en image)**.
3. Enregistrez le PDF.

![Un cadre blanc sélectionné, avec la case Masquer vraiment cochée](shot:editar-pdf-tapar "Avec « Masquer vraiment » coché, la page est enregistrée comme une image et ce qui était masqué disparaît du fichier.")

À l’enregistrement, cette page est remplacée par une image de haute qualité d’elle-même : ce qui se trouvait sous le cadre disparaît du fichier. En contrepartie, le texte de cette page ne peut plus être sélectionné ni recherché, et le PDF devient en général plus lourd. Les autres pages restent intactes : ne cochez la case que là où c’est nécessaire.

## À savoir avant d’enregistrer

- **Ce que vous ajoutez devient définitif.** C’est dessiné dans la page, pas ajouté comme un commentaire : cela s’affiche de la même façon dans tous les lecteurs et à l’impression, mais ne peut plus être déplacé ni effacé ensuite, même en rouvrant le PDF dans Modifier un PDF. Vérifiez tout avant d’appuyer sur **Enregistrer le PDF** et gardez l’original.
- **Si vous rechargez la page avant d’enregistrer, vos modifications sont perdues.** L’éditeur ne conserve rien nulle part.
- **Accents et autres écritures.** Les lettres accentuées, le ç ou le œ s’écrivent dans la police choisie. Le texte dans une écriture que ces polices ne couvrent pas, comme le chinois, et les émojis sont ajoutés sous forme d’image avec les polices de votre appareil : le rendu est correct, mais on ne peut pas les sélectionner.
- **PDF numérisés.** Vous pouvez écrire, surligner et masquer comme sur n’importe quel PDF. Si vous voulez en plus pouvoir rechercher et copier leur texte, passez-les d’abord par [OCR de PDF numérisé](tool:ocr-pdf).

## Autres modifications : quel outil choisir

Parfois, « modifier un PDF » veut dire autre chose. Dans ces cas, il existe des outils plus directs :

- **Remplir un formulaire avec des champs** (zones de texte, cases à cocher, listes) : [Remplir un formulaire PDF](tool:fill-pdf-form) les repère et vous permet de les compléter ; le guide [Comment remplir un formulaire PDF](guide:fill-pdf-form) vous accompagne. Si le formulaire n’est qu’un dessin avec des lignes, utilisez Modifier un PDF.
- **Signer** : [Signer un PDF](tool:sign-pdf) place votre signature dessinée ou une photo de celle-ci ; voir [Comment signer un PDF sans l’imprimer](guide:sign-pdf).
- **Réordonner, faire pivoter ou retirer des pages** : [Organiser les pages d’un PDF](tool:organize-pdf), [Pivoter un PDF](tool:rotate-pdf) ou [Supprimer des pages d’un PDF](tool:delete-pdf-pages).
- **Ajouter les pages d’un autre PDF** : [Fusionner des PDF](tool:merge-pdf).
- **Mettre le même texte sur toutes les pages** : Modifier un PDF travaille page par page. Pour un BROUILLON ou CONFIDENTIEL partout, utilisez [Ajouter un filigrane à un PDF](tool:pdf-watermark) ; pour les numéroter, [Numéroter les pages d’un PDF](tool:pdf-page-numbers).
- **Protéger le résultat** : [Protéger un PDF par mot de passe](tool:protect-pdf) ajoute un mot de passe d’ouverture.

## En résumé

- [Modifier un PDF](tool:edit-pdf) ajoute du texte, du surlignage, des dessins, des formes, des images et des cadres blancs, gratuitement et sans envoyer le fichier.
- Il ne change pas le texte d’origine : pour corriger un mot, masquez-le et écrivez par-dessus ; pour réécrire des paragraphes, convertissez le PDF en Word.
- Masquer avec un cadre blanc n’efface rien : si la donnée est personnelle, cochez « Masquer vraiment ».
- Ce que vous ajoutez devient définitif à l’enregistrement : vérifiez avant et gardez l’original.
- Pour les formulaires, les signatures, les pages, les filigranes ou les mots de passe, utilisez l’outil dédié.
`;

export default body;
