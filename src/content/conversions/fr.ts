import type { ConversionContentMap } from "./types";

// Facts the texts must respect (review if the engine changes):
// - Office documents → PDF: LibreOffice (Gotenberg) on our server;
//   free plan: up to 15 MB per file and 5 files at a time.
// - PDF → Word: text is extracted with pdf.js and rebuilt into paragraphs and
//   headings, one Word page per PDF page, up to 300 pages; no images or
//   tables; a scanned PDF fails (it must go through OCR PDF first).

export const fr: ConversionContentMap = {
  "pdf>docx": {
    when: [
      "Convertir un PDF en Word est utile quand vous devez réutiliser ou corriger le texte : mettre à jour un CV dont vous n’avez plus que le PDF, citer des passages d’un rapport, traduire un document ou reprendre un contrat pour le modifier. Le copier-coller depuis une visionneuse PDF coupe souvent les lignes n’importe où ; ici, le texte arrive déjà regroupé en paragraphes.",
      "Si vous voulez seulement changer un mot, ajouter une signature ou masquer une information, inutile de passer par Word : il est plus rapide d’utiliser Modifier un PDF, qui garde la mise en page d’origine intacte.",
    ],
    differences: [
      "Un PDF est conçu pour s’afficher à l’identique sur n’importe quel écran et n’importe quelle imprimante : chaque caractère occupe une position fixe sur la page, et le fichier ne sait pas ce qu’est un paragraphe, un tableau ou une liste. Un document Word, à l’inverse, enregistre le texte comme un flux qui se réorganise au fil de la saisie.",
      "C’est pourquoi convertir un PDF en Word ne consiste pas à « ouvrir » le PDF, mais à reconstruire le document : il faut deviner quelles lignes forment un paragraphe et lesquelles sont des titres. Cette reconstruction fonctionne très bien avec des documents de texte suivi, moins bien avec des mises en page complexes.",
    ],
    kept: [
      "Tout le texte sélectionnable, dans l’ordre de lecture.",
      "Les paragraphes reconstitués (sans coupure en milieu de phrase) et les titres balisés comme titres Word.",
      "La taille de police approximative et le format de page du PDF.",
      "Un saut de page pour chaque page du PDF, pour faciliter la comparaison avec l’original.",
    ],
    lost: [
      "Les images, les logos et les graphiques ne sont pas repris.",
      "Les tableaux et les colonnes deviennent des paragraphes isolés : le texte est là, mais il faut le remettre en forme.",
      "La police exacte, les couleurs et les en-têtes ou pieds de page répétés peuvent changer.",
    ],
    limits: [
      "Cela ne fonctionne qu’avec des PDF qui contiennent du texte. Si le PDF est une photo ou un scan, il n’y a aucun caractère à extraire et la conversion signale une erreur : passez-le d’abord dans « OCR de PDF numérisé », qui reconnaît le texte, puis convertissez-le en Word.",
      "Jusqu’à 300 pages sont converties par fichier. Avec l’offre gratuite, chaque fichier peut peser jusqu’à 15 Mo. Les PDF protégés par un mot de passe d’ouverture doivent être déverrouillés au préalable (avec « Retirer le mot de passe d’un PDF », si vous connaissez le mot de passe).",
    ],
    steps: [
      "Choisissez le PDF (ou faites-le glisser). Pour vérifier avant, ouvrez le PDF et essayez de sélectionner le texte à la souris : si c’est impossible, il s’agit d’un scan.",
      "Laissez Word comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le .docx et ouvrez-le dans Word, LibreOffice ou Google Docs.",
      "Vérifiez les tableaux et les listes, qui demandent souvent une retouche, et réinsérez les images dont vous avez besoin.",
    ],
    faq: [
      {
        q: "Pourquoi mon PDF ne se convertit-il pas en Word ?",
        a: "Presque toujours parce que le PDF est un scan ou une photo : il contient une image de la page, pas des caractères. Passez-le dans « OCR de PDF numérisé » et convertissez le résultat. La conversion échoue aussi si le PDF est protégé par un mot de passe d’ouverture.",
      },
      {
        q: "Le fichier Word est-il identique au PDF ?",
        a: "Pour le texte, oui ; pour la mise en page, pas entièrement. Les paragraphes et les titres sont bien restitués, mais les tableaux, les colonnes et les images ne sont pas reconstruits. Pour des documents de texte suivi (lettres, rapports, contrats), le résultat est modifiable tout de suite.",
      },
      {
        q: "Puis-je modifier un PDF sans le convertir en Word ?",
        a: "Oui. Pour de petites modifications (ajouter du texte ou une signature, masquer une information, remplir un formulaire), utilisez Modifier un PDF : la mise en page d’origine reste intacte et aucune conversion n’est nécessaire.",
      },
      {
        q: "Mes documents sont-ils conservés ?",
        a: "La conversion PDF vers Word se fait sur notre serveur, car elle demande davantage de traitement. Le fichier est transmis de façon chiffrée, n’est utilisé à aucune autre fin et est supprimé en moins d’une heure.",
      },
    ],
  },

  "docx>pdf": {
    when: [
      "Convertir un Word en PDF est le réflexe habituel avant d’envoyer un CV, de rendre un devoir, de déposer un dossier administratif ou d’envoyer un devis : le PDF s’affiche de la même façon sur n’importe quel ordinateur ou téléphone, même si votre destinataire n’a pas Word ou en a une autre version, et personne ne le modifie par erreur.",
      "C’est aussi la bonne solution quand un portail n’accepte que le PDF, ou quand vous voulez imprimer ailleurs sans que les marges se décalent.",
    ],
    differences: [
      "Un .docx est un document modifiable : le texte se réorganise selon les polices installées, le format de page et la version du logiciel. C’est pourquoi un même fichier Word peut s’afficher différemment sur deux ordinateurs.",
      "Le PDF fige chaque page telle qu’elle apparaît au moment de la conversion, polices incluses. En contrepartie, il devient peu pratique à modifier : s’il faut changer quelque chose ensuite, le mieux est de corriger le Word et de le reconvertir.",
    ],
    kept: [
      "Le texte avec ses styles, les tableaux, les images, les listes, les en-têtes et les pieds de page.",
      "Les numéros de page et les sauts de page du document.",
      "Les liens, qui restent actifs dans le PDF.",
      "Le format de papier et les marges définis dans le Word.",
    ],
    lost: [
      "Les commentaires et le suivi des modifications ne s’impriment pas comme dans le mode révision de Word : acceptez ou refusez les modifications avant la conversion pour être sûr du résultat.",
      "Si le document utilise une police peu courante absente du serveur, elle est remplacée par une police aux dimensions proches, et certaines lignes peuvent se décaler.",
      "Les macros et les champs à mise à jour automatique ne sont pas exécutés : le PDF affiche la dernière valeur enregistrée.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite, vous pouvez convertir jusqu’à 5 fichiers à la fois, de 15 Mo maximum chacun.",
      "Les documents protégés par un mot de passe d’ouverture ne peuvent pas être convertis : retirez le mot de passe dans Word avant d’importer le fichier.",
    ],
    steps: [
      "Enregistrez vos dernières modifications dans Word et, si vous avez utilisé le suivi des modifications, acceptez-les ou refusez-les.",
      "Choisissez le fichier .docx (ou plusieurs) et laissez PDF comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le PDF.",
      "Ouvrez-le et vérifiez les sauts de page avant de l’envoyer, surtout si vous avez utilisé des polices particulières.",
    ],
    faq: [
      {
        q: "Pourquoi le PDF n’a-t-il pas la même police que mon Word ?",
        a: "Parce que cette police n’est pas installée sur le serveur et qu’elle a été remplacée par une police proche. Les polices courantes (comme Arial, Times New Roman ou Calibri) ont des équivalents aux mêmes dimensions. Si vous avez besoin de la police exacte, vous pouvez aussi exporter en PDF depuis votre propre Word.",
      },
      {
        q: "Peut-on encore modifier le PDF ?",
        a: "Pour de petites modifications, oui, avec Modifier un PDF. Pour des changements importants, mieux vaut modifier le Word d’origine et le reconvertir : repasser le PDF en Word fait perdre les images et les tableaux.",
      },
      {
        q: "Puis-je alléger le PDF ?",
        a: "Oui. Si le document contient beaucoup de photos, passez le PDF dans Compresser un PDF : l’outil réduit les images et diminue souvent nettement la taille du fichier, sans que le texte perde en qualité.",
      },
      {
        q: "Que devient mon document après la conversion ?",
        a: "Il est converti sur notre serveur via une connexion chiffrée, n’est utilisé à aucune autre fin et est supprimé en moins d’une heure.",
      },
    ],
  },

  "doc>pdf": {
    when: [
      "Les fichiers .doc sont des documents Word 97 à 2003. On en trouve encore dans les archives des bureaux, des écoles et des cabinets : modèles de contrat, courriers, formulaires qui circulent depuis des années. Les convertir en PDF est le moyen le plus simple de les partager ou de les archiver sans dépendre d’un logiciel capable de bien les ouvrir chez le destinataire.",
      "Si vous comptez continuer à le modifier, ouvrez-le plutôt dans Word ou LibreOffice et enregistrez-le en .docx ; pour l’envoyer ou l’imprimer, le PDF suffit.",
    ],
    differences: [
      "Le .doc est un ancien format binaire, antérieur au .docx (qui est du XML compressé). Les logiciels actuels l’ouvrent, mais chacun interprète certains détails à sa façon : c’est pourquoi un vieux .doc peut s’afficher un peu différemment d’un ordinateur à l’autre.",
      "Une fois le fichier converti en PDF, cet aspect est figé : ce que vous voyez dans le PDF est ce que verra toute personne qui l’ouvre, sur n’importe quel appareil.",
    ],
    kept: [
      "Le texte, les styles, les tableaux, les images, les en-têtes et les pieds de page.",
      "La numérotation des pages et le format de papier du document.",
      "Les accents et les caractères spéciaux.",
    ],
    lost: [
      "Les éléments d’époque comme WordArt, les objets incorporés provenant d’autres logiciels ou les dessins réalisés avec les anciens outils peuvent s’afficher différemment ou sous forme d’image figée.",
      "Les polices absentes du serveur sont remplacées par d’autres aux dimensions proches.",
      "Les macros ne sont pas exécutées.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice, qui lit très bien le format .doc. Avec l’offre gratuite : jusqu’à 5 fichiers à la fois, de 15 Mo maximum chacun.",
      "Les .doc protégés par mot de passe ne peuvent pas être convertis.",
    ],
    steps: [
      "Choisissez le fichier .doc (ou plusieurs à la fois, par exemple tout un dossier d’anciens modèles).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez les PDF (avec plusieurs fichiers, vous pouvez tous les récupérer d’un coup dans un ZIP).",
    ],
    faq: [
      {
        q: "Un .doc, est-ce la même chose qu’un .docx ?",
        a: "Non. Le .doc est le format de Word jusqu’à 2003, le .docx celui de Word 2007 et des versions suivantes. Les deux se convertissent aussi bien en PDF ; le .docx donne souvent un résultat plus fidèle pour les mises en page complexes.",
      },
      {
        q: "Mon vieux .doc s’affiche bizarrement dans le PDF : que faire ?",
        a: "S’il contient du WordArt ou des objets incorporés, ouvrez-le dans Word ou LibreOffice, enregistrez-le en .docx et convertissez ce nouveau fichier. Vérifiez aussi qu’il n’utilise pas de polices très rares.",
      },
      {
        q: "Mes fichiers sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure. Ils ne sont utilisés à aucune autre fin.",
      },
    ],
  },

  "xlsx>pdf": {
    when: [
      "Convertir un Excel en PDF permet d’envoyer un tableur que votre destinataire doit seulement consulter : un devis, une liste de prix, un planning, une note de frais ou un décompte. Le PDF ne peut pas être modifié par erreur, s’ouvre sur n’importe quel téléphone et s’imprime partout de la même façon.",
      "Si la personne doit travailler sur les données (filtrer, additionner, copier), envoyez-lui plutôt le fichier Excel ou un CSV : dans le PDF, les chiffres sont visibles, mais ils ne forment plus un tableau sur lequel on peut calculer.",
    ],
    differences: [
      "Une feuille Excel n’a pas de pages : c’est une grille qui peut être bien plus large et plus longue qu’une feuille de papier, avec des formules qui se recalculent. Le PDF, lui, est organisé en pages fixes.",
      "Lors de la conversion, la feuille est donc répartie en pages selon les paramètres d’impression enregistrés dans le fichier : orientation, zone d’impression, marges et option d’ajustement à une page en largeur. L’aperçu avant impression d’Excel est ce qui se rapproche le plus du résultat.",
    ],
    kept: [
      "Les valeurs telles qu’elles s’affichent dans les cellules (le résultat des formules, pas la formule).",
      "La mise en forme : bordures, couleurs de remplissage, gras, formats de nombre et de date.",
      "Les graphiques et les images insérées.",
      "Toutes les feuilles qui ont du contenu, les unes après les autres.",
    ],
    lost: [
      "Les formules, les filtres et les tableaux croisés dynamiques ne fonctionnent plus : il ne reste qu’un instantané des valeurs.",
      "Si la feuille est plus large que la page et n’est pas configurée pour s’y ajuster, les colonnes de droite passent sur des pages séparées.",
      "Les feuilles masquées, les commentaires et les macros ne sont pas inclus.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite, jusqu’à 5 fichiers à la fois, de 15 Mo maximum chacun. Les très grands tableurs (des dizaines de milliers de lignes) peuvent prendre du temps ou produire des centaines de pages.",
      "Les fichiers protégés par un mot de passe d’ouverture ne peuvent pas être convertis.",
    ],
    steps: [
      "Dans Excel, vérifiez l’aperçu avant impression : choisissez l’orientation paysage si le tableau est large et « Ajuster toutes les colonnes sur une page » pour qu’il ne soit pas coupé. Enregistrez le fichier.",
      "Choisissez le .xlsx et laissez PDF comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le PDF.",
      "Si une colonne s’est retrouvée sur une autre page, ajustez les paramètres d’impression dans Excel et reconvertissez le fichier.",
    ],
    faq: [
      {
        q: "Pourquoi mon tableau est-il coupé sur plusieurs pages ?",
        a: "Parce que la feuille est plus large que la page. Dans Excel, sous l’onglet « Mise en page », choisissez l’orientation paysage et un ajustement à 1 page en largeur, enregistrez, puis reconvertissez.",
      },
      {
        q: "Puis-je convertir une seule feuille ?",
        a: "Toutes les feuilles qui ont du contenu sont converties. Si vous n’en voulez qu’une, enregistrez une copie du fichier qui ne contient que cette feuille, ou sélectionnez ensuite les pages qui vous intéressent avec Diviser un PDF.",
      },
      {
        q: "Et pour faire l’inverse, du PDF vers Excel ?",
        a: "Utilisez PDF en Excel : l’outil détecte les tableaux d’un PDF contenant du texte et les place dans des cellules. Il fonctionne mieux avec des tableaux simples et bien alignés.",
      },
      {
        q: "Mes tableurs sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure.",
      },
    ],
  },

  "xls>pdf": {
    when: [
      "Le .xls est le format d’Excel jusqu’à la version 2003. Beaucoup de bureaux conservent encore des tableurs historiques, de vieux logiciels de comptabilité qui exportent en .xls ou des modèles qui passent de main en main depuis des années. Les convertir en PDF permet de les archiver ou de les envoyer sans se soucier de la compatibilité.",
      "Si vous comptez continuer à mettre à jour les données, enregistrez le fichier en .xlsx dans Excel ou LibreOffice ; pour le consulter, l’imprimer ou le joindre à un dossier administratif, le PDF suffit.",
    ],
    differences: [
      "Le .xls est un format binaire soumis aux limites de son époque : 65 536 lignes et 256 colonnes au maximum par feuille. Le .xlsx moderne offre bien plus de capacité et se lit plus facilement avec les logiciels actuels.",
      "Le PDF n’a ni formules ni cellules : c’est le tableur imprimé en pages, selon les paramètres d’impression enregistrés dans le fichier.",
    ],
    kept: [
      "Les valeurs visibles des cellules, avec leurs formats de nombre, de date et de devise.",
      "Les bordures, les couleurs, les polices et les graphiques.",
      "Toutes les feuilles qui ont du contenu.",
    ],
    lost: [
      "Les formules et les macros (très fréquentes dans les vieux tableurs) ne sont pas exécutées : il reste la dernière valeur enregistrée.",
      "Les colonnes qui ne tiennent pas dans la largeur de la page passent sur des pages séparées si la feuille n’est pas configurée pour s’y ajuster.",
      "Les feuilles masquées et les commentaires ne sont pas inclus.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite : jusqu’à 5 fichiers à la fois et 15 Mo par fichier.",
      "Les fichiers protégés par un mot de passe d’ouverture ne peuvent pas être convertis.",
    ],
    steps: [
      "Si possible, ouvrez le tableur et vérifiez les paramètres d’impression (orientation et ajustement à la page). Si vous n’avez pas Excel, convertissez-le directement et regardez le résultat.",
      "Choisissez le .xls (ou plusieurs) et laissez PDF comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le PDF.",
    ],
    faq: [
      {
        q: "Les valeurs calculées sont-elles correctes si le tableur contient des macros ?",
        a: "Le PDF affiche la dernière valeur enregistrée dans le fichier. Les macros ne s’exécutent pas pendant la conversion : si le tableur doit être recalculé par une macro, faites-le dans Excel avant de convertir.",
      },
      {
        q: "Puis-je passer mon .xls à un format moderne ?",
        a: "Oui : ouvrez-le dans Excel ou LibreOffice Calc et utilisez « Enregistrer sous » au format .xlsx. Si vous n’avez besoin que des données, vous pouvez aussi les exporter en CSV avec Excel en CSV.",
      },
      {
        q: "Mes fichiers sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure.",
      },
    ],
  },

  "pptx>pdf": {
    when: [
      "Convertir un PowerPoint en PDF est la façon la plus sûre de partager une présentation : pour envoyer les diapositives après un cours ou une réunion, les déposer sur une plateforme de cours en ligne ou les projeter depuis l’ordinateur de quelqu’un d’autre sans mauvaise surprise de polices ou de versions.",
      "Le PDF est plus léger que bien des présentations, s’ouvre sur n’importe quel téléphone et évite que quelqu’un en modifie le contenu par erreur.",
    ],
    differences: [
      "Une présentation .pptx contient des diapositives avec des animations, des transitions, des vidéos et des notes du présentateur, et s’affiche en mode diaporama. Le PDF est un document statique : une page par diapositive, telle qu’elle apparaît à la fin de ses animations.",
      "Pour présenter en direct avec les animations, continuez à utiliser PowerPoint ; pour distribuer ou archiver, le PDF est plus pratique.",
    ],
    kept: [
      "Une page par diapositive, avec sa mise en page, ses arrière-plans, ses images, ses graphiques et ses tableaux.",
      "Le texte, qui reste sélectionnable et dans lequel on peut faire des recherches.",
      "Les liens vers des sites web.",
    ],
    lost: [
      "Les animations et les transitions : chaque diapositive apparaît dans son état final.",
      "Les vidéos et les sons intégrés : seule l’image d’aperçu reste, ils ne sont pas lus.",
      "Les notes du présentateur ne sont pas incluses.",
      "Les polices peu courantes absentes du serveur sont remplacées par des polices proches, et certaines zones de texte peuvent légèrement changer.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite, jusqu’à 15 Mo par fichier et 5 fichiers à la fois : si votre présentation est plus lourde à cause des vidéos, supprimez-les ou compressez-les avant.",
      "Les présentations protégées par un mot de passe d’ouverture ne peuvent pas être converties.",
    ],
    steps: [
      "Si la présentation contient des vidéos lourdes, supprimez-les dans une copie : elles ne seront de toute façon pas lues dans le PDF.",
      "Choisissez le .pptx et laissez PDF comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le PDF.",
      "Vérifiez les diapositives qui utilisent des polices particulières ; si un élément s’est déplacé, essayez avec une police courante.",
    ],
    faq: [
      {
        q: "Les notes du présentateur sont-elles incluses ?",
        a: "Non : le PDF ne contient que les diapositives, une par page. Si vous devez distribuer les notes, PowerPoint permet d’imprimer en PDF la vue « Page de commentaires ».",
      },
      {
        q: "Les animations sont-elles perdues ?",
        a: "Oui. Chaque diapositive reste telle qu’elle apparaît à la fin, avec tous ses éléments visibles. Si une animation masquait quelque chose, cet élément apparaîtra aussi.",
      },
      {
        q: "Mon PowerPoint dépasse 15 Mo : que faire ?",
        a: "C’est presque toujours à cause des vidéos ou de photos très lourdes. Supprimez les vidéos dans une copie ou utilisez « Compresser les images » dans PowerPoint, puis convertissez. Si le PDF reste lourd, passez-le dans Compresser un PDF.",
      },
      {
        q: "Mes présentations sont-elles conservées ?",
        a: "Elles sont converties sur notre serveur via une connexion chiffrée et supprimées en moins d’une heure.",
      },
    ],
  },

  "ppt>pdf": {
    when: [
      "Le .ppt est le format de PowerPoint jusqu’à 2003. On le retrouve dans d’anciennes présentations de cours et de formations qui circulent encore. Les convertir en PDF permet de les consulter sur n’importe quel appareil, y compris sur des téléphones qui n’ouvrent pas les .ppt, et de les archiver sans dépendre d’un logiciel.",
    ],
    differences: [
      "Le .ppt est un ancien format binaire ; les logiciels actuels l’ouvrent, mais parfois avec de petites différences de mise en page, de polices ou d’effets. Le .pptx l’a remplacé en 2007.",
      "Le PDF fige chaque diapositive sous forme de page : pas d’animations ni de mode diaporama, mais un rendu identique partout.",
    ],
    kept: [
      "Une page par diapositive, avec les textes, les images, les arrière-plans et les tableaux.",
      "Le texte sélectionnable.",
    ],
    lost: [
      "Les animations, les transitions, les sons et les vidéos.",
      "Les notes du présentateur.",
      "Les effets et le WordArt de l’époque peuvent s’afficher un peu différemment ; les polices absentes du serveur sont remplacées par des polices proches.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite, jusqu’à 15 Mo par fichier et 5 fichiers à la fois.",
      "Les fichiers protégés par un mot de passe d’ouverture ne peuvent pas être convertis.",
    ],
    steps: [
      "Choisissez le fichier .ppt (ou plusieurs).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF et vérifiez que les diapositives avec des effets s’affichent correctement.",
    ],
    faq: [
      {
        q: "Puis-je convertir un .ppt en .pptx ?",
        a: "Oui, en l’ouvrant dans PowerPoint ou LibreOffice Impress et en l’enregistrant au format .pptx. Pour le partager, le PDF suffit généralement.",
      },
      {
        q: "Pourquoi une diapositive s’affiche-t-elle différemment dans le PDF ?",
        a: "Les anciens .ppt utilisent parfois des effets ou des polices qui sont aujourd’hui rendus autrement. Si c’est important, ouvrez le fichier dans PowerPoint, modifiez cet élément et reconvertissez.",
      },
      {
        q: "Mes fichiers sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure.",
      },
    ],
  },

  "odt>pdf": {
    when: [
      "Le .odt est le format texte de LibreOffice et d’OpenOffice, utilisé par de nombreuses équipes dans l’administration et l’enseignement. Le convertir en PDF est utile pour envoyer le document à quelqu’un qui utilise Word, ou sur un portail qui n’accepte que le PDF.",
    ],
    differences: [
      "ODT (OpenDocument) est un format ouvert et normalisé pour les documents modifiables, comme le .docx de Word. Word sait l’ouvrir, mais ne l’affiche pas toujours comme LibreOffice. Le PDF, lui, s’affiche de la même façon partout.",
      "Comme notre conversion repose justement sur LibreOffice, l’ODT est le format qui se convertit le mieux : le résultat est identique à un export PDF depuis LibreOffice Writer.",
    ],
    kept: [
      "Le texte, les styles, les tableaux, les images, les notes de bas de page, les en-têtes et les pieds de page.",
      "Les tables des matières et la numérotation des pages.",
      "Les liens.",
    ],
    lost: [
      "Les commentaires et les modifications enregistrées ne s’impriment pas comme en mode révision : acceptez-les ou refusez-les avant.",
      "Les polices absentes du serveur sont remplacées par des polices proches.",
    ],
    limits: [
      "La conversion se fait sur notre serveur. Avec l’offre gratuite, jusqu’à 15 Mo par fichier et 5 fichiers à la fois.",
      "Les documents protégés par mot de passe ne peuvent pas être convertis.",
    ],
    steps: [
      "Choisissez le fichier .odt (ou plusieurs).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF.",
    ],
    faq: [
      {
        q: "Quelle différence avec un export PDF depuis LibreOffice ?",
        a: "Aucune sur le résultat : nous utilisons le même moteur. Cette page est utile quand vous n’avez pas LibreOffice sous la main, par exemple sur un téléphone ou sur l’ordinateur de quelqu’un d’autre.",
      },
      {
        q: "Puis-je convertir des classeurs ou des présentations LibreOffice ?",
        a: "Oui, les .ods (classeurs) et les .odp (présentations) se convertissent aussi en PDF.",
      },
      {
        q: "Mes documents sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure.",
      },
    ],
  },

  "rtf>pdf": {
    when: [
      "Le RTF (Rich Text Format, ou texte enrichi) se rencontre dans les documents générés par des logiciels de gestion, des logiciels médicaux ou comptables, et dans les fichiers enregistrés avec WordPad ou TextEdit. Le convertir en PDF permet de l’envoyer ou de l’archiver avec un rendu figé.",
    ],
    differences: [
      "Le RTF est un format de texte avec une mise en forme de base (gras, italique, polices, tableaux simples et images) que presque tous les traitements de texte savent ouvrir. Il est très compatible, mais chaque logiciel l’interprète un peu différemment.",
      "Le PDF fige cette mise en forme en pages, polices incluses.",
    ],
    kept: [
      "Le texte avec le gras, l’italique, le soulignement, les tailles et les couleurs.",
      "Les tableaux simples, les images et l’alignement des paragraphes.",
      "Les marges et le format de page, si le fichier les définit.",
    ],
    lost: [
      "Les éléments que certains logiciels ajoutent au RTF à leur manière (champs spéciaux, objets incorporés) peuvent ne pas s’afficher.",
      "Les polices absentes du serveur sont remplacées par des polices proches.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite, jusqu’à 15 Mo par fichier et 5 fichiers à la fois.",
    ],
    steps: [
      "Choisissez le fichier .rtf (ou plusieurs).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF.",
    ],
    faq: [
      {
        q: "Peut-on ouvrir un RTF dans Word ?",
        a: "Oui, Word, LibreOffice et Google Docs l’ouvrent. Le convertir en PDF est utile quand vous voulez qu’il s’affiche toujours de la même façon ou quand un système n’accepte que le PDF.",
      },
      {
        q: "Un logiciel me génère beaucoup de RTF : puis-je tous les convertir d’un coup ?",
        a: "Oui, sélectionnez-en plusieurs à la fois (jusqu’à 5 par lot avec l’offre gratuite) et téléchargez-les ensemble dans un ZIP.",
      },
      {
        q: "Mes fichiers sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure.",
      },
    ],
  },

  "txt>pdf": {
    when: [
      "Convertir un TXT en PDF permet de remettre des notes, des journaux, des listes ou du code sous la forme d’un document prêt à imprimer ou à joindre, avec des pages numérotées par la visionneuse et un rendu qui ne dépend pas du logiciel utilisé pour l’ouvrir.",
    ],
    differences: [
      "Un .txt ne contient que des caractères et des retours à la ligne : il n’enregistre ni police, ni taille, ni marges, et chaque logiciel l’affiche à sa manière. Le PDF le met en pages avec une police et des marges fixes.",
    ],
    kept: [
      "Tout le texte, avec ses retours à la ligne et ses lignes vides.",
      "Les caractères accentués et ceux d’autres alphabets, si le fichier est enregistré en UTF-8.",
    ],
    lost: [
      "Il n’y a pas de mise en forme à conserver : le PDF utilise une police standard, et les lignes très longues sont coupées pour tenir dans la largeur de la page.",
      "Les tabulations peuvent s’aligner différemment que dans votre éditeur.",
    ],
    limits: [
      "La conversion se fait sur notre serveur avec LibreOffice. Avec l’offre gratuite, jusqu’à 15 Mo par fichier (ce qui fait énormément de texte) et 5 fichiers à la fois.",
      "Si des caractères bizarres remplacent les accents, le fichier n’est pas en UTF-8 : ouvrez-le dans votre éditeur, enregistrez-le avec l’encodage UTF-8 et reconvertissez-le.",
    ],
    steps: [
      "Choisissez le fichier .txt (ou plusieurs).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF et vérifiez que les accents s’affichent correctement.",
    ],
    faq: [
      {
        q: "Puis-je choisir la police ou la taille des caractères ?",
        a: "Pas avec cette conversion. Si vous voulez mettre le texte en forme (titres, gras, listes), rédigez-le en Markdown et utilisez Markdown en PDF, ou collez-le dans un traitement de texte.",
      },
      {
        q: "Pourquoi des symboles bizarres apparaissent-ils à la place des accents ?",
        a: "Parce que le fichier est enregistré dans un ancien encodage. Ouvrez-le avec le Bloc-notes ou un autre éditeur, enregistrez-le en UTF-8 et reconvertissez-le.",
      },
      {
        q: "Mes fichiers sont-ils conservés ?",
        a: "Ils sont convertis sur notre serveur via une connexion chiffrée et supprimés en moins d’une heure.",
      },
    ],
  },

  // Photos and images ↔ PDF (19.2b2). Facts: everything runs in the browser;
  // HEIC via libheif (WASM, ~2 MB, downloaded the first time), primary image,
  // rotation applied; converting decodes and re-encodes, so metadata (date,
  // GPS, camera) does not carry over to the new file; transparency → white
  // background in JPG; adjustable quality (82 by default) and size; image →
  // PDF: one page the size of the image, JPG and PNG not recompressed; PDF →
  // image: 72/150/300 dpi (150 by default), one image per page, ZIP if there
  // are several; password-protected PDF: the password must be removed first.
  // Per-file limit depends on device memory (100 MB on most; less on
  // low-memory phones).
  "heic>jpg": {
    when: [
      "L’iPhone enregistre les photos en HEIC depuis des années. Sur l’iPhone lui-même et sur un Mac, elles s’affichent sans problème, mais beaucoup de formulaires en ligne, de plateformes administratives, d’anciens logiciels Windows et certaines applis Android ne les acceptent pas. Les convertir en JPG est le moyen le plus sûr pour que n’importe qui, ou n’importe quel site, puisse les ouvrir.",
      "Si vous comptez seulement conserver vos photos ou les regarder sur des appareils Apple, inutile de les convertir : le HEIC prend moins de place pour la même qualité.",
    ],
    differences: [
      "Le HEIC compresse les photos avec un codec vidéo moderne (HEVC) : à qualité visuelle égale, il pèse environ moitié moins qu’un JPG. Le JPG date de 1992 et il est bien moins efficace, mais absolument tout sait l’ouvrir : navigateurs, téléphones, imprimantes, réseaux sociaux et logiciels de gestion.",
      "Un HEIC peut aussi contenir des éléments que le JPG ne gère pas, comme plusieurs images dans un même fichier ou les données de profondeur du mode Portrait.",
    ],
    kept: [
      "La photo principale, en pleine résolution.",
      "L’orientation : une photo verticale reste verticale.",
      "Les couleurs, avec une perte de qualité invisible au réglage par défaut.",
    ],
    lost: [
      "Les métadonnées (date, position GPS, modèle d’appareil) ne passent pas dans le JPG, ce qui protège aussi votre vie privée si vous partagez la photo.",
      "Les Live Photos deviennent des photos fixes ; les données de profondeur du mode Portrait ne sont pas conservées.",
      "Le JPG pèse plus lourd que le HEIC d’origine, en général 1,5 à 2 fois plus.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur : les photos ne sont envoyées à aucun serveur. La première fois, le décodeur HEIC (environ 2 Mo) est téléchargé, puis il reste dans la mémoire du navigateur.",
      "Vous pouvez convertir de nombreuses photos à la fois. Sur un téléphone qui a peu de mémoire, les très grandes photos peuvent prendre plus de temps ; si l’une d’elles échoue, convertissez-la seule.",
    ],
    steps: [
      "Transférez les photos de l’iPhone sur l’ordinateur (ou ouvrez-les directement depuis le téléphone) et sélectionnez-les toutes ensemble.",
      "Laissez JPG comme format de sortie. Pour des fichiers plus légers, baissez la qualité à 70–80 ou réduisez les dimensions.",
      "Cliquez sur Convertir.",
      "Téléchargez les photos une par une ou toutes ensemble dans un ZIP.",
    ],
    faq: [
      {
        q: "Perd-on de la qualité en passant du HEIC au JPG ?",
        a: "Un peu, car le JPG compresse lui aussi avec perte, mais avec la qualité par défaut, cela ne se voit pas à l’œil nu. Si vous comptez imprimer la photo ou beaucoup la retoucher, montez la qualité à 90 ou plus, ou convertissez-la en PNG.",
      },
      {
        q: "Comment faire pour que l’iPhone enregistre directement les photos en JPG ?",
        a: "Allez dans « Réglages → Appareil photo → Formats → Le plus compatible ». Les nouvelles photos seront enregistrées en JPG et prendront plus de place ; celles que vous avez déjà en HEIC, vous pouvez les convertir ici.",
      },
      {
        q: "La localisation de la photo est-elle conservée ?",
        a: "Non : le nouveau JPG ne contient ni la date, ni le GPS, ni les informations sur l’appareil. C’est pratique pour partager des photos sans révéler où elles ont été prises.",
      },
      {
        q: "Mes photos sont-elles envoyées sur Internet ?",
        a: "Non. Le HEIC est décodé et converti dans votre propre navigateur ; aucun serveur ne reçoit vos photos.",
      },
    ],
  },

  "heic>png": {
    when: [
      "Convertir un HEIC en PNG est intéressant quand vous allez retoucher la photo : la recadrer plusieurs fois, y ajouter du texte, l’utiliser dans une maquette ou une présentation. Le PNG ne perd pas de qualité à chaque enregistrement : c’est donc un meilleur point de départ qu’un JPG pour travailler l’image.",
      "Pour envoyer des photos par message ou les déposer dans un formulaire, en revanche, le JPG est plus adapté : il pèse beaucoup moins lourd.",
    ],
    differences: [
      "Le HEIC est un format à compression très efficace, conçu pour stocker des photos en prenant peu de place. Le PNG est un format sans perte : il enregistre chaque pixel à l’identique, au prix de fichiers bien plus gros, surtout pour des photos.",
      "Le PNG gère aussi la transparence, ce qui est utile si vous comptez ensuite détourer la personne ou l’objet de la photo.",
    ],
    kept: [
      "La photo principale en pleine résolution, pixel pour pixel, telle qu’elle est décodée depuis le HEIC.",
      "L’orientation de la photo.",
      "La qualité : le PNG n’ajoute aucune compression avec perte.",
    ],
    lost: [
      "Le fichier grossit beaucoup : une photo de 2 Mo en HEIC peut dépasser 15 Mo en PNG.",
      "Les métadonnées (date, localisation, appareil) ne sont pas copiées.",
      "Les Live Photos deviennent des photos fixes.",
    ],
    limits: [
      "Tout se fait dans votre navigateur, sans envoyer les photos. La première fois, le décodeur HEIC (environ 2 Mo) est téléchargé.",
      "Comme les PNG de photos sont lourds, sur un téléphone qui a peu de mémoire, mieux vaut convertir quelques photos à la fois.",
    ],
    steps: [
      "Choisissez les photos HEIC.",
      "Choisissez PNG comme format de sortie. Si vous n’avez pas besoin de la pleine résolution, réduisez les dimensions pour alléger le fichier.",
      "Cliquez sur Convertir et téléchargez les PNG (ou le ZIP).",
    ],
    faq: [
      {
        q: "PNG ou JPG pour mes photos d’iPhone ?",
        a: "JPG pour partager et archiver (il pèse beaucoup moins lourd) ; PNG si vous allez retoucher la photo ou si elle ne doit perdre aucune qualité en cours de route.",
      },
      {
        q: "Pourquoi le PNG est-il tellement plus lourd que le HEIC ?",
        a: "Parce que le PNG n’élimine aucune information : il enregistre chaque pixel tel quel. Pour des dessins ou des captures d’écran, cela donne des fichiers légers, mais pour des photos très détaillées, les fichiers grossissent beaucoup.",
      },
      {
        q: "Puis-je supprimer l’arrière-plan ensuite ?",
        a: "Oui. Avec le PNG, utilisez Supprimer l’arrière-plan d’une image : le résultat conserve la transparence.",
      },
    ],
  },

  "heic>pdf": {
    when: [
      "Convertir un HEIC en PDF est utile quand vous avez photographié un document avec l’iPhone (une carte d’identité, un reçu, une ordonnance, une attestation) et que vous devez l’envoyer ou le déposer sur un site qui n’accepte que le PDF.",
      "S’il s’agit de plusieurs photos qui forment un seul document, utilisez Images en PDF pour les réunir dans un fichier unique, avec les pages dans l’ordre de votre choix. Si vous voulez en plus que la photo ressemble à un scan, essayez Scanner un document.",
    ],
    differences: [
      "Un HEIC est une photo ; un PDF est un document composé de pages. À la conversion, la photo est placée sur une page de la même taille que l’image : elle s’affiche à l’identique, mais vous pouvez désormais la joindre partout où l’on demande un PDF.",
    ],
    kept: [
      "La photo entière, sans marges ni recadrage.",
      "La bonne orientation.",
      "Une bonne qualité : la photo est convertie en JPG haute qualité avant d’être placée dans le PDF.",
    ],
    lost: [
      "Le texte de la photo ne peut être ni sélectionné ni recherché : le PDF contient une image. Pour le rendre consultable, passez-le ensuite dans « OCR de PDF numérisé ».",
      "Les métadonnées de la photo ne sont pas reprises dans le PDF.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur : les photos de vos documents ne sont envoyées à aucun serveur.",
      "Chaque photo devient son propre PDF d’une page. Pour en réunir plusieurs, utilisez Images en PDF.",
    ],
    steps: [
      "Choisissez la photo HEIC (ou plusieurs, si vous voulez un PDF par photo).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF. S’il est trop lourd pour le site où vous devez le déposer, utilisez Compresser un PDF.",
    ],
    faq: [
      {
        q: "Comment réunir plusieurs photos dans un seul PDF ?",
        a: "Avec Images en PDF : vous choisissez toutes les photos (HEIC compris), vous les mettez dans l’ordre et vous obtenez un PDF unique, avec une page par photo.",
      },
      {
        q: "Le site demande un PDF de moins de 1 ou 2 Mo : que faire ?",
        a: "Passez le PDF dans Compresser un PDF, ou réduisez la taille de la photo avant la conversion avec Redimensionner une image. Pour un document, 1 500 à 2 000 pixels sur le plus grand côté suffisent généralement pour qu’il reste bien lisible.",
      },
      {
        q: "Les photos de mes documents sont-elles envoyées quelque part ?",
        a: "Non. Elles sont converties dans votre navigateur et ne quittent pas votre appareil.",
      },
    ],
  },

  "webp>jpg": {
    when: [
      "Beaucoup de sites diffusent leurs images en WEBP : quand vous enregistrez une photo depuis le navigateur, elle porte donc souvent cette extension. La convertir en JPG est utile quand un ancien logiciel de retouche, une appli, un formulaire ou une imprimante ne la reconnaît pas.",
      "Si l’image comporte des zones transparentes (un logo, une icône), convertissez-la plutôt en PNG, car le JPG ne gère pas la transparence.",
    ],
    differences: [
      "Le WEBP est un format créé par Google pour le Web : à qualité égale, il pèse 25 à 35 % de moins qu’un JPG, et il gère en plus la transparence et l’animation. Le JPG est plus ancien et moins efficace, mais n’importe quel logiciel ou appareil l’accepte.",
    ],
    kept: [
      "La résolution de l’image.",
      "Les couleurs, avec une perte de qualité invisible au réglage par défaut.",
    ],
    lost: [
      "La transparence : les zones transparentes deviennent blanches.",
      "Si le WEBP est animé, seule la première image est convertie.",
      "Le JPG pèse généralement un peu plus lourd que le WEBP d’origine.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images, et vous pouvez en convertir beaucoup à la fois.",
    ],
    steps: [
      "Choisissez les fichiers WEBP (ou faites-les glisser).",
      "Laissez JPG comme format de sortie et, si vous le souhaitez, réglez la qualité ou les dimensions.",
      "Cliquez sur Convertir et téléchargez les images (ou le ZIP).",
    ],
    faq: [
      {
        q: "Pourquoi les images que j’enregistre depuis Internet sont-elles en WEBP ?",
        a: "Parce que les sites les diffusent dans ce format pour qu’elles se chargent plus vite. Le navigateur enregistre le fichier tel qu’il l’a reçu.",
      },
      {
        q: "Que devient le fond transparent ?",
        a: "Le JPG ne gère pas la transparence : ces zones deviennent donc blanches. Pour la conserver, convertissez le WEBP en PNG.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },

  "webp>png": {
    when: [
      "Passer du WEBP au PNG est la bonne conversion quand l’image comporte de la transparence (logos, icônes, stickers, détourages) et que vous devez l’ouvrir dans un logiciel qui ne lit pas le WEBP, ou quand vous allez la retoucher sans vouloir perdre de qualité à chaque enregistrement.",
    ],
    differences: [
      "Les deux formats gèrent la transparence. Le WEBP compresse davantage (avec ou sans perte) et convient parfaitement à la publication sur le Web ; le PNG est sans perte et s’ouvre dans n’importe quel éditeur d’images, traitement de texte ou logiciel de graphisme.",
      "Une règle pratique : pour publier sur un site, le WEBP ; pour retoucher, imprimer ou insérer l’image dans un document Word ou une présentation, le PNG.",
    ],
    kept: [
      "La transparence, avec ses bords adoucis.",
      "La résolution et les couleurs telles qu’elles apparaissent dans le WEBP.",
    ],
    lost: [
      "Si le WEBP est animé, seule la première image est convertie.",
      "Le PNG est souvent nettement plus lourd, surtout s’il s’agit d’une photo.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images.",
    ],
    steps: [
      "Choisissez les fichiers WEBP.",
      "Laissez PNG comme format de sortie.",
      "Cliquez sur Convertir et téléchargez les PNG (ou le ZIP).",
    ],
    faq: [
      {
        q: "Perd-on de la qualité en passant du WEBP au PNG ?",
        a: "Aucune perte n’est ajoutée : le PNG enregistre exactement les pixels du WEBP. En revanche, si le WEBP avait déjà perdu en qualité lors de sa compression, cette perte ne se récupère pas.",
      },
      {
        q: "Pourquoi le PNG est-il si lourd ?",
        a: "Parce qu’il n’élimine aucune information. Si le fichier est trop lourd et que vous n’avez pas besoin de la transparence, convertissez plutôt l’image en JPG.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité sur votre appareil.",
      },
    ],
  },

  "avif>jpg": {
    when: [
      "L’AVIF est de plus en plus courant sur les sites web et sur certains téléphones et appareils photo récents. Le convertir en JPG est utile quand un logiciel, un réseau social, une ancienne appli de messagerie ou une plateforme administrative ne l’accepte pas encore.",
    ],
    differences: [
      "L’AVIF est un format moderne basé sur le codec vidéo AV1 : à qualité égale, il pèse nettement moins qu’un JPG, et même moins qu’un WEBP ; il gère aussi la transparence et une plus grande profondeur de couleur. Le JPG est bien plus ancien, mais il est compatible avec tout.",
    ],
    kept: [
      "La résolution de l’image.",
      "Les couleurs, avec une perte invisible au réglage par défaut.",
    ],
    lost: [
      "La transparence : elle devient blanche.",
      "Les images AVIF à grande plage dynamique (HDR) s’affichent avec la plage normale d’un JPG.",
      "Le JPG est plus lourd que l’AVIF, parfois deux fois plus, voire davantage.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images. Si votre navigateur ne sait pas décoder l’AVIF lui-même, un décodeur intégré à la page prend le relais.",
    ],
    steps: [
      "Choisissez les fichiers AVIF.",
      "Laissez JPG comme format de sortie et réglez la qualité si vous le souhaitez.",
      "Cliquez sur Convertir et téléchargez les images (ou le ZIP).",
    ],
    faq: [
      {
        q: "Quels logiciels n’ouvrent pas l’AVIF ?",
        a: "Les navigateurs actuels l’ouvrent, mais beaucoup de logiciels de retouche, les visionneuses de photos des anciennes versions de Windows et de nombreuses plateformes de dépôt de fichiers ne le gèrent pas encore. C’est pourquoi le JPG reste le choix le plus sûr pour partager.",
      },
      {
        q: "AVIF en JPG ou en PNG ?",
        a: "JPG s’il s’agit d’une photo et que vous voulez un fichier léger ; PNG si l’image comporte de la transparence ou si vous allez la retoucher.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },

  "avif>png": {
    when: [
      "Convertir un AVIF en PNG est utile quand l’image comporte de la transparence ou quand vous allez la retoucher dans un logiciel qui ne lit pas encore l’AVIF, comme beaucoup d’éditeurs d’images et de logiciels de graphisme pour ordinateur.",
      "Cela permet aussi de garder une copie de travail d’une image téléchargée sur le Web : à partir du PNG, vous pouvez recadrer, retoucher et réexporter autant de fois que vous le voulez, sans cumuler de perte de qualité à chaque étape.",
    ],
    differences: [
      "L’AVIF compresse de façon très efficace et il est pensé pour la publication ; le PNG enregistre l’image sans perte et c’est le format universel pour travailler sur des images avec transparence.",
    ],
    kept: [
      "La transparence.",
      "La résolution et les couleurs telles qu’elles s’affichent à l’écran.",
    ],
    lost: [
      "Si l’AVIF est en HDR ou comporte plus de 8 bits par canal, le PNG est enregistré avec la plage et la profondeur normales (8 bits).",
      "Si l’AVIF est animé, seule la première image est convertie.",
      "Le fichier est nettement plus lourd.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images.",
    ],
    steps: [
      "Choisissez les fichiers AVIF.",
      "Laissez PNG comme format de sortie.",
      "Cliquez sur Convertir et téléchargez les PNG (ou le ZIP).",
    ],
    faq: [
      {
        q: "Le fond transparent est-il conservé ?",
        a: "Oui, le PNG conserve la transparence de l’AVIF, y compris les bords adoucis.",
      },
      {
        q: "Pourquoi le PNG est-il beaucoup plus lourd que l’AVIF ?",
        a: "L’AVIF fait partie des formats qui compressent le plus ; le PNG, lui, n’élimine rien. Il est normal que le PNG pèse plusieurs fois plus lourd.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité sur votre appareil.",
      },
    ],
  },

  "jpg>pdf": {
    when: [
      "Convertir un JPG en PDF permet d’envoyer la photo d’un document, d’un justificatif ou d’un dessin là où seul le PDF est accepté : portails administratifs, plateformes de cours en ligne, candidatures en ligne ou formulaires de la mutuelle.",
      "Si vous avez plusieurs photos qui forment un seul document (par exemple le recto et le verso d’une carte d’identité), utilisez Images en PDF pour les réunir dans un seul fichier.",
    ],
    differences: [
      "Un JPG est une image isolée ; un PDF est un document composé de pages, qui s’affiche de la même façon partout et que les plateformes administratives acceptent comme document.",
    ],
    kept: [
      "La photo dans sa qualité d’origine : le JPG est placé dans le PDF sans être recompressé.",
      "L’orientation (si la rotation est enregistrée dans les données EXIF de la photo, elle est appliquée).",
      "Une page aux dimensions exactes de l’image, sans bordure blanche.",
    ],
    lost: [
      "Le texte de la photo ne peut être ni sélectionné ni recherché. Pour cela, passez le PDF dans « OCR de PDF numérisé ».",
      "Les données EXIF de la photo ne sont pas visibles dans le PDF.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur : les photos de vos documents ne sont pas envoyées.",
      "Chaque JPG donne son propre PDF d’une page. Pour choisir le format A4 ou Lettre, ajouter des marges ou réunir plusieurs images, utilisez Images en PDF.",
    ],
    steps: [
      "Choisissez la photo (ou plusieurs, si vous voulez un PDF par photo).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF. S’il est trop lourd, passez-le dans Compresser un PDF.",
    ],
    faq: [
      {
        q: "Comment mettre plusieurs photos dans un seul PDF ?",
        a: "Utilisez Images en PDF : vous choisissez toutes les images, vous les mettez dans l’ordre en les faisant glisser et vous obtenez un PDF unique.",
      },
      {
        q: "Le PDF est-il au format A4 ?",
        a: "Avec cette conversion, la page a les dimensions de la photo. Si vous avez besoin d’un A4 ou d’un format Lettre avec des marges (pour imprimer), utilisez Images en PDF et choisissez le format de page.",
      },
      {
        q: "Perd-on de la qualité ?",
        a: "Non. Le JPG est enregistré tel quel dans le PDF, sans être recompressé.",
      },
    ],
  },

  "png>pdf": {
    when: [
      "Convertir un PNG en PDF est pratique pour remettre des captures d’écran, des schémas, des plans, des infographies ou des documents numérisés en PNG dans un format de document que tout le monde peut ouvrir et imprimer.",
    ],
    differences: [
      "Le PNG est une image sans perte, idéale pour les captures et les graphiques avec du texte net. Le PDF l’intègre dans une page de document, sans modifier les pixels.",
    ],
    kept: [
      "L’image sans aucune perte de qualité : le PNG est enregistré tel quel dans le PDF.",
      "Le texte et les traits nets des captures et des schémas.",
      "La transparence (le PDF affiche ce qui se trouve dessous, c’est-à-dire du blanc sur une page vierge).",
    ],
    lost: [
      "Le texte de l’image ne peut pas être sélectionné. Pour cela, passez le PDF dans « OCR de PDF numérisé ».",
      "Une photo en PNG donne un PDF lourd ; s’il s’agit d’une photo, convertissez-la d’abord en JPG ou compressez le PDF.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images.",
      "Chaque PNG donne son propre PDF d’une page, aux dimensions de l’image. Pour en réunir plusieurs ou choisir le format A4, utilisez Images en PDF.",
    ],
    steps: [
      "Choisissez le PNG (ou plusieurs).",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF.",
    ],
    faq: [
      {
        q: "La capture sera-t-elle floue dans le PDF ?",
        a: "Non : le PNG est intégré au PDF sans recompression. S’il paraît petit à l’impression, c’est parce que la page a les dimensions de l’image ; utilisez Images en PDF au format A4 pour qu’il s’adapte à la feuille.",
      },
      {
        q: "Puis-je réunir plusieurs captures dans un PDF ?",
        a: "Oui, avec Images en PDF.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "pdf>jpg": {
    when: [
      "Convertir un PDF en JPG permet de publier une page d’un PDF sur les réseaux sociaux, de l’insérer comme image dans une présentation ou un document, de l’envoyer par WhatsApp pour qu’elle s’affiche sans rien ouvrir, ou de déposer une attestation sur un site qui n’accepte que des images.",
    ],
    differences: [
      "Un PDF peut contenir du texte, des vecteurs et des images, et il reste net quel que soit le zoom. Un JPG est une photo de la page à une résolution fixe : plus facile à partager et à afficher partout, mais sans texte sélectionnable ni zoom illimité.",
    ],
    kept: [
      "L’aspect de chaque page : texte, images, couleurs et mise en page, tels qu’ils apparaissent dans une visionneuse.",
      "Toutes les pages : une image par page.",
    ],
    lost: [
      "Le texte n’est plus sélectionnable et les liens ne fonctionnent plus.",
      "La netteté illimitée : l’image a la résolution que vous choisissez (72, 150 ou 300 ppp).",
      "Les zones transparentes du PDF deviennent blanches.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer le PDF.",
      "Pour un PDF de plusieurs pages, vous recevez un ZIP avec une image par page. Si le PDF est protégé par un mot de passe d’ouverture, retirez-le d’abord avec « Retirer le mot de passe d’un PDF ».",
    ],
    steps: [
      "Choisissez le PDF.",
      "Laissez JPG comme format de sortie et choisissez la résolution : 150 ppp pour l’écran, 300 ppp si vous comptez imprimer ou devez lire de petits caractères.",
      "Cliquez sur Convertir.",
      "Téléchargez l’image ou le ZIP contenant toutes les pages.",
    ],
    faq: [
      {
        q: "Quelle résolution choisir ?",
        a: "150 ppp suffisent pour l’affichage à l’écran ou l’envoi par message. 300 ppp donnent des images plus grandes et plus nettes, pour imprimer ou pour des documents en petits caractères. 72 ppp donnent des fichiers très légers.",
      },
      {
        q: "Puis-je convertir une seule page ?",
        a: "Toutes les pages sont converties. Si vous n’en voulez qu’une, extrayez-la d’abord avec Extraire des pages d’un PDF, puis convertissez ce fichier.",
      },
      {
        q: "JPG ou PNG ?",
        a: "JPG pour les pages avec des photos et pour des fichiers légers ; PNG pour les pages avec du texte, des tableaux ou des graphiques, car les lettres restent plus nettes.",
      },
      {
        q: "Et si ce que je veux, ce sont les photos contenues dans le PDF ?",
        a: "Utilisez Extraire les images d’un PDF : l’outil récupère les images d’origine, sans la page autour.",
      },
    ],
  },

  "pdf>png": {
    when: [
      "Convertir un PDF en PNG est la bonne option quand la page contient du texte, des tableaux, des graphiques ou des plans et que vous allez l’utiliser comme image dans une présentation, un document, un wiki ou un site web : le PNG garde les lettres et les traits nets, sans le « bruit » que le JPG ajoute autour des contours.",
    ],
    differences: [
      "Le PDF est un document composé de pages avec du texte et des vecteurs ; le PNG est une image sans perte. À la conversion, chaque page est rendue en image à la résolution de votre choix.",
    ],
    kept: [
      "L’aspect exact de chaque page, sans perte de qualité sur le rendu.",
      "Les lettres et les traits nets.",
      "Toutes les pages, une image par page.",
    ],
    lost: [
      "Le texte ne peut pas être sélectionné et les liens ne fonctionnent pas.",
      "Les pages riches en photos donnent des PNG lourds ; dans ce cas, préférez le JPG.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer le PDF.",
      "Pour plusieurs pages, vous recevez un ZIP. Les PDF protégés par un mot de passe d’ouverture doivent être déverrouillés au préalable.",
    ],
    steps: [
      "Choisissez le PDF.",
      "Laissez PNG comme format de sortie et choisissez la résolution (300 ppp pour que les petits caractères restent bien lisibles).",
      "Cliquez sur Convertir et téléchargez l’image ou le ZIP.",
    ],
    faq: [
      {
        q: "Pourquoi le texte est-il plus net en PNG qu’en JPG ?",
        a: "Parce que le JPG compresse avec perte et laisse de petites taches autour des contours marqués, comme ceux des lettres. Le PNG les conserve à l’identique.",
      },
      {
        q: "Le PNG a-t-il un fond transparent ?",
        a: "Non : chaque page est rendue sur fond blanc, comme dans une visionneuse PDF.",
      },
      {
        q: "Mon PDF est-il envoyé sur un serveur ?",
        a: "Non, il est converti dans votre navigateur.",
      },
    ],
  },
};
