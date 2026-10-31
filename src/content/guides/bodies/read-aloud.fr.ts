const body = `
Faire lire un texte à voix haute par son ordinateur ou son téléphone est utile pour bien plus de choses qu'on ne le croit : relire ce qu'on a écrit et repérer les fautes que les yeux ne voient plus, reposer sa vue après une journée devant l'écran, écouter un rapport en cuisinant ou en marchant, travailler la prononciation d'une langue étrangère, ou tout simplement lire plus confortablement en cas de dyslexie ou de basse vision. Ce guide passe en revue les options déjà présentes dans votre système et montre comment faire avec notre outil [Lire un texte à voix haute](tool:text-to-speech), qui lit aussi les PDF, les fichiers Word et les photos de documents.

## Option 1 : ce que votre système propose déjà

Tous les systèmes d'exploitation actuels ont une fonction pour lire du texte à voix haute. Elles valent la peine d'être connues, car elles fonctionnent dans n'importe quelle application :

- **Windows** : le navigateur Edge propose **Lecture à voix haute** (dans le menu ou avec Ctrl + Maj + U) pour les pages web et les PDF que vous y ouvrez. Pour tout le système, il y a le **Narrateur** (Ctrl + Windows + Entrée), conçu pour les personnes aveugles, avec de nombreux raccourcis.
- **Mac** : dans **Réglages Système → Accessibilité → Contenu énoncé**, activez **Énoncer la sélection**. Sélectionnez ensuite n'importe quel texte et appuyez sur Option + Échap.
- **iPhone et iPad** : dans **Réglages → Accessibilité → Contenu énoncé**, activez **Énoncer la sélection** (« Énoncer » apparaît quand vous sélectionnez du texte) et **Énoncer l'écran** (balayez vers le bas avec deux doigts depuis le haut de l'écran).
- **Android** : dans **Paramètres → Accessibilité**, activez **Sélectionner pour prononcer**. Les noms peuvent varier légèrement selon la marque du téléphone.
- **Microsoft Word** : dans l'onglet **Révision**, **Lecture à voix haute** lit le document à partir de l'emplacement du curseur.

Ces fonctions sont pratiques pour lire un paragraphe, mais elles ont leurs limites : toutes ne lisent pas des fichiers qui ne sont pas ouverts, elles ne surlignent pas la phrase en cours de lecture ou ne permettent pas d'enregistrer l'audio.

## Option 2 : Lire un texte à voix haute, dans le navigateur

[Lire un texte à voix haute](tool:text-to-speech) réunit sur une seule page ce qui manque d'habitude :

- L'outil lit du **texte collé** ou des **fichiers** : TXT, Markdown, HTML, PDF contenant du texte, Word (DOCX), EPUB, et aussi les photos ou les numérisations d'une page, dont il reconnaît le texte par OCR.
- Il **surligne la phrase** en cours de lecture, pour que vous puissiez suivre des yeux.
- Vous pouvez **mettre en pause**, revenir à la phrase précédente, passer à la suivante et choisir la **vitesse**, de 0,5× à 2×.
- Il détecte la **langue** du texte (anglais, espagnol, portugais, français ou chinois) et choisit une voix dans cette langue.
- Avec la **voix IA**, vous pouvez **télécharger la lecture en MP3**.

### Étape par étape

1. Ouvrez [Lire un texte à voix haute](tool:text-to-speech).
2. Collez le texte dans la zone, ou appuyez sur **Ouvrir un fichier** et choisissez un PDF, un fichier Word, un EPUB ou une photo.
3. Choisissez le type de voix : **Voix de l’appareil** ou **Voix IA**.
4. Vérifiez la langue, la voix et la vitesse.
5. Appuyez sur **Lire**. La barre d'espace met en pause et relance la lecture.

![L'outil Lire un texte à voix haute avec un texte collé et la voix IA sélectionnée](shot:leer-en-voz-alta "Vous pouvez écouter avec les voix de votre appareil ou avec une voix IA plus naturelle, qui permet aussi de télécharger un MP3.")

Le texte est extrait et lu sur votre appareil : le fichier n'est jamais envoyé sur un serveur. L'outil accepte jusqu'à 50 000 caractères par lecture, soit environ 15 à 20 pages de texte suivi ; si le texte est plus long, il est coupé et vous en êtes averti.

## Voix de l'appareil ou voix IA

**Voix de l'appareil** : ce sont celles fournies avec votre système ou votre navigateur. Elles commencent à lire immédiatement et ne téléchargent rien. Leur qualité dépend beaucoup de l'appareil : sur un Mac ou un iPhone, elles sonnent généralement bien ; sur certains appareils Windows ou Android, de façon plus robotique. Si aucune voix n'est installée pour votre langue, l'outil vous le signale et vous pouvez en installer depuis les réglages de votre système.

Un point de confidentialité : certaines voix du navigateur, signalées par la mention **« en ligne »** (comme celles de Google ou de Microsoft dans Chrome et Edge), envoient le texte à ce fournisseur pour générer l'audio. Si le texte est confidentiel, choisissez une voix qui ne porte pas la mention « en ligne ».

**Voix IA** : un modèle de synthèse vocale (Supertonic 3) qui s'exécute dans votre navigateur. Elle sonne plus naturelle, propose 10 voix et permet de **télécharger un MP3**. En contrepartie :

- La première fois, elle télécharge environ 400 Mo (ensuite, elle reste enregistrée dans le navigateur).
- Elle génère l'audio sur le processeur de votre appareil : sur un ordinateur, cela prend à peu près la durée de l'audio ; sur un téléphone, nettement plus.
- Elle est disponible en anglais, en espagnol, en portugais et en français. Le chinois est lu avec les voix de l'appareil.

Si vous voulez écouter quelque chose une seule fois, tout de suite, les voix de l'appareil suffisent. Si vous voulez un audio à écouter plus tard, en voiture ou sur votre téléphone hors connexion, utilisez la voix IA et téléchargez le MP3.

## Comment écouter un PDF

Ouvrez le PDF avec **Ouvrir un fichier**. Si le PDF contient du texte numérique, celui-ci est extrait instantanément. Quelques conseils :

- **Les en-têtes et les numéros de page** qui se répètent sur chaque page apparaissent dans le texte. Vous pouvez les supprimer dans la zone avant de lancer la lecture.
- Si le PDF est **numérisé**, il ne contient pas de texte et l'outil vous le signale. Passez-le d'abord dans [OCR de PDF numérisé](tool:ocr-pdf) et ouvrez le PDF obtenu, ou prenez la page en photo et ouvrez directement la photo : l'outil reconnaît le texte dans les images.
- Un **livre EPUB** s'ouvre directement, sauf s'il est protégé contre la copie (DRM), comme beaucoup de livres achetés en ligne.

## Des usages à essayer

- **Relire vos propres textes** : entendre votre texte à vitesse normale révèle les répétitions, les phrases trop longues et les fautes que vos yeux ne voient plus.
- **Réviser** : écouter vos notes tout en les suivant des yeux aide à les retenir. À 1,25× ou 1,5×, vous gagnez du temps.
- **Langues étrangères** : choisissez une voix dans la langue que vous apprenez et baissez la vitesse pour bien entendre la prononciation.
- **Accessibilité** : pour les personnes dyslexiques, malvoyantes ou qui ont les yeux fatigués, lire avec la phrase surlignée rend les textes longs plus confortables.

## Si vous publiez l'audio

Vous pouvez utiliser le MP3 généré avec la voix IA, mais la licence du modèle vous demande d'indiquer qu'il s'agit d'une voix générée par IA et interdit de l'utiliser pour se faire passer pour quelqu'un, diffamer, harceler ou tromper. Le lien vers la licence complète se trouve à côté du bouton de téléchargement.

## Dans l'autre sens

Si vous avez besoin de l'inverse, transformer en texte ce que quelqu'un a dit dans un enregistrement ou un message vocal, le guide [Comment transcrire gratuitement un audio ou un message vocal en texte](guide:transcribe-audio) explique comment faire avec [Transcrire un audio en texte](tool:audio-to-text), là aussi dans votre navigateur.

## En résumé

- Votre système sait déjà lire à voix haute : Edge et le Narrateur sous Windows, « Contenu énoncé » sur Mac et iPhone, « Sélectionner pour prononcer » sur Android.
- [Lire un texte à voix haute](tool:text-to-speech) lit du texte, des PDF, des fichiers Word, des EPUB et des photos, surligne la phrase et permet de choisir la vitesse, sans envoyer le fichier.
- Les voix de l'appareil démarrent tout de suite ; la voix IA sonne plus naturelle et permet de télécharger un MP3.
- Évitez les voix « en ligne » si le texte est confidentiel.
`;

export default body;
