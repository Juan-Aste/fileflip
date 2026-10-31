const body = `
Un relevé bancaire, la liste de prix d'un fournisseur, le rapport qu'on vous a transmis : beaucoup de tableaux arrivent en PDF, et pour additionner, filtrer ou trier les données, il vous les faut dans un tableur. Le copier-coller depuis le lecteur PDF ne marche presque jamais bien : tout atterrit dans une seule colonne, ou les nombres arrivent sous forme de texte et Excel refuse de les additionner. Ce guide montre comment faire avec [PDF en Excel](tool:pdf-to-excel), comment vérifier le résultat et quoi faire quand le PDF est numérisé.

## Pourquoi le copier-coller ne suffit pas

Un PDF ne contient pas de tableaux. Il contient des morceaux de texte isolés avec leur position sur la page : « 84,35 » se trouve à tant de millimètres du bord, « Supermarché » un peu plus à gauche. Les traits que vous voyez comme bordures de cellules sont des dessins sans lien avec le texte. Quand vous copiez, le lecteur PDF vous donne le texte dans un certain ordre, et la structure en lignes et en colonnes est perdue.

Notre outil reconstruit le tableau à partir de ces positions : il forme les lignes avec le texte situé à la même hauteur et les colonnes d'après son alignement, exactement comme le ferait une personne qui regarde la page.

## Avant de commencer : vérifiez que le PDF contient du texte

Ouvrez le PDF et essayez de sélectionner un nombre avec la souris. S'il se sélectionne, le PDF contient du texte et l'outil fonctionnera : c'est le cas habituel des PDF produits par une banque, un logiciel de facturation ou un programme comme Excel ou Word.

Si au contraire c'est toute la page qui se sélectionne comme une image, le PDF est un document scanné ou une photo. Lisez la suite : nous expliquons plus bas quoi faire dans ce cas.

## Comment convertir un tableau PDF en Excel, étape par étape

1. Ouvrez [PDF en Excel](tool:pdf-to-excel) et choisissez le PDF.
2. Patientez quelques secondes : l'outil cherche les tableaux et vous indique combien il en a détecté.
3. Vérifiez l'**Aperçu**. S'il y a plusieurs tableaux, choisissez-les dans la liste pour les voir un par un.
4. Choisissez le format : **Excel (XLSX)** ou **CSV**.
5. Choisissez comment répartir les tableaux dans les **Feuilles** : une feuille par page, une par tableau ou tout dans une feuille.
6. Appuyez sur **Convertir en Excel** et téléchargez le fichier.

![Aperçu d'un tableau détecté dans un relevé en PDF](shot:pdf-excel-vista-previa "L'outil a détecté deux tableaux dans un relevé de deux pages et affiche le premier avant le téléchargement.")

Tout se passe dans votre navigateur : le PDF n'est jamais envoyé sur un serveur, ce qui compte avec des relevés bancaires et des factures. L'outil accepte des PDF jusqu'à 100 Mo.

## Vérifiez l'aperçu avant de télécharger

L'aperçu est l'étape la plus importante. Comme les colonnes sont déduites de l'alignement, il y a des cas où le résultat mérite un coup d'œil :

- **Cellules avec du texte sur deux lignes** : un long libellé coupé sur deux lignes peut donner deux lignes dans le tableau. Dans le tableur, il suffit de fusionner ces cellules.
- **Cellules qui s'étendent sur plusieurs colonnes** : un titre qui couvre toute la largeur du tableau peut se retrouver dans une seule cellule à gauche.
- **Colonnes très rapprochées** : si deux colonnes se touchent presque dans le PDF, leurs valeurs peuvent tomber dans la même cellule.

Sur la capture ci-dessus, le relevé d'exemple est sorti parfaitement : date, libellé, débit et crédit chacun dans sa colonne, et les cellules vides (une opération a un débit mais pas de crédit) sont restées vides, sans décaler les valeurs.

## De vrais nombres, avec virgule ou point décimal

Ce qui fait gagner le plus de temps, c'est que les montants sortent sous forme de nombres et non de texte : vous pouvez les additionner avec une formule tout de suite.

L'outil détecte, tableau par tableau, comment les nombres sont écrits :

- Avec une **espace comme séparateur des milliers** et une virgule décimale, comme en France : 1 250,5.
- Avec une **virgule décimale** et un point pour les milliers, comme en Espagne, en Allemagne ou dans une grande partie de l'Amérique latine : 1.234,56.
- Avec un **point décimal**, comme aux États-Unis, au Royaume-Uni ou au Mexique : 1,234.56.

Si la détection se trompe (cela peut arriver dans des tableaux avec peu de nombres, où une valeur comme 1,250 peut signifier mille deux cent cinquante ou un virgule vingt-cinq), choisissez vous-même le séparateur dans **Séparateur décimal des nombres**.

Certaines données sont volontairement laissées en texte : les codes avec des zéros au début (comme 007, pour que les zéros ne disparaissent pas), les dates, les pourcentages et les montants collés au symbole de la devise. Ils s'affichent exactement comme dans le PDF et, si vous en avez besoin sous forme de nombres ou de dates, Excel les convertit avec **Données → Convertir**.

## Une feuille par page, par tableau ou tout ensemble

- **Une feuille par page** est l'option la plus naturelle pour un document court ou quand chaque page traite d'un sujet différent.
- **Une feuille par tableau** est utile quand une page contient plusieurs tableaux distincts, comme un récapitulatif et un détail.
- **Tout dans une feuille** est la meilleure option pour un relevé de plusieurs pages : toutes les opérations se retrouvent les unes sous les autres, avec une ligne vide entre un tableau et le suivant. Si l'en-tête se répète à chaque page, il apparaît plusieurs fois : supprimez ces lignes et les lignes vides, et vous pourrez trier ou filtrer l'ensemble d'un coup.

Si vous choisissez le CSV, chaque feuille devient un fichier CSV séparé. Pour ouvrir ces fichiers dans Excel sans problème d'accents, laissez cochée l'option **UTF-8 avec BOM** ; le guide [CSV ou Excel : différences et comment ouvrir un CSV correctement](guide:csv-vs-excel) explique pourquoi.

## Si le PDF est numérisé

Un PDF numérisé ne contient pas de texte, seulement une image de chaque page : l'outil vous indique donc qu'il ne peut pas détecter de tableaux. La marche à suivre :

1. Passez le PDF dans [OCR de PDF numérisé](tool:ocr-pdf) en choisissant la langue du document. L'OCR reconnaît les lettres et ajoute une couche de texte invisible.
2. Utilisez le PDF obtenu dans [PDF en Excel](tool:pdf-to-excel).

Cela fonctionne, mais avec une mise en garde importante : **l'OCR peut mal lire certains caractères**, et dans un tableau de chiffres, c'est grave (un 8 lu comme un 3, une virgule décimale perdue). Comparez les nombres de l'aperçu avec l'original, surtout les totaux. Avec des numérisations nettes et droites, les erreurs sont rares ; avec des photos de travers ou floues, elles sont nombreuses. Si le document est une photo prise au téléphone, passez-la d'abord dans [Scanner un document](tool:scan-document) pour la redresser et nettoyer le fond.

## Ensuite : travailler avec le tableur

Une fois les données dans Excel, vous pouvez trier, filtrer, additionner ou créer un tableau croisé dynamique. Quelques outils qui peuvent servir ensuite :

- [Fusionner des fichiers Excel](tool:merge-excel), si vous avez converti plusieurs relevés (un par mois) et voulez toutes les opérations dans un seul fichier, les unes sous les autres.
- [Excel en CSV](tool:excel-to-csv), si vous devez charger les données dans un autre système qui demande du CSV.
- [PDF en Word](conv:pdf-docx), si en plus du tableau vous avez besoin du texte du document pour le modifier.

## En résumé

- Un PDF ne contient pas de tableaux : il faut les reconstruire à partir de la position du texte.
- [PDF en Excel](tool:pdf-to-excel) le fait dans votre navigateur, avec un aperçu et de vrais nombres.
- Vérifiez l'aperçu : les cellules sur deux lignes et les colonnes très rapprochées peuvent demander une retouche.
- Si les nombres sortent en texte, choisissez vous-même le séparateur décimal.
- Si le PDF est numérisé, passez-le d'abord à l'OCR et vérifiez soigneusement les chiffres.
`;

export default body;
