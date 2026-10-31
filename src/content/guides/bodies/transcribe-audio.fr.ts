const body = `
Transformer en texte un long message vocal, un cours enregistré ou une interview, c'était jusqu'ici écouter et taper, ou payer un service auquel il fallait envoyer l'audio. Aujourd'hui, un modèle de reconnaissance vocale peut le faire sur votre propre ordinateur ou téléphone, gratuitement et sans que l'audio quitte votre appareil. Ce guide explique comment utiliser notre outil [Transcrire un audio en texte](tool:audio-to-text), à quoi s'attendre côté résultat et comment récupérer le fichier audio depuis WhatsApp ou un iPhone.

## Comment ça marche : Whisper dans votre navigateur

L'outil utilise **Whisper**, le modèle de reconnaissance vocale publié par OpenAI sous licence libre. Au lieu d'envoyer votre audio à un serveur, le modèle est téléchargé une fois dans votre navigateur et la transcription s'exécute sur le processeur de votre appareil.

Cela a deux conséquences pratiques :

- **Confidentialité** : l'audio n'est envoyé nulle part. La seule chose téléchargée est le modèle, depuis Hugging Face, la première fois que vous l'utilisez ; ensuite, il reste enregistré dans le navigateur.
- **Vitesse variable** : elle dépend de votre appareil. Un ordinateur récent transcrit plus vite que la durée de l'audio ; un téléphone, plus lentement.

## Étape par étape

1. Ouvrez [Transcrire un audio en texte](tool:audio-to-text) et choisissez le fichier audio ou vidéo. Sa durée s'affiche.
2. Choisissez le **Modèle** : **Rapide** ou **Précis (plus lent)**. À côté de chacun, vous voyez la taille du téléchargement, ou « déjà téléchargé » si vous l'avez déjà utilisé.
3. Choisissez la **Langue de l'audio**, ou laissez **Détecter automatiquement**.
4. Appuyez sur **Transcrire**. La progression et le temps restant s'affichent ; vous pouvez annuler à tout moment.
5. Relisez le texte, corrigez ce qui doit l'être, puis copiez-le ou téléchargez-le en **TXT**, **SRT** ou **VTT**.

![Un enregistrement transcrit, avec le texte modifiable et les boutons de téléchargement](shot:transcribir-resultado "Un enregistrement de 7 secondes en anglais, transcrit avec le modèle rapide : chaque ligne est une phrase avec son minutage.")

L'outil accepte l'audio (MP3, WAV, M4A, OGG, OPUS, FLAC et d'autres) et la vidéo (MP4, MOV, MKV, WEBM ; c'est la bande son qui est transcrite), jusqu'à 30 minutes par fichier.

## Rapide ou précis : lequel choisir

| | Rapide | Précis |
| --- | --- | --- |
| Modèle | Whisper tiny | Whisper base |
| Téléchargement (une seule fois) | environ 43 Mo | environ 79 Mo |
| Sur un ordinateur de bureau | environ 3,8 minutes d'audio par minute | environ 2,3 minutes d'audio par minute |
| Sur un téléphone milieu de gamme (estimation) | près d'1 minute d'audio par minute | une demi-minute d'audio par minute |

Nous avons mesuré ces vitesses avec 3 minutes de parole en espagnol sur notre machine de test ; les vôtres peuvent être différentes. Un enregistrement de 10 minutes prend donc environ 3 minutes sur un ordinateur avec le modèle rapide, et une dizaine de minutes sur un téléphone.

Commencez par le modèle **rapide**, surtout sur un téléphone. Si le résultat contient beaucoup d'erreurs, à cause d'un bruit de fond, d'un accent prononcé ou de termes techniques, relancez la transcription avec le modèle **précis**.

## Quelle est la qualité du résultat

Avec une voix claire, une seule personne qui parle et peu de bruit, le texte sort presque prêt. Nous avons fait nos essais avec des enregistrements en anglais et en espagnol. Le court enregistrement en anglais de la capture ci-dessus est sorti mot pour mot. Avec un audio plus long ou plus difficile, c'est une autre histoire : sur un enregistrement de 36 secondes en espagnol, le modèle rapide a reconnu presque tous les mots, mais a trébuché sur les passages les plus difficiles. Il a écrit le nom de la marque « Fileflect » sous la forme « File Efect » et confondu quelques mots dans des expressions qui se ressemblent à l'oral. Ce sont les erreurs typiques : noms propres, marques, mots rares et expressions qui sonnent pareil. Dans nos essais, le modèle précis a transcrit ce même audio avec moins d'erreurs.

D'autres limites à connaître :

- **Il ne distingue pas les intervenants.** Dans une interview ou une réunion, le texte sort d'un seul bloc, sans indiquer qui a dit quoi.
- **Les nombres et les sigles** peuvent être écrits de différentes façons.
- **Une musique forte, du bruit ou plusieurs personnes qui parlent en même temps** dégradent beaucoup le résultat.
- **Les longs silences** : le modèle peut les sauter ou, plus rarement, répéter une phrase. Relisez le texte avant de l'utiliser pour quelque chose d'important.

Si la langue détectée est fausse (cela arrive avec des enregistrements très courts ou qui mélangent plusieurs langues), choisissez vous-même la langue et relancez la transcription.

## Comment récupérer l'audio depuis WhatsApp ou un iPhone

**Messages vocaux WhatsApp** : appuyez longuement sur le message vocal et utilisez l'option de partage ou de transfert pour l'enregistrer dans Fichiers ou vous l'envoyer par e-mail. Les menus varient un peu entre iPhone et Android, mais vous obtenez dans tous les cas un fichier .opus ou .ogg, que l'outil accepte directement.

**Dictaphone de l'iPhone** : dans l'app Dictaphone, touchez l'enregistrement, puis les trois points et **Partager**, et choisissez **Enregistrer dans Fichiers**. Vous obtenez un fichier .m4a.

**Enregistrements de réunions ou vidéos** : si vous avez la vidéo, inutile d'en extraire le son, l'outil s'en charge. Si vous voulez seulement l'audio pour le garder ou l'envoyer, [Extraire l'audio d'une vidéo](tool:extract-audio) le sépare.

Si votre navigateur ne parvient pas à lire le fichier (cela arrive avec certains M4A dans certains navigateurs), essayez Chrome, Edge ou Safari, ou convertissez-le d'abord avec [Convertir de l'audio](tool:audio-converter).

## Les enregistrements de plus de 30 minutes

Cette limite évite que la transcription dure trop longtemps ou que le navigateur manque de mémoire. Pour un enregistrement plus long, découpez-le en plusieurs parties avec [Couper un audio](tool:trim-audio) et transcrivez chacune d'elles. Un conseil : coupez pendant une pause, pas au milieu d'une phrase, pour que le modèle ne perde pas de mots à la coupure.

## Utiliser la transcription comme sous-titres

Le fichier **SRT** ou **VTT** contient chaque phrase avec son heure de début et de fin, en lignes courtes, prêt à être chargé dans un lecteur vidéo, sur YouTube ou dans un logiciel de montage. Si vous corrigez des mots dans le texte sans fusionner ni couper de lignes, les sous-titres reprennent vos corrections.

Si les sous-titres sont en avance ou en retard sur la vidéo, [Synchroniser des sous-titres](tool:subtitle-sync) les décale tous d'un coup. Et si vous avez besoin d'un autre format, [Convertir des sous-titres](tool:subtitle-converter) transforme le SRT en VTT, ASS et d'autres formats.

## Dans l'autre sens : du texte à la voix

Si vous avez besoin de l'inverse, que l'ordinateur vous lise un texte ou un document, [Lire un texte à voix haute](tool:text-to-speech) le fait avec les voix de votre système ou une voix IA, là aussi dans votre navigateur. Le guide [Comment faire lire un texte ou un PDF à voix haute par l'ordinateur](guide:read-aloud) l'explique en détail.

## En résumé

- [Transcrire un audio en texte](tool:audio-to-text) fait tourner Whisper dans votre navigateur : gratuitement et sans envoyer l'audio.
- Commencez par le modèle rapide ; s'il y a beaucoup d'erreurs, passez au modèle précis.
- Vérifiez toujours les noms propres, les nombres et les expressions qui se ressemblent à l'oral.
- L'outil accepte les messages vocaux WhatsApp (.opus, .ogg), les enregistrements de l'iPhone (.m4a) et les vidéos, jusqu'à 30 minutes.
- Téléchargez le TXT pour le texte, le SRT ou le VTT pour des sous-titres.
`;

export default body;
