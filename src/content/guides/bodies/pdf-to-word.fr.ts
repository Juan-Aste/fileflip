const body = `
Convertir un PDF en Word sert surtout à une chose : **pouvoir modifier le texte** quand on n'a plus le fichier d'origine. Un contrat reçu en PDF à corriger, un vieux CV, des notes à reprendre. Ce qu'aucun convertisseur ne peut promettre, c'est un Word identique au PDF : un PDF ne contient ni paragraphes ni tableaux, seulement des lettres dessinées à des positions fixes sur la page, et le convertisseur doit deviner à quoi ressemblait le document.

Ce guide montre comment faire avec notre convertisseur, ce qui est conservé et ce qui ne l'est pas, et quel outil utiliser dans les trois cas où la conversion directe ne suffit pas : les PDF numérisés, les tableaux et les images.

## Avant de commencer : votre PDF contient-il du texte ?

Ouvrez le PDF et essayez de sélectionner un mot avec la souris (ou en appuyant longuement dessus sur un téléphone). Deux cas possibles :

- **Le mot se sélectionne** : le PDF contient du texte numérique. C'est le cas des PDF enregistrés depuis Word, un logiciel de facturation ou l'espace client d'une banque. La conversion en Word fonctionne directement.
- **Un rectangle se sélectionne, ou rien du tout** : le PDF est une image, comme un document scanné ou une photo enregistrée en PDF. Il n'y a pas de lettres à envoyer vers Word, seulement des pixels. Passez alors directement à la partie sur les PDF numérisés.

Cette vérification de dix secondes vous évite la déception la plus fréquente : un Word vide ou un message d'erreur.

## Comment convertir un PDF en Word, étape par étape

1. Ouvrez [PDF en Word](conv:pdf-docx) et faites glisser le PDF dans la zone, ou touchez-la pour choisir le fichier sur votre appareil.
2. Vérifiez que **Word** est bien choisi sous « Convertir en ».
3. Appuyez sur **Convertir** et patientez quelques secondes.
4. Téléchargez le fichier .docx avec son bouton et ouvrez-le dans Word, LibreOffice Writer, Google Docs ou Pages.

![Le convertisseur avec un PDF prêt à être transformé en Word](shot:pdf-a-word-convertir "Une fois le PDF choisi, le format de sortie est Word : il suffit d'appuyer sur Convertir.")

Vous pouvez convertir jusqu'à 5 PDF à la fois, de 15 Mo maximum chacun. Contrairement à la plupart de nos outils, cette conversion **se fait sur notre serveur** : le fichier est transmis de façon chiffrée, converti, puis supprimé automatiquement dans l'heure. Si le document est très sensible, tenez-en compte avant de l'envoyer.

## Ce qui est conservé et ce qui ne l'est pas

Notre convertisseur lit le texte du PDF avec sa position et sa taille, puis le reconstruit sous forme de document Word classique :

- **Conservé** : tout le texte, de haut en bas ; les paragraphes (les lignes sont réunies en paragraphes même si le PDF les coupe) ; les titres (les lignes en plus gros caractères deviennent des titres Word, avec leur style) ; la taille approximative de la police ; les sauts de page (chaque page du PDF commence une nouvelle page dans Word) ; et le format du papier.
- **Peut changer ou disparaître** : les colonnes (dans un texte sur deux colonnes, les lignes situées à la même hauteur sont fusionnées, vérifiez-les) ; les tableaux (leurs cellules deviennent des lignes de texte) ; les images ; les couleurs ; les polices exactes ; et les en-têtes ou pieds de page, qui deviennent du texte normal sur chaque page.

![Le PDF converti, avec le bouton pour télécharger le document Word](shot:pdf-a-word-resultado "À la fin, un bouton permet de télécharger le .docx. La note au-dessus résume ce qui est conservé.")

Le résultat est un document **propre et facile à modifier**, pas une copie visuelle du PDF. Pour corriger le texte, réécrire des passages ou réutiliser des paragraphes, c'est exactement ce qu'il vous faut : pas de zones de texte qui se chevauchent ni de retours à la ligne au milieu de chaque phrase.

## Si le PDF est numérisé

Un PDF scanné ne contient pas de texte : au lieu de vous remettre un Word vide, le convertisseur affiche un message. Il faut d'abord reconnaître les lettres de l'image, ce qu'on appelle l'OCR :

1. Ouvrez [OCR de PDF numérisé](tool:ocr-pdf), choisissez le PDF et la **langue dans laquelle il est rédigé** (c'est important : avec la mauvaise langue, les lettres accentuées et certains caractères sont mal reconnus).
2. Téléchargez le PDF obtenu. Il a le même aspect que l'original, mais il comporte maintenant une couche de texte invisible sur chaque mot.
3. Passez ce nouveau PDF dans [PDF en Word](conv:pdf-docx).

L'OCR s'exécute dans votre navigateur, sans envoyer le document, et peut prendre quelques secondes par page. Sa précision dépend de la numérisation : avec une page droite et bien éclairée, il n'y a presque pas d'erreurs ; avec une photo de travers ou floue, des lettres sont confondues. Si vous avez seulement besoin du texte pour le coller ailleurs, l'OCR peut aussi vous donner directement un fichier .txt, sans passer par Word.

Si le document est une photo prise avec votre téléphone, passez-la d'abord dans [Scanner un document](tool:scan-document) : l'outil redresse la perspective et rend le papier bien blanc, ce qui améliore beaucoup la reconnaissance.

## Si ce sont les tableaux qui vous intéressent

Si le PDF est un relevé bancaire, une liste de prix ou un rapport rempli de chiffres, ce qu'il vous faut presque toujours, c'est un tableur, pas un Word. Utilisez alors [PDF en Excel](tool:pdf-to-excel) : l'outil reconstitue les lignes et les colonnes à partir de l'alignement du texte, transforme les montants comme 1 234,56 en vrais nombres que vous pouvez additionner et vous montre le tableau détecté avant le téléchargement. Vous pouvez ensuite copier le tableau depuis Excel et le coller dans Word, où il devient un tableau modifiable.

Le guide [Comment convertir un tableau PDF en Excel](guide:pdf-table-to-excel) détaille cette méthode.

## Si vous avez besoin des images

Les photos et les logos du PDF ne passent pas dans le Word. Pour les récupérer, [Extraire les images d'un PDF](tool:extract-pdf-images) vous donne chaque image dans sa résolution d'origine, sans perte de qualité, et vous pouvez ensuite les insérer dans Word là où vous en avez besoin. Si vous voulez une page entière sous forme d'image (par exemple un plan ou un graphique vectoriel), utilisez [PDF en JPG](conv:pdf-jpg).

## Quand il n'est pas nécessaire de passer par Word

Convertir est souvent un détour. Avant de vous lancer, demandez-vous ce dont vous avez vraiment besoin :

- **Remplir un formulaire** : si le PDF a des champs, [Remplir un formulaire PDF](tool:fill-pdf-form) les affiche comme un formulaire normal. S'il s'agit d'un formulaire sans champs (juste des lignes où écrire), [Modifier un PDF](tool:edit-pdf) vous permet de taper du texte sur la page.
- **Changer un mot ou une date** : dans Modifier un PDF, vous pouvez recouvrir l'ancien texte d'un rectangle blanc et écrire le nouveau par-dessus, sans toucher au reste de la mise en page. Attention : recouvrir n'efface pas. Le texte en dessous reste dans le fichier, sauf si vous cochez « Masquer vraiment ».
- **Copier un paragraphe** : [PDF en texte](tool:pdf-to-text) vous donne tout le texte dans un fichier .txt, sans passer par Word.
- **Le signer** : inutile d'imprimer ou de convertir, [Signer un PDF](tool:sign-pdf) ajoute votre signature directement.

## Après la modification : revenir au PDF

Une fois le document corrigé dans Word, vous voudrez en général le renvoyer en PDF pour qu'il s'affiche de la même façon sur tous les appareils. Vous pouvez utiliser l'enregistrement au format PDF de Word ou passer le .docx dans [Word en PDF](conv:docx-pdf). Si le résultat est trop lourd pour l'envoyer par e-mail, le guide [Comment réduire la taille d'un PDF](guide:reduce-pdf-size) explique quoi faire.

## En résumé

- Vérifiez d'abord si le texte du PDF peut être sélectionné.
- Avec du texte : [PDF en Word](conv:pdf-docx) vous donne un document modifiable avec paragraphes, titres et sauts de page ; les colonnes, les tableaux et les images peuvent changer.
- PDF numérisé : d'abord [OCR de PDF numérisé](tool:ocr-pdf), puis PDF en Word.
- Tableaux : [PDF en Excel](tool:pdf-to-excel). Images : [Extraire les images d'un PDF](tool:extract-pdf-images).
- S'il s'agit seulement de remplir, de corriger une ligne ou de signer, modifiez directement le PDF et évitez la conversion.
`;

export default body;
