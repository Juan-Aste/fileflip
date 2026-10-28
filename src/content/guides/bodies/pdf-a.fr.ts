const body = `
Si un service de démarches en ligne, un tribunal ou la bibliothèque d'une université a déjà refusé votre PDF avec un message du type « le fichier doit être au format PDF/A », ce guide est pour vous. Il explique ce qu'est le PDF/A, pourquoi il est exigé, quelle version choisir et comment convertir un PDF ordinaire avec [PDF en PDF/A](tool:pdf-to-pdfa).

## Ce qu'est le PDF/A

Le PDF/A est une version du PDF conçue pour l'**archivage à long terme**. C'est une norme internationale (ISO 19005) qui définit un sous-ensemble du PDF avec une garantie : le document doit s'afficher exactement de la même façon dans de nombreuses années, dans n'importe quel logiciel, sans dépendre de quoi que ce soit d'extérieur.

Pour y parvenir, un fichier PDF/A :

- **Intègre toutes les polices** dans le fichier, pour que le texte s'affiche à l'identique même si l'ordinateur qui l'ouvre ne possède pas ces polices.
- **Fixe les couleurs** grâce à un profil colorimétrique, pour qu'elles ne changent pas selon l'écran ou l'imprimante.
- **Enregistre les métadonnées** (titre, auteur, dates) dans le fichier lui-même, dans un format normalisé.
- **N'autorise pas** ce qui pourrait cesser de fonctionner ou changer avec le temps : mots de passe et chiffrement, contenus chargés depuis Internet, JavaScript, audio et vidéo.

Un PDF ordinaire peut, par hasard, remplir la plupart de ces conditions, mais un PDF/A le garantit et le déclare dans le fichier.

## Qui l'exige et pourquoi

Il est exigé par les organismes qui doivent **conserver des documents pendant des années** et ne peuvent pas prendre le risque qu'un fichier ne s'ouvre plus ou s'affiche différemment :

- Les administrations et les plateformes de démarches en ligne.
- Les tribunaux et les systèmes de dépôt électronique.
- Les universités, pour le dépôt des thèses dans leurs archives ouvertes.
- Les services d'archives, les bibliothèques et certains systèmes de facturation électronique.

Chaque organisme indique la version qu'il accepte. Si la consigne dit seulement « PDF/A », le choix le plus sûr est généralement le PDF/A-2b.

## Les versions : 1b, 2b, 3b (et ce que signifie la lettre)

Le chiffre correspond à la version de la norme :

| Version | Basée sur | Utilisation |
| --- | --- | --- |
| PDF/A-1 | PDF 1.4 | La première. Pour les systèmes qui n'acceptent que cette version. Pas de transparence : elle est aplatie. |
| PDF/A-2 | PDF 1.7 | La plus acceptée aujourd'hui. Gère la transparence, les calques et la compression moderne. |
| PDF/A-3 | PDF 1.7 | Comme la 2, mais permet de joindre n'importe quel fichier dans le PDF (utilisé par exemple pour les factures électroniques qui embarquent leurs données en XML). |

La lettre indique le niveau de conformité :

- **b** (basic, basique) : garantit que le document **s'affiche** à l'identique. C'est le niveau que demandent presque toutes les démarches.
- **a** (accessible) : exige en plus que le document ait une structure balisée (titres, paragraphes, ordre de lecture), pour que les lecteurs d'écran puissent le lire. Cela suppose que le document d'origine ait été créé avec cette structure.
- **u** (Unicode) : en plus du niveau b, garantit que le texte peut être extrait et recherché correctement.

Notre outil produit du PDF/A-1b, 2b et 3b, ce qui couvre ce qu'exige la grande majorité des démarches.

## Comment convertir un PDF en PDF/A

1. Ouvrez [PDF en PDF/A](tool:pdf-to-pdfa) et choisissez un ou plusieurs PDF (jusqu'à 5 à la fois, de 15 Mo maximum chacun).
2. Choisissez la **Version PDF/A** : si la démarche n'en précise pas d'autre, **PDF/A-2b**.
3. Appuyez sur **Convertir en PDF/A** et téléchargez le résultat.

![L'outil PDF en PDF/A avec un document choisi et la version 2b sélectionnée](shot:pdfa-opciones "Le PDF/A-2b est sélectionné par défaut : c'est le plus accepté.")

La conversion se fait sur **notre serveur**, et non dans votre navigateur, car elle doit convertir les polices et les couleurs avec LibreOffice. Le fichier est transmis par une connexion chiffrée et traité en mémoire, sans être conservé. Lors de nos essais, les fichiers produits ont passé la validation de veraPDF, le validateur de référence pour le PDF/A.

## Ce qui peut changer lors de la conversion

Le contenu et les pages sont conservés, mais certains éléments ne sont pas autorisés par le format :

- **Mot de passe** : un PDF/A ne peut pas être chiffré. Si votre PDF a un mot de passe, retirez-le d'abord avec [Retirer le mot de passe d'un PDF](tool:unlock-pdf).
- **Liens et formulaires interactifs** : ils peuvent être perdus. Si le PDF est un formulaire, remplissez-le d'abord avec [Remplir un formulaire PDF](tool:fill-pdf-form) et enregistrez-le aplati.
- **Transparence en PDF/A-1b** : elle est aplatie. En pratique, on le remarque à peine, mais si le document utilise des effets de transparence, le PDF/A-2b les conserve.
- **Signatures électroniques avec certificat** : la conversion modifie le fichier, et une signature électronique antérieure n'est plus valable. Si vous devez signer électroniquement, convertissez d'abord en PDF/A et signez ensuite.

## Comment savoir si un PDF est déjà en PDF/A

Quand vous ouvrez un PDF/A dans Adobe Acrobat Reader, une barre en haut indique que le fichier déclare être conforme à la norme PDF/A et qu'il a été ouvert en lecture seule. D'autres lecteurs l'indiquent dans les propriétés du document.

Attention : cette barre signifie que le fichier **déclare** être en PDF/A, pas qu'il l'est réellement. Pour le vérifier, l'outil de référence est veraPDF, un validateur gratuit et open source qui confronte le fichier à la norme et liste les éventuels défauts.

## Conseils pour un dépôt qui ne sera pas refusé

- **Compressez avant, pas après** : si la démarche impose une taille maximale, allégez le PDF avec [Compresser un PDF](tool:compress-pdf), puis convertissez-le en PDF/A. Si vous compressez un PDF/A avec un outil qui n'en tient pas compte, il risque de ne plus être conforme à la norme.
- **Fusionnez avant de convertir** : si vous devez déposer plusieurs documents en un seul, réunissez-les avec [Fusionner des PDF](tool:merge-pdf) et convertissez le résultat.
- **Documents numérisés** : si le document est scanné, passez-le d'abord à l'[OCR](tool:ocr-pdf) pour que le texte soit recherchable, puis convertissez-le.
- **Signature manuscrite** : si vous devez signer à la main, ajoutez la signature avec [Signer un PDF](tool:sign-pdf) avant de convertir.

## En résumé

- Le PDF/A est un PDF fait pour l'archivage : il intègre les polices, fixe les couleurs et interdit tout ce qui pourrait cesser de fonctionner.
- Les administrations, les tribunaux, les universités et les services d'archives l'exigent.
- Si aucune version n'est précisée, utilisez le **PDF/A-2b** ; le **1b** seulement pour les systèmes anciens, le **3b** si vous avez besoin de pièces jointes.
- [PDF en PDF/A](tool:pdf-to-pdfa) convertit sur notre serveur, sans conserver le fichier.
- Retirez le mot de passe, remplissez les formulaires, compressez et fusionnez **avant** de convertir.
`;

export default body;
