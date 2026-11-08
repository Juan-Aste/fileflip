const body = `
Sur un vieux disque dur ou une clé USB dorment des vidéos d’il y a quinze ou vingt ans : l’anniversaire filmé avec un appareil photo compact, le mariage monté par quelqu’un dans Windows Movie Maker, les clips du premier téléphone avec caméra. Vous les copiez sur votre téléphone ou votre télé, et elles ne s’ouvrent pas, ou bien on entend le son sans voir l’image. La solution consiste à les convertir en MP4, le format que lisent pratiquement tous les téléphones, téléviseurs, ordinateurs et réseaux sociaux. Ce guide explique comment faire dans le navigateur, sans rien installer, et à quoi s’attendre.

## Pourquoi votre téléphone ou votre télé n’ouvre pas vos vieilles vidéos

Un fichier vidéo comporte deux couches : le **conteneur** (ce qu’indique l’extension : AVI, WMV, MP4…) et les **codecs**, c’est-à-dire la façon dont l’image et le son sont compressés à l’intérieur. Les vieilles vidéos combinent souvent les deux d’une manière que presque plus rien ne prend en charge :

- **AVI** : le format Windows des années 1990 et 2000, avec de la vidéo DivX ou Xvid (MPEG-4 Part 2) et du son MP3. Beaucoup d’appareils photo compacts l’utilisaient, tout comme les films téléchargés à l’époque.
- **WMV** : le format de Windows Media et de Movie Maker, avec les codecs maison de Microsoft.
- **3GP** : le format des téléphones d’avant les smartphones, avec de la vidéo H.263 et du son AMR, pensé pour des écrans minuscules.
- **MOV** : le format de QuickTime, de l’iPhone et de nombreux appareils photo. Il s’ouvre en général sur les appareils Apple, mais pas toujours sur Android ni sur une télé. Si c’est un MOV récent, en H.264 ou HEVC, il passe en MP4 sans réencodage, en quelques secondes.
- **FLV**, **MPG**, **VOB** et **RM** : les vidéos Flash des sites d’il y a des années, le MPEG-1 et le MPEG-2 des caméscopes et des DVD, et RealMedia.

Les téléphones, les téléviseurs connectés et les navigateurs actuels n’intègrent plus ces codecs. Un MP4 avec de la vidéo **H.264** et du son **AAC**, en revanche, se lit partout. C’est ce que vous obtenez en convertissant.

## Convertir une vieille vidéo en MP4, étape par étape

1. Ouvrez [Convertir une vidéo](tool:video-converter) et déposez vos vidéos dans le cadre, ou cliquez pour les choisir. Vous pouvez en ajouter plusieurs à la fois.
2. Dans **Convertir en**, laissez **MP4** sélectionné (c’est le choix par défaut).
3. Cliquez sur **Convertir la vidéo**. Pendant le travail, une barre **Traitement…** s’affiche ; si vous vous êtes trompé de fichier, cliquez sur **Annuler**.
4. Quand **Votre fichier est prêt** apparaît, cliquez sur **Télécharger** à côté de chaque vidéo, ou sur **Tout télécharger en ZIP** si vous en avez converti plusieurs.
5. Copiez les MP4 sur votre téléphone, envoyez-les dans votre cloud ou mettez-les sur une clé USB pour la télé.

![Trois vieilles vidéos (AVI, WMV et 3GP) chargées dans Convertir une vidéo, avec MP4 choisi comme format de sortie](shot:video-viejo-mp4-elegir.fr "Un AVI, un WMV et un 3GP prêts à passer en MP4 en une seule fois.")

Tout se passe dans votre navigateur : les vidéos ne sont envoyées à aucun serveur. C’est important pour des vidéos de famille, et cela vous évite d’attendre l’envoi d’un fichier lourd.

## Pourquoi la première fois prend un peu plus de temps

Votre navigateur sait lire le MP4, le MOV, le MKV et le WebM, mais pas ces anciens formats. Quand il en reconnaît un, l’outil télécharge un moteur FFmpeg (environ 31 Mo, depuis notre propre domaine) qui tourne dans la page. La conversion se fait alors en deux étapes :

1. FFmpeg lit la vieille vidéo et la transforme en un format intermédiaire que le navigateur comprend.
2. Ce fichier intermédiaire suit la conversion normale : il est encodé en H.264 avec l’encodeur de votre navigateur, et le son passe en AAC.

C’est pourquoi la barre de progression avance en deux temps et que la conversion est plus lente qu’avec un MP4 récent. À titre indicatif, lors de notre essai sur un ordinateur de bureau, un AVI d’une minute en 640 × 480 a pris environ une demi-minute, téléchargement du moteur compris. Sur un téléphone ou un vieil ordinateur, c’est plus long. Les conversions suivantes réutilisent le moteur déjà téléchargé.

À la fin, chaque vidéo indique ce qui a été fait : avec les anciens formats, vous verrez **Vidéo réencodée en H.264.**, car l’image est toujours recompressée, en haute qualité.

![Résultat de la conversion : trois MP4 prêts à télécharger, chacun réencodé en H.264](shot:video-viejo-mp4-resultado.fr "Chaque fichier indique son codec final ; s’il y en a plusieurs, vous pouvez tout télécharger en ZIP.")

## Les limites à connaître

- **Taille** : jusqu’à 200 Mo par fichier et jusqu’à 50 fichiers à la fois.
- **Durée** : avec les anciens formats, le maximum est de 20 minutes de vidéo par fichier, car le moteur FFmpeg est plus lent et travaille dans la mémoire du navigateur. Un MP4, MOV, MKV ou WebM peut durer jusqu’à 2 heures.
- **Temps** : si une vidéo met plus de 30 minutes à se convertir, le traitement s’arrête pour ne pas bloquer votre appareil.
- **Pistes** : la piste vidéo et la piste audio principales sont conservées. Les sous-titres et les pistes audio supplémentaires, comme la deuxième langue d’un DVD, ne sont pas copiés.
- **DVD** : les fichiers VOB d’un DVD pèsent souvent près de 1 Go chacun, au-delà de la limite, et sont en plus découpés en morceaux. L’outil convient aux petits VOB, mais pas à la conversion d’un DVD entier.
- **Navigateur** : pour obtenir du H.264, utilisez Chrome, Edge ou Safari. Dans les navigateurs sans encodeur H.264 (comme Chromium ou Firefox sous Linux), un avertissement s’affiche et le MP4 est créé en VP9 ou en AV1, lisibles dans Chrome, Edge, Firefox et sur Android, mais peut-être pas sur un iPhone ni sur tous les téléviseurs.

## Ce que la conversion ne peut pas réparer

Convertir change le format, pas l’image. Une vidéo de téléphone de 2008 filmée en 176 × 144 garde cette taille : elle passera sur la télé, mais petite et floue, exactement comme l’original. L’outil n’augmente pas la résolution, n’enlève pas le bruit d’un vieil appareil et ne récupère pas non plus un fichier abîmé : si la vidéo se coupe au milieu sur votre ordinateur, le MP4 se coupera aussi.

Certaines vidéos, pour l’instant, ne peuvent pas être lues même si leur extension semble familière. Lors de nos essais, les très vieux MOV QuickTime (avec des codecs comme Sorenson ou Cinepak) ont échoué, tout comme les MP4 de certains vieux appareils qui utilisent du MPEG-4 Part 2 au lieu du H.264. Dans ces cas, un message indique que le navigateur ne peut pas lire la vidéo du fichier.

## Après la conversion

Une fois le MP4 obtenu, vous pouvez continuer avec d’autres outils, qui traitent le MP4 comme le convertisseur :

- **Pour l’envoyer par WhatsApp ou par e-mail** : s’il est trop lourd, [Compresser une vidéo](tool:compress-video) réduit la qualité ou la résolution.
- **Pour n’en garder qu’un passage** : [Couper une vidéo](tool:trim-video) enlève le début et la fin, comme les minutes où la caméra filmait le sol.
- **Pour faire une seule vidéo avec plusieurs clips** : [Fusionner des vidéos](tool:join-videos) les assemble dans l’ordre de votre choix, par exemple tous les 3GP d’un voyage.
- **Pour un ralenti ou un accéléré** : [Changer la vitesse d’une vidéo](tool:video-speed) va de 0,25× à 4×.
- **Pour ne garder que le son** : [Extraire l’audio d’une vidéo](tool:extract-audio) l’enregistre en MP3, M4A, WAV, FLAC ou OGG.
- **Pour transcrire ce qui se dit** : [Transcrire un audio en texte](tool:audio-to-text) accepte le MP4 ; le guide [Comment transcrire gratuitement un audio ou un message vocal en texte](guide:transcribe-audio) explique comment faire.
- **Pour partager un court moment** : [Vidéo en GIF](tool:video-to-gif) transforme quelques secondes en animation.

Si ce qui ne s’ouvre pas sur votre téléphone, ce sont des photos et non des vidéos, le guide [Comment convertir les photos HEIC de l’iPhone en JPG](guide:heic-to-jpg) traite du même problème avec les images de l’iPhone.

## En résumé

- Les vidéos AVI, WMV, 3GP, FLV, MPG, VOB et RM ne s’ouvrent pas sur beaucoup de téléphones et de téléviseurs, car elles utilisent des codecs qui ne sont plus intégrés.
- [Convertir une vidéo](tool:video-converter) les transforme en MP4 avec H.264 et AAC, dans le navigateur et sans les envoyer nulle part.
- La première fois, l’outil télécharge un moteur d’environ 31 Mo et il est plus lent qu’avec un MP4 ; le maximum est de 20 minutes et 200 Mo par fichier.
- La conversion n’améliore pas l’image : une vidéo en basse résolution le reste.
- Pour du H.264, utilisez Chrome, Edge ou Safari.
`;

export default body;
