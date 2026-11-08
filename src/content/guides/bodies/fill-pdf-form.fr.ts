const body = `
Une inscription, une demande de bourse, une attestation sur l’honneur ou une fiche client : beaucoup de démarches arrivent sous la forme d’un PDF à remplir et à renvoyer. L’imprimer, le remplir à la main et le scanner fonctionne, mais le résultat est souvent difficile à lire. Si le PDF est un formulaire avec des champs, vous pouvez le remplir directement sur votre ordinateur ou votre téléphone et le renvoyer avec des réponses tapées au clavier. Ce guide explique comment faire, ce que veut dire « aplatir » un formulaire et que faire quand le PDF n’a aucun champ.

## Avant de commencer : votre PDF a-t-il des champs ?

Tous les formulaires PDF ne se ressemblent pas :

- **Un formulaire avec des champs** (aussi appelé AcroForm) : quand vous l’ouvrez dans un lecteur PDF, vous pouvez cliquer dans les cases et écrire. C’est le cas de la plupart des formulaires que les administrations, les banques et les écoles proposent au téléchargement.
- **Un formulaire « plat »** : il n’y a que des lignes ou des cases dessinées sur la page. C’est un papier scanné ou un document exporté sans champs. Il n’y a rien à remplir : il faut écrire par-dessus.
- **Un formulaire XFA** : un ancien format d’Adobe (LiveCycle) que seul Adobe Acrobat sait bien remplir. C’est rare, mais certaines administrations l’utilisent encore.

Inutile de vérifier avant : à l’ouverture du PDF, l’outil indique combien de champs il a trouvés, ou vous prévient s’il n’y en a aucun ou s’il s’agit d’un formulaire XFA.

## Comment remplir un formulaire PDF, étape par étape

1. Ouvrez [Remplir un formulaire PDF](tool:fill-pdf-form) et choisissez le PDF, ou faites-le glisser dans la zone prévue.
2. Attendez le message « Nous avons trouvé… champs ». Les champs sont classés par page (**Page 1**, **Page 2**…), avec la page du PDF affichée à côté.
3. Remplissez chaque champ. Quand vous en sélectionnez un, sa case est mise en évidence dans l’aperçu ; vous pouvez aussi toucher une case de l’aperçu pour aller directement au champ correspondant.
4. Si vous voulez que les réponses soient figées sur la page, cochez **Aplatir le formulaire**. Sinon, laissez la case décochée.
5. Appuyez sur **Enregistrer le PDF**, puis sur **Télécharger**.

![Une fiche d’inscription avec le nom, la date de naissance, l’e-mail, le créneau et le niveau remplis, à côté de l’aperçu de la page](shot:rellenar-formulario-campos "Chaque champ du PDF apparaît comme un champ de formulaire classique ; l’aperçu met en évidence celui que vous remplissez.")

Tout se passe dans votre navigateur : ni le PDF ni vos réponses ne sont envoyés sur un serveur. Le fichier téléchargé garde son nom d’origine, suivi de « -filled », ou de « -flattened » si vous l’avez aplati.

## Quels types de champs vous pouvez remplir

L’outil reconnaît les champs standard d’un formulaire PDF et affiche chacun avec la commande qui lui correspond :

- **Les zones de texte**, sur une ou plusieurs lignes (pour des commentaires ou une adresse). Si l’auteur du formulaire a limité le nombre de caractères, « … caractères maximum » s’affiche dessous et vous ne pouvez pas en taper davantage.
- **Les cases à cocher**, comme « J’accepte les conditions ».
- **Les boutons radio**, quand il faut choisir une seule réponse (créneau, situation familiale, oui ou non). Si vous en avez coché un par erreur, **Effacer le choix** le remet à blanc.
- **Les listes déroulantes** et **les listes de choix**. « — Aucun — » laisse la liste vide ; dans les listes qui acceptent plusieurs choix, chaque option a sa propre case.

Les champs **en lecture seule** sont affichés mais ne peuvent pas être modifiés : ils gardent la valeur prévue par l’auteur du formulaire.

Le nom de chaque champ est le texte d’aide rédigé par l’auteur du formulaire. S’il n’en a pas écrit, l’outil utilise le nom interne du champ, parfois peu parlant, comme « Text1 » ou « champ 7 ». Dans ce cas, fiez-vous à l’aperçu : quand vous sélectionnez le champ, vous voyez où il se trouve sur la page.

## L’aplatir ou le laisser modifiable

À l’enregistrement, vous avez deux possibilités :

- **Sans aplatissement** : le PDF reste un formulaire. Vous pouvez le rouvrir (dans cet outil ou dans n’importe quel lecteur) pour corriger une réponse, ou l’envoyer à quelqu’un d’autre pour qu’il remplisse sa partie.
- **Aplati** : ce que vous avez saisi fait désormais partie du dessin de la page. Le PDF s’affiche de la même façon dans tous les lecteurs et à l’impression, et personne ne peut plus modifier les réponses d’un simple clic.

Aplatissez le formulaire quand il est terminé et prêt à être envoyé. Avant cela, enregistrez aussi une copie non aplatie : si vous repérez une erreur plus tard, vous la corrigerez dans cette copie au lieu de tout recommencer.

Un détail : les réponses sont dessinées avec la police standard du formulaire, qui ne connaît que l’alphabet latin. Les accents, le ç et le œ ne posent aucun problème, mais si un champ contient des caractères chinois ou des emoji, le PDF est enregistré avec les réponses sans être aplati, et l’outil vous indique quels champs sont concernés. Chrome, Firefox, Acrobat et Aperçu les affichent quand même.

## Remplir un formulaire PDF sur son téléphone

L’outil fonctionne dans le navigateur du téléphone, sans application à installer :

- **Choisir le fichier** : en touchant la zone, vous pouvez ouvrir le PDF depuis Téléchargements, Fichiers ou Google Drive. Si vous l’avez reçu par WhatsApp ou par e-mail, téléchargez-le d’abord.
- **Remplir** : sur un écran étroit, la liste des champs vient en premier et l’aperçu de la page se trouve en dessous. Tapez vos réponses dans les champs de la liste, c’est bien plus pratique que de viser les cases sur la page.
- **Enregistrer** : quand vous touchez **Télécharger**, le PDF arrive dans le dossier des téléchargements du téléphone, prêt à être joint ou partagé.

## Si l’outil indique que le PDF n’a pas de champs

![Message indiquant que le PDF n’a pas de champs de formulaire, avec le lien pour ouvrir Modifier un PDF](shot:rellenar-formulario-sin-campos "Si le PDF n’a pas de champs, l’outil vous le dit et vous oriente vers Modifier un PDF.")

C’est ce qui arrive avec les formulaires scannés ou faits uniquement de lignes. Dans ce cas, utilisez [Modifier un PDF](tool:edit-pdf) : touchez l’endroit de la page où vous voulez écrire et ajoutez le texte par-dessus, sur une ou plusieurs pages. Notre guide pour [modifier un PDF gratuitement sans rien installer](guide:edit-pdf) détaille la marche à suivre.

Si le formulaire est une feuille de papier que vous avez sous la main, transformez-la d’abord en PDF avec [Scanner un document](tool:scan-document), puis ajoutez vos réponses avec Modifier un PDF.

## Formulaires XFA, protégés par mot de passe ou avec un champ de signature

- **XFA** : si le PDF est uniquement XFA, l’outil vous le signale et propose **Ouvrir Modifier un PDF** pour écrire sur la page. Si le PDF contient aussi la version standard des champs, il remplit celle-ci et retire la partie XFA, pour que personne ne voie d’anciennes données dans Acrobat.
- **Un mot de passe à l’ouverture** : l’outil ne peut pas lire le PDF tant que le mot de passe n’est pas retiré. Faites-le avec [Retirer le mot de passe d’un PDF](tool:unlock-pdf), qui vous demande le mot de passe, puis ouvrez le PDF déverrouillé. Les PDF qui n’ont que des restrictions d’autorisations, sans mot de passe à l’ouverture (très courants dans les formulaires officiels), s’ouvrent sans que vous ayez rien à faire.
- **Un champ de signature numérique** : l’outil le détecte mais ne le remplit pas, car une signature numérique nécessite un certificat. Si l’on vous demande votre signature manuscrite, utilisez [Signer un PDF](tool:sign-pdf) une fois les réponses saisies.

## Le signer et l’envoyer

L’ordre conseillé est : remplir, aplatir, puis signer. Ainsi, les réponses et la signature sont figées sur la page. Pour signer sans imprimer, suivez le guide [Comment signer un PDF sans l’imprimer](guide:sign-pdf).

Avant de l’envoyer, ouvrez le PDF téléchargé et vérifiez que chaque réponse est à sa place. S’il est trop lourd pour un e-mail, [Compresser un PDF](tool:compress-pdf) le réduit ; le guide [Comment réduire la taille d’un PDF](guide:reduce-pdf-size) explique quel niveau choisir.

## En résumé

- [Remplir un formulaire PDF](tool:fill-pdf-form) remplit les zones de texte, cases à cocher, boutons radio et listes d’un PDF dans votre navigateur, sans l’envoyer en ligne.
- L’aperçu montre où se trouve chaque champ sur la page.
- Aplatissez le formulaire une fois terminé et gardez aussi une copie modifiable.
- Si le PDF n’a pas de champs ou est un formulaire XFA, écrivez sur la page avec Modifier un PDF.
- S’il a un mot de passe, retirez-le d’abord ; pour le signer, utilisez Signer un PDF après l’avoir rempli.
`;

export default body;
