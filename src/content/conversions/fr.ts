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

  // Common image formats, icons and SVG (19.2b3). Facts: everything runs in the
  // browser; quality 82 by default for JPG/WEBP/AVIF; re-encoding drops
  // metadata; transparency → white in JPG; animated GIF → first frame;
  // multi-page TIFF → first page only (TIFF → PDF too); ICO output: 16, 32, 48,
  // 64, 128 and 256 px (only those not larger than the image), centered square
  // with transparent padding; ICO → PNG: the browser decodes the icon (usually
  // picks the largest image); SVG: drawn by the browser at its
  // width/height/viewBox size (1024 px if none), enlarging it loses no
  // sharpness, external images and fonts are not loaded; SVG → PDF: the SVG is
  // drawn as a PNG image inside the PDF (not vector).
  "jpg>png": {
    when: [
      "Convertir un JPG en PNG est utile quand vous allez retoucher l’image plusieurs fois (recadrer, ajouter du texte, faire des retouches) sans que chaque enregistrement ajoute de nouvelles pertes, ou quand un service exige explicitement du PNG, comme certaines plateformes de design ou boutiques en ligne.",
      "Si vous voulez un fond transparent, la conversion en PNG ne suffit pas : le JPG n’a pas de transparence à conserver. Pour cela, utilisez Supprimer l’arrière-plan d’une image, qui fournit un PNG au fond détouré.",
    ],
    differences: [
      "Le JPG compresse avec perte : il supprime des détails presque invisibles à l’œil pour que les photos restent légères. Le PNG compresse sans perte : il conserve chaque pixel à l’identique et gère la transparence, mais il donne des fichiers bien plus lourds pour les photos.",
      "Convertir un JPG en PNG ne récupère pas la qualité déjà perdue par le JPG ; cela évite seulement d’en perdre davantage par la suite.",
    ],
    kept: [
      "L’image exactement telle qu’elle apparaît dans le JPG, pixel par pixel.",
      "La résolution et les couleurs.",
      "L’orientation de la photo.",
    ],
    lost: [
      "Rien n’est perdu sur l’image, mais le fichier est en général 3 à 10 fois plus lourd.",
      "Les données EXIF (date, appareil, GPS) ne passent pas dans le PNG.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images, et accepte les lots avec téléchargement en ZIP.",
    ],
    steps: [
      "Choisissez les JPG (ou faites-les glisser).",
      "Laissez PNG comme format de sortie ; si vous n’avez pas besoin de la taille d’origine, réduisez la largeur pour alléger les fichiers.",
      "Cliquez sur Convertir et téléchargez les PNG ou le ZIP.",
    ],
    faq: [
      {
        q: "La qualité s’améliore-t-elle en passant du JPG au PNG ?",
        a: "Non. Le PNG conserve exactement ce que contenait le JPG, défauts de compression compris. Ce que vous gagnez, c’est que les retouches suivantes n’ajoutent pas de perte.",
      },
      {
        q: "Le PNG aura-t-il un fond transparent ?",
        a: "Non, car le JPG n’a pas de transparence. Pour détourer le fond, utilisez Supprimer l’arrière-plan d’une image.",
      },
      {
        q: "Pourquoi le PNG est-il tellement plus lourd ?",
        a: "Parce qu’il ne supprime aucune information. Sur les photos, cela se voit beaucoup ; sur les captures d’écran ou les graphiques simples, l’écart est plus faible.",
      },
    ],
  },

  "png>jpg": {
    when: [
      "Convertir un PNG en JPG est le moyen le plus simple d’alléger des photos et des captures trop lourdes : pour les envoyer par e-mail, les déposer dans un formulaire avec une taille limite ou les publier sur un site. Une photo enregistrée en PNG peut descendre au dixième de son poids en JPG sans différence visible.",
      "Ce n’est pas conseillé si l’image a de la transparence (un logo, une icône) ou beaucoup de texte fin : dans ce cas, mieux vaut la garder en PNG ou la convertir en WEBP.",
    ],
    differences: [
      "Le PNG conserve chaque pixel à l’identique et gère la transparence ; il est idéal pour les graphiques, les captures et les logos. Le JPG supprime des détails imperceptibles pour rester léger et convient très bien aux photos, mais il ne gère pas la transparence et laisse de petites taches autour des contours nets, comme ceux des lettres.",
    ],
    kept: [
      "La résolution et l’aspect général de l’image.",
      "Les couleurs, avec une perte invisible à la qualité par défaut (82).",
    ],
    lost: [
      "La transparence : les zones transparentes deviennent blanches.",
      "Un peu de netteté sur les contours très marqués, comme les petits textes ou les traits fins.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images. Vous pouvez régler la qualité et la taille, et en convertir beaucoup à la fois.",
    ],
    steps: [
      "Choisissez les PNG.",
      "Laissez JPG comme format de sortie. Avec une qualité de 75 à 85, les photos ont le même aspect et sont beaucoup plus légères ; pour des captures avec du texte, montez à 90.",
      "Cliquez sur Convertir et téléchargez les images ou le ZIP.",
    ],
    faq: [
      {
        q: "Quelle qualité choisir ?",
        a: "Pour les photos, une valeur entre 75 et 85 offre un bon équilibre. Pour les captures d’écran avec du texte, 90 ou plus, ou gardez-les simplement en PNG.",
      },
      {
        q: "Que devient le fond transparent ?",
        a: "Le JPG ne le gère pas, il devient donc blanc. Si vous devez le conserver tout en allégeant le fichier, convertissez en WEBP.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "jpg>webp": {
    when: [
      "Convertir un JPG en WEBP est la conversion type pour qu’un site web se charge plus vite : à qualité visuelle égale, les photos sont environ 25 à 35 % plus légères, ce qui améliore le temps de chargement et les indicateurs de Google. C’est aussi un moyen de gagner de la place sur les boutiques en ligne, les blogs et les catalogues.",
      "Pour envoyer des photos par message, les imprimer ou les déposer sur d’anciens systèmes, mieux vaut rester en JPG : certains logiciels n’ouvrent toujours pas le WEBP.",
    ],
    differences: [
      "Le WEBP est plus moderne et compresse mieux que le JPG ; il gère en plus la transparence et l’animation. Tous les navigateurs actuels l’affichent, mais tous les logiciels de bureau et systèmes de dépôt de fichiers ne l’acceptent pas.",
    ],
    kept: ["La résolution et l’aspect de la photo.", "L’orientation."],
    lost: [
      "Le WEBP compresse lui aussi avec perte : à très basse qualité, des taches apparaissent. À la qualité par défaut (82), on ne le distingue pas du JPG.",
      "Les données EXIF ne passent pas dans le WEBP.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les photos, par lots et avec téléchargement en ZIP.",
    ],
    steps: [
      "Choisissez les JPG.",
      "Laissez WEBP comme format de sortie. Si elles sont destinées à un site web, réduisez aussi la largeur à la taille maximale d’affichage (par exemple 1 600 px).",
      "Cliquez sur Convertir et téléchargez les WEBP ou le ZIP.",
    ],
    faq: [
      {
        q: "Un WEBP est-il beaucoup plus léger ?",
        a: "Cela dépend de la photo, mais à qualité visuelle égale, il est en général environ 25 à 35 % plus léger que le JPG. Réduire aussi les dimensions en pixels reste ce qui fait gagner le plus.",
      },
      {
        q: "WordPress et les boutiques en ligne acceptent-ils le WEBP ?",
        a: "La plupart des plateformes actuelles, oui. Si l’une d’elles ne l’accepte pas, déposez le JPG.",
      },
      {
        q: "WEBP ou AVIF pour mon site ?",
        a: "L’AVIF compresse encore mieux, mais il est plus long à générer. Le WEBP est l’option la plus compatible et la plus rapide ; l’AVIF est intéressant si vous voulez le poids le plus faible possible.",
      },
    ],
  },

  "png>webp": {
    when: [
      "Convertir un PNG en WEBP permet d’alléger les images d’un site web sans perdre la transparence : logos, icônes, produits détourés, captures et illustrations. C’est l’une des conversions qui font gagner le plus de poids sur une page.",
    ],
    differences: [
      "Le PNG est sans perte et devient lourd avec les grandes images ou les photos. Le WEBP gère aussi la transparence, mais il compresse avec perte (qualité réglable), et le résultat ne pèse souvent qu’une fraction du PNG.",
    ],
    kept: [
      "La transparence, avec des contours doux.",
      "La résolution et l’aspect de l’image.",
    ],
    lost: [
      "À basse qualité, des taches peuvent apparaître autour des textes et des traits fins. Pour des graphiques avec beaucoup de texte, choisissez une qualité élevée (90 ou plus).",
      "Les métadonnées du PNG ne passent pas dans le WEBP.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images. La qualité s’applique de la même façon à tout le lot.",
    ],
    steps: [
      "Choisissez les PNG.",
      "Laissez WEBP comme format de sortie et réglez la qualité : 82 pour les photos et les produits, 90 ou plus pour les graphiques avec du texte.",
      "Cliquez sur Convertir et téléchargez les WEBP ou le ZIP.",
    ],
    faq: [
      {
        q: "Le fond transparent est-il conservé ?",
        a: "Oui, le WEBP gère la transparence et la conserve.",
      },
      {
        q: "Combien vais-je gagner ?",
        a: "Pour des photos et des produits enregistrés en PNG, le WEBP est souvent plusieurs fois plus léger. Pour de petites icônes ou des graphiques très simples, l’écart est plus faible.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "jpg>avif": {
    when: [
      "Convertir un JPG en AVIF est intéressant quand vous voulez le poids le plus faible possible pour les photos d’un site web, d’une boutique ou d’une galerie : l’AVIF atteint en général la même qualité visuelle avec un poids nettement inférieur à celui du JPG et du WEBP.",
      "Ne l’utilisez pas pour partager par message ou pour déposer sur des systèmes qui ne le connaissent pas : beaucoup de logiciels n’ouvrent toujours pas l’AVIF.",
    ],
    differences: [
      "L’AVIF utilise le codec vidéo AV1 pour compresser les images. Il est plus efficace que le JPG et le WEBP, gère la transparence et le HDR, et les navigateurs actuels l’affichent. En contrepartie, créer un AVIF demande plus de calcul que créer un JPG.",
    ],
    kept: ["La résolution et l’aspect de la photo.", "L’orientation."],
    lost: [
      "L’AVIF compresse avec perte ; à très basse qualité, l’image paraît « délavée » dans les zones de texture fine. À la qualité par défaut, cela ne se voit pas.",
      "Les données EXIF ne passent pas dans l’AVIF.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, avec un encodeur intégré à la page. Elle est plus lente que vers le JPG ou le WEBP : quelques secondes par grande photo, davantage sur un téléphone.",
    ],
    steps: [
      "Choisissez les JPG.",
      "Laissez AVIF comme format de sortie et, si elles sont destinées au web, réduisez la largeur à leur taille d’affichage.",
      "Cliquez sur Convertir et patientez : chaque photo prend un peu plus de temps qu’avec les autres formats.",
      "Téléchargez les AVIF ou le ZIP.",
    ],
    faq: [
      {
        q: "Pourquoi est-ce plus long que la conversion en WEBP ?",
        a: "Parce que l’encodage AVIF demande beaucoup plus de calcul. C’est justement cet effort qui permet d’obtenir un fichier plus léger.",
      },
      {
        q: "Tous les navigateurs affichent-ils l’AVIF ?",
        a: "Les versions actuelles de Chrome, Edge, Firefox et Safari, oui. Si votre public utilise des appareils très anciens, proposez aussi un JPG ou un WEBP de secours.",
      },
      {
        q: "Mes photos sont-elles envoyées sur un serveur ?",
        a: "Non, l’AVIF est généré dans votre navigateur.",
      },
    ],
  },

  "gif>png": {
    when: [
      "Convertir un GIF en PNG permet d’extraire une image fixe d’un GIF (par exemple un vieux logo, une icône ou une image d’animation) pour la retoucher ou l’utiliser dans des documents sans la limite de 256 couleurs du GIF.",
    ],
    differences: [
      "Le GIF gère l’animation, mais seulement 256 couleurs par image et une transparence en tout ou rien. Le PNG est une image fixe avec des millions de couleurs et une transparence aux contours doux. Pour les graphiques et les logos, le PNG est le remplaçant moderne du GIF fixe.",
    ],
    kept: ["Les couleurs exactes du GIF et sa transparence.", "La résolution."],
    lost: [
      "L’animation : si le GIF est animé, seule la première image est convertie.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les fichiers. Elle produit toujours une image fixe, même si le GIF est animé.",
    ],
    steps: [
      "Choisissez les GIF.",
      "Laissez PNG comme format de sortie.",
      "Cliquez sur Convertir et téléchargez les PNG.",
    ],
    faq: [
      {
        q: "Que devient l’animation ?",
        a: "Seule la première image est convertie : le PNG est une image fixe.",
      },
      {
        q: "La transparence est-elle conservée ?",
        a: "Oui. Les zones transparentes du GIF restent transparentes dans le PNG.",
      },
      {
        q: "La qualité s’améliore-t-elle ?",
        a: "Non : le PNG conserve exactement les couleurs du GIF. Ce que vous gagnez, c’est de pouvoir le retoucher sans la limite de 256 couleurs.",
      },
    ],
  },

  "gif>jpg": {
    when: [
      "Convertir un GIF en JPG est utile quand un site ou un formulaire n’accepte pas le GIF et que vous devez quand même déposer l’image, ou pour enregistrer la première image d’un GIF comme photo fixe.",
    ],
    differences: [
      "Le GIF est un format limité à 256 couleurs, avec animation et transparence simple. Le JPG est une image fixe avec des millions de couleurs et une compression avec perte, accepté partout, mais sans transparence.",
    ],
    kept: [
      "La résolution de la première image.",
      "Ses couleurs : un GIF en a 256 au maximum, et le JPG les reproduit sans difficulté.",
    ],
    lost: [
      "L’animation : seule la première image est conservée.",
      "La transparence, qui devient blanche.",
      "Un peu de netteté sur les contours des dessins et des textes, à cause de la compression JPG.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les fichiers. Si le GIF est un dessin ou un logo avec de la transparence, convertissez-le en PNG plutôt qu’en JPG.",
    ],
    steps: [
      "Choisissez les GIF.",
      "Laissez JPG comme format de sortie ; pour des dessins aux contours nets, montez la qualité à 90.",
      "Cliquez sur Convertir et téléchargez les JPG.",
    ],
    faq: [
      {
        q: "Puis-je choisir quelle image du GIF est convertie ?",
        a: "Non, c’est toujours la première image qui est utilisée.",
      },
      {
        q: "JPG ou PNG pour un GIF ?",
        a: "PNG pour les logos, les dessins ou les images avec de la transparence ; JPG seulement si le site l’exige ou si le GIF est une photo.",
      },
      {
        q: "Mes fichiers sont-ils envoyés sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },

  "bmp>jpg": {
    when: [
      "Les BMP proviennent de captures de vieux logiciels Windows, de scanners, de machines industrielles et d’appareils médicaux. Ils sont très lourds parce qu’ils ne sont pas compressés. Les convertir en JPG les rend prêts à être envoyés par e-mail ou déposés n’importe où, pour une fraction du poids.",
    ],
    differences: [
      "Le BMP enregistre l’image sans compression (ou avec une compression minime) : une photo de 12 mégapixels peut dépasser 30 Mo. Le JPG compresse avec perte et ramène cette même photo à quelques Mo, compatible avec tout.",
    ],
    kept: [
      "La résolution et l’aspect de l’image.",
      "Les couleurs, avec une perte invisible à la qualité par défaut.",
    ],
    lost: [
      "Un peu de netteté sur les textes et les traits fins, à cause de la compression ; pour des captures avec du texte, préférez le PNG.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images, par lots.",
    ],
    steps: [
      "Choisissez les BMP.",
      "Laissez JPG comme format de sortie et réglez la qualité si vous le souhaitez.",
      "Cliquez sur Convertir et téléchargez les JPG ou le ZIP.",
    ],
    faq: [
      {
        q: "Le fichier est-il beaucoup plus léger ?",
        a: "Énormément : un BMP non compressé descend en général à moins du dixième de son poids en JPG.",
      },
      {
        q: "BMP en JPG ou en PNG ?",
        a: "JPG pour les photos ; PNG pour les captures d’écran, les plans ou les images avec du texte, car il ne perd rien et réduit aussi fortement le poids du BMP.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "bmp>png": {
    when: [
      "Convertir un BMP en PNG est idéal pour les captures d’écran, les schémas, les images de scanners ou d’appareils techniques qui enregistrent en BMP : le PNG est bien plus léger et conserve l’image strictement identique, sans la perte du JPG.",
    ],
    differences: [
      "Les deux formats conservent chaque pixel à l’identique, mais le BMP ne compresse presque pas, alors que le PNG compresse (sans perte). Le résultat : la même image dans un fichier plusieurs fois plus petit, compatible avec le web, les documents et les logiciels de design.",
    ],
    kept: [
      "L’image exacte, pixel par pixel.",
      "La résolution et les couleurs.",
    ],
    lost: [
      "Rien sur l’image. Seuls le format et le poids du fichier changent.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les fichiers, par lots.",
    ],
    steps: [
      "Choisissez les BMP.",
      "Laissez PNG comme format de sortie.",
      "Cliquez sur Convertir et téléchargez les PNG ou le ZIP.",
    ],
    faq: [
      {
        q: "Perd-on de la qualité ?",
        a: "Non. Le PNG compresse sans perte : l’image est donc identique.",
      },
      {
        q: "Pourquoi le BMP était-il si lourd ?",
        a: "Parce qu’il enregistre chaque pixel sans compression. Le PNG tire parti des zones répétées pour stocker la même chose dans moins d’espace.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "tiff>jpg": {
    when: [
      "Les TIFF proviennent de scanners, d’appareils photo professionnels, d’imprimeries et d’archives photo. Ils sont excellents pour l’archivage ou l’impression, mais ils sont lourds et presque aucun navigateur ni réseau social ne les affiche. Les convertir en JPG les rend prêts à être partagés ou publiés.",
    ],
    differences: [
      "Le TIFF est un format d’archivage professionnel : il enregistre souvent l’image sans perte, en haute résolution et parfois avec plusieurs pages dans un même fichier. Le JPG compresse avec perte pour rester léger et s’ouvre sur n’importe quel appareil.",
    ],
    kept: [
      "La résolution de l’image.",
      "Les couleurs, avec une perte invisible à la qualité par défaut.",
    ],
    lost: [
      "Si le TIFF a plusieurs pages (par exemple un fax ou une numérisation de plusieurs feuilles), seule la première est convertie.",
      "La transparence et les calques, s’il y en a.",
      "Les métadonnées du fichier.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur. Seul Safari lit le TIFF nativement ; dans les autres navigateurs, un décodeur intégré à la page est utilisé. Certains TIFF peu courants (par exemple en 16 bits par canal ou avec des compressions inhabituelles) peuvent ne pas s’ouvrir.",
    ],
    steps: [
      "Choisissez les TIFF.",
      "Laissez JPG comme format de sortie ; si les images sont énormes, réduisez la largeur pour les partager.",
      "Cliquez sur Convertir et téléchargez les JPG ou le ZIP.",
    ],
    faq: [
      {
        q: "Mon TIFF a plusieurs pages : sont-elles toutes converties ?",
        a: "Non, seulement la première. Si vous avez besoin de toutes, mieux vaut numériser à nouveau chaque page séparément ou enregistrer le document en PDF depuis le logiciel du scanner.",
      },
      {
        q: "Perd-on de la qualité ?",
        a: "Un peu, à cause de la compression JPG, mais à la qualité par défaut cela ne se voit pas à l’écran. Pour imprimer, montez la qualité à 90 à 95.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "tiff>pdf": {
    when: [
      "Convertir un TIFF en PDF permet de remettre une numérisation ou une image d’archive sous forme de document : pour la joindre à une démarche, l’envoyer par e-mail ou la ranger avec d’autres PDF.",
    ],
    differences: [
      "Le TIFF est un format d’image professionnel très utilisé par les scanners ; le PDF est le format universel des documents. À la conversion, l’image est placée sur une page de même taille, sans marges.",
    ],
    kept: [
      "L’image de la première page, avec sa résolution.",
      "Une qualité élevée : l’image est enregistrée en JPG de qualité 92 dans le PDF.",
    ],
    lost: [
      "Seule la première page d’un TIFF de plusieurs pages est convertie.",
      "Le texte de l’image ne peut être ni recherché ni sélectionné ; pour cela, passez le PDF dans « OCR de PDF numérisé ».",
      "La transparence, s’il y en a.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les fichiers. Certains TIFF peu courants peuvent ne pas s’ouvrir. Pour réunir plusieurs images dans un PDF, utilisez Images en PDF.",
    ],
    steps: [
      "Choisissez le TIFF.",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF et, s’il est trop lourd, passez-le dans Compresser un PDF.",
    ],
    faq: [
      {
        q: "Toutes les pages du TIFF sont-elles converties ?",
        a: "Non, seulement la première. Pour les documents de plusieurs feuilles, numérisez directement en PDF ou réunissez les pages sous forme d’images avec Images en PDF.",
      },
      {
        q: "Le texte du PDF est-il recherchable ?",
        a: "Non, il contient une image. Utilisez « OCR de PDF numérisé » pour y ajouter le texte reconnu.",
      },
      {
        q: "Mes fichiers sont-ils envoyés sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },

  "png>ico": {
    when: [
      "Convertir un PNG en ICO, c’est ce qu’il vous faut pour créer le favicon d’un site web (l’icône de l’onglet du navigateur) ou une icône de programme ou de raccourci sous Windows. Si vous avez votre logo en PNG sur fond transparent, c’est le meilleur point de départ.",
    ],
    differences: [
      "Un PNG est une seule image. Un ICO est un conteneur qui regroupe plusieurs versions de la même icône en différentes tailles, pour que Windows et les navigateurs utilisent la plus adaptée à chaque endroit (onglet, barre des tâches, bureau).",
    ],
    kept: [
      "La transparence du PNG.",
      "Le dessin complet, centré dans un carré si l’image n’est pas carrée.",
      "Les tailles 16, 32, 48, 64, 128 et 256 px dans un même fichier (uniquement celles qui ne dépassent pas la taille de votre image).",
    ],
    lost: [
      "Aux petites tailles (16 et 32 px), les détails fins et les textes deviennent illisibles : c’est une limite de la taille, pas du format. Une icône simple fonctionne mieux.",
      "Si l’image n’est pas carrée, des bandes transparentes apparaissent sur les côtés ou en haut et en bas.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images. Pour obtenir aussi les PNG du favicon (comme apple-touch-icon) et le code HTML, utilisez le « Générateur de favicon ».",
    ],
    steps: [
      "Préparez un PNG carré d’au moins 256 × 256 px, idéalement sur fond transparent.",
      "Choisissez-le et laissez ICO comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le fichier .ico.",
      "Pour un site web, déposez-le à la racine sous le nom favicon.ico.",
    ],
    faq: [
      {
        q: "Quelle taille d’image me faut-il ?",
        a: "L’idéal est une image carrée de 256 × 256 px ou plus. Avec une image plus petite, l’ICO ne contient que les tailles qui ne la dépassent pas.",
      },
      {
        q: "La transparence est-elle conservée ?",
        a: "Oui, chaque taille est enregistrée en PNG 32 bits dans l’ICO.",
      },
      {
        q: "Cela fonctionne-t-il comme icône Windows ?",
        a: "Oui. Ce format (avec des images PNG à l’intérieur) est compatible avec Windows Vista et les versions ultérieures, ainsi qu’avec tous les navigateurs actuels.",
      },
    ],
  },

  "jpg>ico": {
    when: [
      "Convertir un JPG en ICO permet de créer un favicon ou une icône Windows à partir d’une photo ou d’un logo que vous n’avez qu’en JPG, par exemple une photo de profil ou le logo qu’on vous a envoyé par message.",
      "Si vous avez le logo en PNG sur fond transparent, utilisez plutôt celui-ci : le résultat est bien plus joli sur les onglets sombres.",
    ],
    differences: [
      "Le JPG est une photo sans transparence ; l’ICO est un conteneur d’icônes en plusieurs tailles. À la conversion, l’image est réduite à chaque taille standard et enregistrée dans l’ICO.",
    ],
    kept: [
      "L’image complète, centrée dans un carré.",
      "Les tailles de 16 à 256 px dans un même fichier.",
    ],
    lost: [
      "Le JPG n’a pas de transparence : le fond de la photo reste donc tel quel ; si l’image n’est pas carrée, les bandes ajoutées sont transparentes.",
      "En 16 et 32 px, une photo se réduit à très peu de pixels et perd ses détails. Recadrez d’abord la partie importante (un visage, l’initiale du logo).",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les images.",
    ],
    steps: [
      "Si nécessaire, recadrez l’image en carré avec Recadrer une image, en ne gardant que l’essentiel.",
      "Choisissez le JPG et laissez ICO comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le fichier .ico.",
    ],
    faq: [
      {
        q: "Puis-je d’abord supprimer le fond ?",
        a: "Oui. Passez le JPG dans Supprimer l’arrière-plan d’une image, téléchargez le PNG et convertissez-le en ICO : l’icône aura un fond transparent.",
      },
      {
        q: "Pourquoi mon icône est-elle floue dans l’onglet ?",
        a: "Parce qu’en 16 px, il n’y a presque pas de place pour les détails. Un dessin simple ou une grande lettre rendent bien mieux qu’une photo.",
      },
      {
        q: "Mes images sont-elles envoyées sur un serveur ?",
        a: "Non, tout est traité dans votre navigateur.",
      },
    ],
  },

  "ico>png": {
    when: [
      "Convertir un ICO en PNG permet de récupérer l’image d’un favicon ou d’une icône Windows pour l’utiliser ailleurs : dans une présentation, un document, une maquette, ou pour créer une nouvelle icône à partir de l’ancienne.",
    ],
    differences: [
      "Un ICO contient une ou plusieurs versions d’une icône en différentes tailles. Un PNG est une seule image, que n’importe quel logiciel ouvre et modifie.",
    ],
    kept: ["La transparence de l’icône.", "Les couleurs exactes."],
    lost: [
      "Vous obtenez une seule image : le navigateur choisit l’une des versions de l’icône (en général la plus grande). Les autres ne sont pas exportées.",
      "Une icône qui ne contient que du 16 ou du 32 px ne gagne pas en détail : si vous l’agrandissez ensuite, elle sera pixélisée.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les fichiers. Les ICO très anciens aux formats de couleur peu courants peuvent ne pas s’ouvrir dans tous les navigateurs.",
    ],
    steps: [
      "Choisissez le fichier .ico.",
      "Laissez PNG comme format de sortie.",
      "Cliquez sur Convertir et téléchargez le PNG.",
    ],
    faq: [
      {
        q: "Quelle sera la taille du PNG ?",
        a: "Celle de la version de l’icône utilisée par le navigateur, en général la plus grande que contient le fichier (jusqu’à 256 × 256 px).",
      },
      {
        q: "Puis-je l’agrandir ?",
        a: "Vous pouvez le faire avec Redimensionner une image, mais une icône de quelques pixels paraîtra pixélisée ou floue une fois agrandie.",
      },
      {
        q: "Mes fichiers sont-ils envoyés sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },

  "svg>png": {
    when: [
      "Convertir un SVG en PNG est nécessaire quand vous avez un logo ou une illustration vectorielle à utiliser là où le SVG n’est pas accepté : réseaux sociaux, présentations, documents Word, messageries ou plateformes qui demandent une image classique.",
    ],
    differences: [
      "Un SVG est un dessin décrit par des formes et des textes, il reste donc net à n’importe quelle taille. Un PNG est une image en pixels de taille fixe. À la conversion, le SVG est « dessiné » à la taille que vous choisissez, et cette taille devient sa netteté maximale.",
    ],
    kept: [
      "La transparence du fond.",
      "Les formes, les couleurs et les dégradés, tels que le navigateur les dessine.",
      "Une netteté parfaite à la taille choisie : vous pouvez demander un grand PNG sans qu’il soit flou.",
    ],
    lost: [
      "La mise à l’échelle : le PNG ne peut plus être agrandi sans perdre en netteté.",
      "Les images ou polices que le SVG charge depuis Internet ne sont pas incluses ; les textes dont la police n’est pas installée utilisent une police du système.",
      "Les animations et le code du SVG.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur. La taille provient de la largeur, de la hauteur ou du viewBox du SVG ; s’il n’en a aucun, 1 024 px sont utilisés. Si le texte du logo s’affiche dans une autre police, vectorisez-le dans votre logiciel de design avant l’export.",
    ],
    steps: [
      "Choisissez le SVG.",
      "Laissez PNG comme format de sortie et choisissez la taille : par exemple 1 000 px de large pour les réseaux sociaux, ou le double de la taille d’affichage.",
      "Cliquez sur Convertir et téléchargez le PNG.",
    ],
    faq: [
      {
        q: "Quelle taille de PNG choisir ?",
        a: "Celle dont vous avez besoin : comme le SVG est vectoriel, l’agrandir ne fait pas perdre de qualité. Pour les écrans haute densité, choisissez le double de la taille d’affichage.",
      },
      {
        q: "Le texte du logo s’affiche dans une autre police : pourquoi ?",
        a: "Parce que le SVG utilise une police qui n’est ni incluse dans le fichier ni installée sur votre appareil. Dans votre logiciel de design, vectorisez le texte (conversion en contours) et exportez à nouveau le SVG.",
      },
      {
        q: "Le fond transparent est-il conservé ?",
        a: "Oui, le PNG conserve la transparence.",
      },
    ],
  },

  "svg>jpg": {
    when: [
      "Convertir un SVG en JPG est utile quand un site ou un service n’accepte que le JPG et que vous avez un logo, un graphique ou une illustration en SVG : formulaires, profils, plateformes publicitaires ou impressions rapides.",
      "Si la destination accepte le PNG, c’est la meilleure option : il conserve la transparence et les contours restent plus nets.",
    ],
    differences: [
      "Le SVG est un dessin vectoriel qui reste net à n’importe quelle taille ; le JPG est une image en pixels compressée avec perte, conçue pour les photos et sans transparence.",
    ],
    kept: [
      "Les formes et les couleurs, telles que le navigateur les dessine.",
      "La netteté à la taille que vous choisissez.",
    ],
    lost: [
      "La transparence : le fond devient blanc.",
      "Un peu de netteté sur les contours et les textes, à cause de la compression JPG ; montez la qualité à 90 pour les logos.",
      "Les images ou polices externes que charge le SVG, ainsi que ses animations.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur. La taille provient de la largeur, de la hauteur ou du viewBox du SVG (1 024 px s’il n’en a aucun).",
    ],
    steps: [
      "Choisissez le SVG.",
      "Laissez JPG comme format de sortie, montez la qualité à 90 et choisissez la taille en pixels.",
      "Cliquez sur Convertir et téléchargez le JPG.",
    ],
    faq: [
      {
        q: "Puis-je choisir une autre couleur de fond que le blanc ?",
        a: "Avec cette conversion, le fond transparent devient blanc. Si vous avez besoin d’une autre couleur, modifiez-la dans le SVG lui-même (avec un logiciel de design) avant de convertir, ou convertissez en PNG si la destination l’accepte.",
      },
      {
        q: "JPG ou PNG pour un logo ?",
        a: "PNG presque toujours : il conserve la transparence et les contours nets. JPG seulement si on vous l’impose.",
      },
      {
        q: "Mes fichiers sont-ils envoyés sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },

  "svg>pdf": {
    when: [
      "Convertir un SVG en PDF est utile pour envoyer un graphique, un plan ou une illustration sous forme de document, pour le joindre à un rapport ou pour qu’une personne sans logiciel de design puisse l’ouvrir et l’imprimer.",
    ],
    differences: [
      "Le SVG est un format vectoriel pour le web ; le PDF est un format de document qui peut lui aussi contenir des vecteurs. Avec cette conversion, toutefois, le SVG est dessiné sous forme d’image (PNG) sur une page de même taille.",
    ],
    kept: [
      "L’aspect du dessin, avec ses couleurs et ses formes, à la taille du SVG.",
      "La transparence, qui apparaît sur fond blanc dans le PDF.",
    ],
    lost: [
      "Le PDF n’est pas vectoriel : si vous zoomez beaucoup ou l’imprimez en grand format, les pixels se voient. Si vous avez besoin d’un PDF vectoriel (pour un imprimeur, par exemple), exportez-le depuis votre logiciel de design.",
      "Le texte du SVG ne peut pas être sélectionné dans le PDF.",
      "Les images et polices externes du SVG.",
    ],
    limits: [
      "La conversion se fait dans votre navigateur, sans envoyer les fichiers. La page a la taille du SVG (1 024 px s’il n’en définit pas) ; pour plus de résolution, convertissez d’abord en PNG en grande taille, puis transformez ce PNG en PDF.",
    ],
    steps: [
      "Choisissez le SVG.",
      "Laissez PDF comme format de sortie et cliquez sur Convertir.",
      "Téléchargez le PDF et vérifiez-le en zoomant à la taille à laquelle il sera utilisé.",
    ],
    faq: [
      {
        q: "Le PDF conserve-t-il les vecteurs ?",
        a: "Non : le dessin est enregistré comme image dans le PDF. Cela suffit pour des documents à l’écran ou une impression classique ; pour un imprimeur, exportez un PDF vectoriel depuis le logiciel de design.",
      },
      {
        q: "Comment obtenir plus de résolution ?",
        a: "Convertissez le SVG en PNG en choisissant une grande taille (par exemple 3 000 px), puis transformez ce PNG en PDF.",
      },
      {
        q: "Mes fichiers sont-ils envoyés sur un serveur ?",
        a: "Non, la conversion se fait dans votre navigateur.",
      },
    ],
  },
};
