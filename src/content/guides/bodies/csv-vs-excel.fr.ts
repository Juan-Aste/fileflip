const body = `
Un fichier CSV ressemble à un tableur, s'ouvre avec Excel et comporte des lignes et des colonnes. Mais ce n'est pas un fichier Excel, et beaucoup des mauvaises surprises qu'il réserve (« tout s'est mis dans une seule colonne », « les accents s'affichent en symboles bizarres », « les zéros de mes codes ont disparu ») viennent de cette différence. Ce guide explique ce qu'est chaque format, quand utiliser l'un ou l'autre et comment ouvrir un CSV sans abîmer les données.

## Ce qu'est un CSV et ce qu'est un fichier Excel

Un **CSV** (« comma-separated values », valeurs séparées par des virgules) est un fichier texte brut. Chaque ligne correspond à une ligne du tableau et les valeurs de chaque ligne sont séparées par un caractère, en général une virgule. Si vous l'ouvrez avec le Bloc-notes, vous voyez quelque chose comme ceci :

\`\`\`
Client,Ville,Montant
Lefèvre,Besançon,1250.50
Dubois,Liège,980
\`\`\`

Un fichier **Excel** (XLSX, ou XLS dans les anciennes versions) est un format beaucoup plus riche : il peut contenir plusieurs feuilles, des formules, des formats de nombre et de date, des couleurs, des largeurs de colonne, des graphiques et des filtres.

| | CSV | Excel (XLSX) |
| --- | --- | --- |
| Feuilles | Un seul tableau | Plusieurs feuilles |
| Formules | Non : uniquement des valeurs | Oui |
| Mise en forme (couleurs, largeurs, gras) | Non | Oui |
| Types de données | Tout est du texte ; c'est le logiciel qui l'ouvre qui l'interprète | Nombres, dates et texte sont enregistrés comme tels |
| Qui l'ouvre | N'importe quel logiciel, base de données ou langage de programmation | Excel, LibreOffice, Google Sheets, Numbers |

## Quand utiliser l'un ou l'autre

Utilisez le **CSV** quand les données partent vers un autre système : importer des contacts, envoyer un catalogue sur une boutique en ligne, charger des données dans une base de données ou un logiciel de comptabilité. C'est le format d'échange universel justement parce qu'il est simple.

Utilisez **Excel** quand une personne va travailler avec les données : les consulter, faire des calculs, filtrer, partager un rapport. Et chaque fois que le fichier comporte plusieurs feuilles, des formules ou une mise en forme que vous voulez garder.

## Les trois problèmes typiques à l'ouverture d'un CSV dans Excel

### 1. Tout se retrouve dans une seule colonne

Le séparateur du CSV ne correspond pas à celui qu'attend votre Excel. Dans les pays où la virgule sert de séparateur décimal (la France, la Belgique, une grande partie de l'Europe et de l'Amérique latine), Excel utilise par défaut le **point-virgule** pour séparer les valeurs. Donnez-lui un CSV séparé par des virgules, comme celui de l'exemple, et il met chaque ligne entière dans la colonne A. L'inverse arrive aussi : un CSV avec des points-virgules ouvert dans un Excel en anglais.

### 2. Les lettres accentuées s'affichent mal

Si « Lefèvre » apparaît sous la forme « LefÃ¨vre » ou « Besançon » sous la forme « BesanÃ§on », le problème vient de l'encodage. La plupart des systèmes actuels enregistrent les CSV en UTF-8, mais Excel sous Windows, si le fichier ne l'indique pas, le lit comme s'il était dans l'ancien encodage de Windows, et chaque lettre accentuée se transforme en deux symboles. Il en va de même pour tous les caractères qui ne sont pas de l'anglais de base : é, ç, ñ, caractères chinois, etc.

Le moyen de l'indiquer est une marque invisible placée au début du fichier, appelée **BOM**. Avec elle, Excel affiche correctement les accents, la cédille et les autres alphabets.

### 3. Des zéros ou des chiffres disparaissent, ou des valeurs changent

Excel interprète chaque valeur à l'ouverture d'un CSV, et il se trompe parfois :

- Les **codes avec des zéros au début** (007, un code postal comme 01000) perdent leurs zéros parce qu'Excel les prend pour des nombres.
- Les **nombres longs**, comme un numéro de carte, de compte ou d'identification de plus de 15 chiffres, sont arrondis ou affichés en notation scientifique : Excel ne garde que 15 chiffres significatifs.
- Certaines valeurs se transforment en **dates** sans que vous l'ayez demandé : un « 1-2 » peut devenir le 1er février.

Le plus grave, c'est que si vous enregistrez ensuite le fichier depuis Excel, ces changements sont enregistrés et les données d'origine sont perdues.

## Comment ouvrir un CSV sans l'abîmer

### Option 1 : le convertir en Excel avant de l'ouvrir

[CSV en Excel](tool:csv-to-excel) lit le CSV dans votre navigateur et produit un XLSX qu'Excel ouvre correctement :

- L'outil détecte tout seul le séparateur (virgule, point-virgule, tabulation ou barre verticale) et l'encodage, y compris l'encodage Windows des CSV enregistrés depuis Excel.
- Il transforme les valeurs numériques en vrais nombres, y compris celles qui ont une virgule décimale dans un CSV séparé par des points-virgules.
- Il garde en texte les codes avec des zéros au début et les nombres de plus de 15 chiffres, pour qu'ils ne soient pas perdus.
- Il laisse les dates telles quelles, en texte, pour qu'elles ne soient pas mal interprétées.

C'est l'option la plus sûre si vous avez reçu le CSV d'une banque, d'une boutique en ligne ou d'un logiciel de facturation et que vous voulez simplement le consulter et travailler dessus.

### Option 2 : l'importer depuis Excel

Dans les versions récentes d'Excel, au lieu d'ouvrir le CSV par un double-clic, allez dans **Données → Obtenir des données → À partir d'un fichier → À partir d'un fichier texte/CSV** (dans certaines versions, directement **Données → À partir d'un fichier texte/CSV**). Une fenêtre s'ouvre, où vous pouvez choisir l'**Origine du fichier** (65001 : Unicode UTF-8) et le **Délimiteur**, et voir un aperçu avant le chargement. Si une colonne contient des codes avec des zéros au début, vous pouvez la définir comme texte dans **Transformer les données**.

### Option 3 : Google Sheets ou LibreOffice

Google Sheets lit correctement les CSV en UTF-8 et vous laisse choisir le séparateur à l'importation. LibreOffice Calc affiche une boîte de dialogue avec l'encodage, le séparateur et le type de chaque colonne avant d'ouvrir le fichier.

## Comment enregistrer un CSV qui s'ouvre bien dans Excel

Si c'est vous qui créez le CSV pour qu'une autre personne l'ouvre dans Excel, [Excel en CSV](tool:excel-to-csv) vous laisse choisir :

1. Choisissez le fichier Excel. S'il contient plusieurs feuilles, choisissez celle à convertir, ou toutes (un CSV par feuille).
2. Dans **Séparateur du CSV**, choisissez **Point-virgule ( ; ) et virgule décimale** si le destinataire a Excel en français (ou en espagnol, en portugais, en allemand…) ; **Virgule ( , ) et point décimal** s'il a Excel en anglais ou si le CSV part vers un autre système.
3. Laissez cochée l'option **UTF-8 avec BOM**.
4. Appuyez sur **Convertir en CSV** et téléchargez le fichier.

![Les options d'Excel en CSV : feuille, séparateur et UTF-8 avec BOM](shot:excel-csv-opciones "Avec le point-virgule et le BOM, le CSV s'ouvre par un double-clic dans un Excel en français, chaque valeur dans sa colonne et les accents intacts.")

Les nombres sortent avec toutes leurs décimales (et non arrondis comme à l'écran) et les codes avec des zéros au début sont conservés. La conversion se fait dans votre navigateur, sans envoyer le fichier.

Un détail : si le CSV est destiné à un système et non à une personne, vérifiez ce qu'attend ce système. Certains logiciels ne s'attendent pas au BOM et le prennent pour une partie du nom de la première colonne ; dans ce cas, décochez l'option.

## D'autres conversions utiles

- [Excel en JSON](tool:excel-to-json) et [JSON en Excel](tool:json-to-excel), pour des données qui viennent d'une application web ou qui y vont.
- [Fusionner des fichiers Excel](tool:merge-excel), pour réunir plusieurs CSV ou tableurs dans un seul classeur.
- [PDF en Excel](tool:pdf-to-excel), si le tableau vous est parvenu en PDF. Le guide [Comment convertir un tableau PDF en Excel](guide:pdf-table-to-excel) explique comment vérifier le résultat.

## En résumé

- Le CSV est du texte brut pour échanger des données ; Excel est un tableur avec des feuilles, des formules et une mise en forme.
- Si tout tombe dans une seule colonne, c'est le séparateur ; si les accents s'affichent mal, c'est l'encodage (il manque le BOM).
- Ouvrir un CSV par un double-clic peut supprimer des zéros et arrondir les nombres longs : convertissez-le d'abord avec [CSV en Excel](tool:csv-to-excel) ou importez-le via **Données → À partir d'un fichier texte/CSV**.
- Pour créer un CSV qui s'ouvre bien dans un Excel en français : le point-virgule et l'UTF-8 avec BOM.
`;

export default body;
