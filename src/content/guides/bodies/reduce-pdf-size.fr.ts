const body = `
Un PDF trop lourd pose un problème bien concret : l'e-mail revient, le formulaire de dépôt exige « moins de 2 Mo », ou la personne à qui vous l'envoyez sur WhatsApp doit consommer ses données mobiles pour l'ouvrir. Bonne nouvelle : on peut presque toujours le réduire beaucoup sans qu'il devienne difficile à lire. Tout l'enjeu est de comprendre **ce qui prend de la place** dans le PDF.

## Pourquoi un PDF est si lourd

Un PDF de texte, comme celui qu'on enregistre depuis Word avec uniquement des mots, est minuscule : une page pèse quelques kilo-octets. Ce qui fait peser un PDF plusieurs mégaoctets, ce sont presque toujours **les images qu'il contient**, et en particulier les photos prises au téléphone.

Le cas typique : vous avez « scanné » un contrat en le photographiant avec votre téléphone et réuni les photos dans un PDF. Chaque photo fait 12 mégapixels ou plus, bien plus de résolution qu'il n'en faut pour lire une page, et le PDF finit par peser entre 1 et 3 Mo par page.

C'est pourquoi notre outil [Compresser un PDF](tool:compress-pdf) s'attaque aux images : il les réenregistre avec une résolution plus faible et une compression plus forte, sans toucher au texte, aux polices ni aux dessins vectoriels. Le texte reste net et peut toujours être sélectionné et recherché.

## Comment compresser un PDF, étape par étape

1. Ouvrez [Compresser un PDF](tool:compress-pdf) et faites glisser le fichier, ou touchez la zone pour le choisir.
2. Choisissez le niveau de compression : **Faible (meilleure qualité)**, **Recommandé** ou **Fort (fichier le plus léger)**.
3. Appuyez sur **Compresser**.
4. Regardez le résultat : l'outil affiche le poids avant et après. S'il vous convient, téléchargez-le ; sinon, essayez un autre niveau.

![Compresser un PDF avec le niveau recommandé, et le résultat](shot:comprimir-pdf-resultado "L'outil indique le poids du PDF avant et après la compression.")

Le PDF est traité dans votre propre navigateur : il n'est jamais envoyé sur un serveur, vous pouvez donc compresser sans crainte des documents contenant des données personnelles. L'outil accepte des fichiers jusqu'à 200 Mo.

## Quel niveau choisir : ce que nous avons mesuré

Pour vous donner une idée réelle, nous avons créé un PDF de 4 pages à partir d'images qui imitent des photos de contrat prises au téléphone : 3024 × 4032 pixels chacune, comme la plupart des téléphones, avec un éclairage inégal et du grain. Il pesait 4,8 Mo. Voici les résultats à chaque niveau :

| Niveau | Poids | Réduction | Ce qu'il fait des photos |
| --- | --- | --- | --- |
| Faible (meilleure qualité) | 750 Ko | 85 % | Grand côté jusqu'à 2400 pixels, qualité élevée |
| Recommandé | 319 Ko | 94 % | Grand côté jusqu'à 1600 pixels, qualité moyenne |
| Fort (fichier le plus léger) | 144 Ko | 97 % | Grand côté jusqu'à 1100 pixels, qualité basse |

Au niveau fort, le texte du contrat restait parfaitement lisible en affichant la page entière à l'écran. Ce qu'on perd, ce sont les détails fins : si le PDF contient des photos importantes en elles-mêmes (un catalogue de produits, un plan avec de très petites annotations, un rapport avec des photographies), restez au niveau faible ou recommandé.

Un conseil pratique : **commencez par Recommandé**. Pour un e-mail ou WhatsApp, c'est généralement suffisant. Si un formulaire de dépôt exige un fichier plus léger, passez à Fort.

## Pourquoi il arrive qu'il ne diminue presque pas

Si votre PDF contient surtout du texte, ou si ses images sont déjà bien compressées, il n'y a pas grand-chose à gagner. Un PDF de texte de quelques pages pèse quelques kilo-octets et le compresser n'a aucun intérêt. Si l'outil ne parvient pas à le réduire, il vous le signale, et il ne vous rend jamais un fichier plus lourd que l'original.

C'est aussi le cas des PDF déjà passés par un autre compresseur, ou des images dans des formats que nous ne recompressons pas pour ne pas risquer d'abîmer la qualité (par exemple certaines numérisations en noir et blanc pur ou des images en couleurs d'impression). Si le PDF reste lourd après compression, essayez les autres pistes de ce guide.

## D'autres façons d'alléger un PDF

**Supprimez les pages inutiles.** Souvent, le PDF contient des pages blanches, des annexes dont personne n'a besoin ou deux fois la même page. Avec [Supprimer des pages d'un PDF](tool:delete-pdf-pages), vous voyez une miniature de chaque page et retirez celles que vous ne voulez pas. Le reste garde la même qualité.

**Divisez-le en plusieurs parties.** Si le formulaire accepte plusieurs fichiers mais avec un poids maximal pour chacun, [Diviser un PDF](tool:split-pdf) sépare le document en plages de pages (par exemple 1-5 et 6-10), et chaque partie est plus légère.

**Réduisez les photos avant de créer le PDF.** Si vous allez fabriquer le PDF à partir de photos, vous pouvez le faire avec [Images en PDF](tool:images-to-pdf) puis compresser le résultat ; ou réduire d'abord les photos avec [Compresser une image](tool:compress-image), qui permet de fixer un poids exact pour chaque photo.

**Numérisez mieux.** Si le PDF vient de photos de documents papier, [Scanner un document](tool:scan-document) redresse la page, rend le papier blanc et le texte noir : le résultat ressemble à une vraie numérisation, plus lisible que la photo d'origine.

## Quel poids viser pour l'envoyer

Il n'existe pas de chiffre unique, mais il y a des repères utiles :

- **E-mail** : beaucoup de messageries refusent les pièces jointes de plus de 20 ou 25 Mo (sur Gmail, la limite est de 25 Mo). Un fichier léger est aussi plus agréable pour le destinataire : pour un document de quelques pages, moins de 2 Mo est raisonnable.
- **WhatsApp** : il accepte des documents lourds, mais le destinataire doit les télécharger, parfois avec ses données mobiles. Si vous l'envoyez comme document (et non comme photo), le PDF arrive exactement tel quel.
- **Formulaires et démarches en ligne** : ils indiquent généralement le poids maximal à côté du bouton d'envoi. Les limites de 1, 2 ou 5 Mo par fichier sont courantes. Vérifiez ce chiffre avant de compresser, pour choisir le bon niveau.

## Les erreurs fréquentes

- **Compresser plusieurs fois le même PDF.** Chaque passage fait perdre un peu de qualité et, à partir du deuxième, ne réduit presque plus le poids. Mieux vaut repartir de l'original et choisir un niveau plus fort.
- **Transformer le PDF en images pour l'alléger.** Convertir chaque page en JPG et reconstruire le PDF fait que le texte n'est plus du texte : on ne peut plus le rechercher ni le copier, et le fichier finit souvent plus lourd.
- **Ajouter un mot de passe avant de compresser.** Compressez d'abord, protégez ensuite. Si le PDF a déjà un mot de passe d'ouverture, retirez-le avec [Retirer le mot de passe d'un PDF](tool:unlock-pdf), compressez-le, puis protégez-le de nouveau avec [Protéger un PDF par mot de passe](tool:protect-pdf).

## En résumé

- Ce qui alourdit un PDF, ce sont les photos ; le texte ne prend presque pas de place.
- [Compresser un PDF](tool:compress-pdf) recompresse les photos et laisse le texte intact, dans votre navigateur.
- Commencez par le niveau recommandé ; passez à Fort si l'on vous demande un fichier très léger.
- Si cela ne suffit pas, supprimez des pages, divisez le PDF ou améliorez la numérisation.
- Si vous comptez ensuite modifier le PDF, le guide [Comment convertir un PDF en Word modifiable](guide:pdf-to-word) explique ce qui est conservé lors de la conversion.
`;

export default body;
