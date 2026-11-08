const body = `
Un contrat vous revient « avec quelques petites retouches », un camarade vous envoie la version finale du travail de groupe ou la nouvelle rédaction d’un règlement est publiée. Lire les deux versions côte à côte et chercher les différences à l’œil est lent et peu fiable : un chiffre modifié ou un « ne… pas » ajouté passent facilement inaperçus. Ce guide explique comment comparer deux textes et voir exactement ce qui a été ajouté, supprimé ou modifié, et que faire quand les versions sont en PDF ou en Word.

## Comment comparer deux textes, étape par étape

1. Ouvrez [Comparer des textes](tool:compare-text).
2. Collez la version précédente dans **Texte d’origine** et la nouvelle dans **Nouveau texte**. Si vous les avez sous forme de fichiers texte, utilisez **Ouvrir un fichier** au-dessus de chaque zone.
3. Dans **Comparer par**, choisissez **Lignes** ou **Mots** (voir plus bas lequel convient selon le cas).
4. Si vous le souhaitez, cochez **Ignorer majuscules et minuscules** ou **Ignorer les espaces en trop**.
5. Appuyez sur **Comparer** et consultez le résultat sous **Différences**.

![Deux versions d’un contrat comparées ligne par ligne : les montants, le délai et un nouvel article sont mis en évidence](shot:comparar-textos-lineas "Par lignes : en rouge ce qui figurait dans le texte d’origine, en vert ce qu’apporte le nouveau texte.")

Au-dessus du résultat s’affiche un résumé, par exemple « 3 lignes modifiées, 1 ajoutée et aucune supprimée », qui permet de voir d’un coup d’œil l’ampleur des changements. Si les deux textes sont identiques, il indique « Les textes sont identiques. ».

La comparaison se fait dans votre navigateur : les textes ne sont envoyés à aucun serveur. Le résultat ne se met pas à jour tout seul : si vous corrigez l’une des zones, appuyez de nouveau sur **Comparer**.

## Comment lire le résultat

L’outil signale les différences par deux couleurs et, pour les mots, aussi par du barré et du souligné, pour qu’elles restent visibles même si vous distinguez mal les couleurs :

- **Rouge** (les mots sont aussi barrés) : ce qui figurait dans le texte d’origine et n’y est plus.
- **Vert** (les mots sont aussi soulignés) : ce qui apparaît dans le nouveau texte.
- Sans marque : ce qui n’a pas changé.

En mode **Lignes**, chaque ligne porte deux numéros : à gauche, son numéro dans le texte d’origine ; à droite, dans le nouveau. Les lignes précédées de « − » sur fond rouge viennent de l’original ; celles précédées de « + » sur fond vert, de la nouvelle version. Quand une ligne a changé, l’outil affiche l’ancienne et la nouvelle version et n’y met en évidence que les mots modifiés ; une ligne ajoutée ou supprimée en entier apparaît simplement sur son fond de couleur. Sur la capture, l’article 2 ne montre que « 200 » → « 500 » et « deux » → « trois ».

Le bouton **Inverser** fait passer le texte d’origine dans l’autre zone et inversement. Utile si vous les avez collés dans le mauvais ordre ; appuyez ensuite de nouveau sur **Comparer**.

## Par lignes ou par mots ?

**Lignes** est le mode classique des comparateurs de code et le meilleur quand le texte est organisé en lignes : listes, articles numérotés, textes de loi, code, données ou sous-titres.

**Mots** affiche tout le nouveau texte d’un seul tenant, avec les mots supprimés et ajoutés marqués à leur place. Les retours à la ligne et les espaces ne comptent pas comme des changements. C’est le mode le plus confortable pour de la prose : une dissertation, un article, un devoir, une lettre. C’est aussi celui qu’il faut choisir quand le texte vient d’un PDF, car les lignes y sont coupées là où elles s’arrêtaient sur la page : si une version a été remise en page, le mode par lignes donnerait l’impression que tout a changé. Dans ce mode, le résumé compte les mots ajoutés et supprimés.

![Un paragraphe comparé mot à mot : les mots supprimés sont barrés et les mots ajoutés soulignés](shot:comparar-textos-palabras "Par mots : le nouveau texte, avec les changements marqués à leur place.")

## Les deux options pour ignorer des différences

- **Ignorer majuscules et minuscules** : « Contrat » et « CONTRAT » comptent comme identiques. Pratique si une version a mis les titres en capitales et que vous ne voulez pas que cela masque les changements de fond.
- **Ignorer les espaces en trop** : en mode **Lignes**, les espaces en début et en fin de ligne et les espaces doubles à l’intérieur ne comptent pas. C’est l’option pour du code réindenté ou un texte copié depuis un endroit qui ajoute des espaces. En mode **Mots**, les espaces ne comptent déjà pas, donc cette case ne change rien.

## Si les versions sont en PDF ou en Word

**Ouvrir un fichier** n’accepte que des fichiers texte : .txt, .md, .csv, .tsv, .json, .html, .xml, .srt, .vtt et .log, jusqu’à 2 millions de caractères, et détecte l’encodage automatiquement. Il n’ouvre pas directement les PDF ni les fichiers Word : il faut d’abord en extraire le texte.

- **PDF avec du texte sélectionnable** (produit par un traitement de texte ou un logiciel) : passez-le dans [PDF en texte](tool:pdf-to-text). L’outil accepte plusieurs PDF à la fois ; téléchargez le .txt de chaque version et chargez-le avec **Ouvrir un fichier**. Si vous cochez **Indiquer le début de chaque page**, le texte comporte un repère par page, ce qui aide à retrouver la page où se trouve chaque changement.
- **PDF numérisé** (les pages sont des images) : utilisez [OCR de PDF numérisé](tool:ocr-pdf), choisissez la **Langue du texte** et, sous **Résultat**, **Texte seulement (.txt)**. Il traite jusqu’à 100 pages par PDF.
- **Photo d’une page imprimée** : [Image en texte (OCR)](tool:image-to-text) en extrait le texte.
- **Word** : ouvrez le document, sélectionnez tout (Ctrl+A), copiez et collez dans la zone. Chaque paragraphe de Word devient une ligne ; avec de longs paragraphes, le mode **Mots** est donc plus lisible.

Avec un texte reconnu par OCR, gardez en tête que la reconnaissance peut confondre un caractère de temps en temps (« l » pour « 1 », une virgule pour un point). Si un changement vous paraît bizarre, vérifiez-le dans le document original avant de le tenir pour acquis.

Une fois repéré ce qu’il faut corriger dans un PDF, vous pouvez le faire avec [Modifier un PDF](tool:edit-pdf) ; le guide [Comment convertir un PDF en Word](guide:pdf-to-word) explique comment faire si vous préférez le modifier dans Word.

## Cas concrets

- **Un contrat qui vous revient corrigé** : comparez par **Lignes** ou par **Mots** et concentrez-vous sur les montants, les dates, les délais et les mots comme « ne… pas », « uniquement » ou « sauf », qui changent le sens avec très peu. Avant de signer, le guide [Comment signer un PDF](guide:sign-pdf) explique l’étape suivante.
- **Un devoir ou un mémoire** : comparez par **Mots** la version que vous avez rendue et la version corrigée pour voir tout ce que votre enseignant ou votre camarade a modifié.
- **Un texte juridique ou un règlement** : avec des articles numérotés, le mode **Lignes** montre quels articles ont été ajoutés, lesquels ont été supprimés et quels mots ont changé dans chacun.
- **Du code ou des fichiers de configuration** : comparez par **Lignes**, cochez **Ignorer les espaces en trop** si l’indentation a changé et, si vous devez partager la modification, appuyez sur **Télécharger le .diff**. Ce fichier est au format unifié que lisent git et les outils de revue de code. Attention : le .diff enregistre tous les changements, y compris ceux de casse ou d’espaces que vous avez choisi d’ignorer à l’écran.
- **Deux listes** (d’invités, de produits) : triez-les d’abord avec [Supprimer les lignes en double](tool:remove-duplicate-lines), en choisissant **A → Z** sous **Trier**, puis comparez-les par lignes. Vous voyez ainsi les éléments qui manquent dans l’une ou l’autre sans qu’un ordre différent brouille le résultat.

Si les textes n’ont presque rien en commun, la comparaison par lignes s’arrête et affiche un avertissement : dans ce cas, comparez des parties plus courtes, par exemple chapitre par chapitre.

## Autres outils utiles

- [Compteur de mots et de caractères](tool:word-counter) : pour vérifier que la nouvelle version respecte toujours la limite de mots d’un devoir ou d’un formulaire.
- [Convertir majuscules et minuscules](tool:case-converter) : pour harmoniser les titres en majuscules ou en minuscules dans la version finale.

## En résumé

- Collez les deux versions dans [Comparer des textes](tool:compare-text) et appuyez sur **Comparer** : en rouge barré ce qui a disparu, en vert souligné ce qui a été ajouté.
- **Lignes** pour les listes, les articles et le code ; **Mots** pour la prose et le texte tiré d’un PDF.
- Pour un PDF ou un fichier Word, extrayez d’abord le texte avec PDF en texte, l’OCR de PDF numérisé ou un simple copier-coller.
- Tout se passe dans votre navigateur, sans envoyer les textes.
`;

export default body;
