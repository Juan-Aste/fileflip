// Conversion pages for old video and audio formats ("avi-a-mp4", "wma-to-mp3"…),
// read by the FFmpeg WASM fallback (src/lib/legacy-media, docs/formatos-viejos.md).
// Each page has its own text about the format (where it comes from, what to expect)
// plus the facts shared by all of them (download of the engine, limits, privacy).
// They are long-tail pages: the router, sitemap, hreflang and FAQ data come from there.
import type { Locale } from "@/i18n/routing";
import type { LongtailPage } from "./longtail";

type Kind = "video" | "audio";
interface Pair {
  from: string;
  label: string;
  to: "mp4" | "mp3";
  kind: Kind;
  /** Per language: what the format is and where people find it; one question of its own. */
  text: Record<Locale, { about: string; q: string; a: string }>;
}

const pairs: Pair[] = [
  {
    from: "avi",
    label: "AVI",
    to: "mp4",
    kind: "video",
    text: {
      es: {
        about: "AVI es el formato de video de Windows de los años 90 y 2000: lo usaban las cámaras digitales compactas, las capturadoras de VHS y muchas películas descargadas con DivX o Xvid. Hoy los celulares, los televisores inteligentes y las redes sociales no siempre lo abren.",
        q: "Mi AVI tiene DivX o Xvid, ¿funciona?",
        a: "Sí. DivX y Xvid son variantes de MPEG-4 Part 2, y también se leen AVI con MJPEG (cámaras de fotos), MP3, AC3 o PCM. El resultado es un MP4 que se ve en cualquier dispositivo.",
      },
      en: {
        about: "AVI is the Windows video format of the 1990s and 2000s: compact digital cameras, VHS capture cards and many DivX or Xvid movie downloads used it. Today's phones, smart TVs and social networks don't always open it.",
        q: "My AVI uses DivX or Xvid. Will it work?",
        a: "Yes. DivX and Xvid are flavors of MPEG-4 Part 2, and AVI files with MJPEG (photo cameras), MP3, AC3 or PCM sound are read too. The result is an MP4 that plays on any device.",
      },
      pt: {
        about: "AVI é o formato de vídeo do Windows dos anos 90 e 2000: usado por câmeras digitais compactas, placas de captura de VHS e muitos filmes baixados em DivX ou Xvid. Hoje celulares, smart TVs e redes sociais nem sempre o abrem.",
        q: "Meu AVI é DivX ou Xvid. Funciona?",
        a: "Sim. DivX e Xvid são variantes do MPEG-4 Part 2, e também são lidos AVI com MJPEG (câmeras fotográficas), MP3, AC3 ou PCM. O resultado é um MP4 que abre em qualquer aparelho.",
      },
      fr: {
        about: "L'AVI est le format vidéo de Windows des années 90 et 2000 : celui des appareils photo compacts, des cartes d'acquisition VHS et de nombreux films DivX ou Xvid. Les téléphones, téléviseurs connectés et réseaux sociaux actuels ne l'ouvrent pas toujours.",
        q: "Mon AVI est en DivX ou Xvid, ça marche ?",
        a: "Oui. DivX et Xvid sont des variantes du MPEG-4 Part 2, et les AVI en MJPEG (appareils photo) ou avec un son MP3, AC3 ou PCM sont lus aussi. Le résultat est un MP4 lisible partout.",
      },
      zh: {
        about: "AVI 是 1990 和 2000 年代的 Windows 视频格式：小型数码相机、VHS 采集卡以及许多 DivX 或 Xvid 电影都使用它。如今的手机、智能电视和社交网络不一定能打开。",
        q: "我的 AVI 是 DivX 或 Xvid 编码，可以吗？",
        a: "可以。DivX 和 Xvid 属于 MPEG-4 Part 2，也支持 MJPEG（相机拍摄）以及 MP3、AC3 或 PCM 声音的 AVI。结果是在任何设备上都能播放的 MP4。",
      },
    },
  },
  {
    from: "wmv",
    label: "WMV",
    to: "mp4",
    kind: "video",
    text: {
      es: {
        about: "WMV (Windows Media Video) es el formato de Windows Movie Maker y del Reproductor de Windows Media. Abunda en videos de presentaciones, cursos y grabaciones de hace años, pero el iPhone, Android y la mayoría de los televisores no lo reproducen.",
        q: "¿Lee los WMV de Windows Movie Maker?",
        a: "Sí: se leen WMV 7, 8 y 9 (también VC-1) con sonido WMA, dentro de archivos .wmv o .asf. Los WMV protegidos con DRM no se pueden convertir.",
      },
      en: {
        about: "WMV (Windows Media Video) is the format of Windows Movie Maker and Windows Media Player. It's common in old presentations, courses and recordings, but iPhone, Android and most TVs won't play it.",
        q: "Does it read Windows Movie Maker WMV files?",
        a: "Yes: WMV 7, 8 and 9 (also VC-1) with WMA sound are read, in .wmv or .asf files. DRM-protected WMV files can't be converted.",
      },
      pt: {
        about: "WMV (Windows Media Video) é o formato do Windows Movie Maker e do Windows Media Player. É comum em apresentações, cursos e gravações antigas, mas iPhone, Android e a maioria das TVs não o reproduzem.",
        q: "Lê os WMV do Windows Movie Maker?",
        a: "Sim: são lidos WMV 7, 8 e 9 (também VC-1) com som WMA, em arquivos .wmv ou .asf. WMV protegidos com DRM não podem ser convertidos.",
      },
      fr: {
        about: "Le WMV (Windows Media Video) est le format de Windows Movie Maker et du Lecteur Windows Media. On le trouve dans d'anciennes présentations, formations et enregistrements, mais l'iPhone, Android et la plupart des téléviseurs ne le lisent pas.",
        q: "Lit-il les WMV de Windows Movie Maker ?",
        a: "Oui : les WMV 7, 8 et 9 (et le VC-1) avec son WMA sont lus, en fichiers .wmv ou .asf. Les WMV protégés par DRM ne peuvent pas être convertis.",
      },
      zh: {
        about: "WMV（Windows Media Video）是 Windows Movie Maker 和 Windows Media Player 使用的格式。很多旧的演示、课程和录像都是 WMV，但 iPhone、Android 和大多数电视无法播放。",
        q: "能读取 Windows Movie Maker 的 WMV 吗？",
        a: "可以：支持 .wmv 或 .asf 文件中的 WMV 7、8、9（以及 VC-1）视频和 WMA 声音。受 DRM 保护的 WMV 无法转换。",
      },
    },
  },
  {
    from: "flv",
    label: "FLV",
    to: "mp4",
    kind: "video",
    text: {
      es: {
        about: "FLV (Flash Video) era el formato de YouTube y de los reproductores Flash hasta 2010 aproximadamente. Flash ya no existe, así que esos videos guardados no se abren en el navegador ni en el celular.",
        q: "¿Qué FLV se pueden leer?",
        a: "Los de Sorenson Spark (los más viejos), VP6 y H.264, con sonido MP3, AAC o Nellymoser. Si el FLV ya tiene H.264, el MP4 resultante conserva la calidad.",
      },
      en: {
        about: "FLV (Flash Video) was the format of YouTube and Flash players until about 2010. Flash is gone, so those saved videos no longer open in the browser or on a phone.",
        q: "Which FLV files can be read?",
        a: "Sorenson Spark (the oldest), VP6 and H.264 ones, with MP3, AAC or Nellymoser sound. If the FLV already holds H.264, the MP4 keeps its quality.",
      },
      pt: {
        about: "FLV (Flash Video) era o formato do YouTube e dos players Flash até por volta de 2010. O Flash acabou, então esses vídeos guardados não abrem mais no navegador nem no celular.",
        q: "Quais FLV podem ser lidos?",
        a: "Os de Sorenson Spark (os mais antigos), VP6 e H.264, com som MP3, AAC ou Nellymoser. Se o FLV já for H.264, o MP4 mantém a qualidade.",
      },
      fr: {
        about: "Le FLV (Flash Video) était le format de YouTube et des lecteurs Flash jusque vers 2010. Flash n'existe plus : ces vidéos enregistrées ne s'ouvrent plus dans le navigateur ni sur le téléphone.",
        q: "Quels FLV peuvent être lus ?",
        a: "Ceux en Sorenson Spark (les plus anciens), VP6 et H.264, avec un son MP3, AAC ou Nellymoser. Si le FLV contient déjà du H.264, le MP4 garde sa qualité.",
      },
      zh: {
        about: "FLV（Flash Video）是大约 2010 年以前 YouTube 和 Flash 播放器使用的格式。Flash 已经停用，保存下来的这些视频无法再在浏览器或手机上打开。",
        q: "支持哪些 FLV？",
        a: "支持 Sorenson Spark（最早的）、VP6 和 H.264 视频，以及 MP3、AAC 或 Nellymoser 声音。如果 FLV 本身是 H.264，转换后的 MP4 会保持画质。",
      },
    },
  },
  {
    from: "mpg",
    label: "MPG",
    to: "mp4",
    kind: "video",
    text: {
      es: {
        about: "MPG (MPEG-1 y MPEG-2) es el formato de los Video CD, de las cámaras de video con disco o tarjeta de los 2000 y de muchas grabaciones de televisión. Los archivos son grandes para lo que muestran: en MP4 ocupan bastante menos.",
        q: "¿Sirve para videos de DVD (VOB)?",
        a: "Sí: los VOB de un DVD sin protección son MPEG-2 con sonido AC3 o MP2 y se convierten igual. Cada VOB se convierte por separado (como máximo 20 minutos cada uno).",
      },
      en: {
        about: "MPG (MPEG-1 and MPEG-2) is the format of Video CDs, 2000s camcorders that recorded to disc or card, and many TV recordings. The files are big for what they show: as MP4 they take much less space.",
        q: "Does it work with DVD videos (VOB)?",
        a: "Yes: the VOB files of an unprotected DVD are MPEG-2 with AC3 or MP2 sound and convert the same way. Each VOB is converted on its own (up to 20 minutes each).",
      },
      pt: {
        about: "MPG (MPEG-1 e MPEG-2) é o formato dos Video CDs, das filmadoras de disco ou cartão dos anos 2000 e de muitas gravações de TV. Os arquivos são grandes para o que mostram: em MP4 ocupam bem menos.",
        q: "Funciona com vídeos de DVD (VOB)?",
        a: "Sim: os VOB de um DVD sem proteção são MPEG-2 com som AC3 ou MP2 e são convertidos do mesmo jeito. Cada VOB é convertido separadamente (no máximo 20 minutos cada).",
      },
      fr: {
        about: "Le MPG (MPEG-1 et MPEG-2) est le format des Vidéo CD, des caméscopes à disque ou à carte des années 2000 et de nombreux enregistrements télé. Les fichiers sont lourds pour ce qu'ils montrent : en MP4, ils prennent beaucoup moins de place.",
        q: "Ça marche avec les vidéos de DVD (VOB) ?",
        a: "Oui : les VOB d'un DVD non protégé sont du MPEG-2 avec un son AC3 ou MP2 et se convertissent de la même façon. Chaque VOB est converti séparément (20 minutes au maximum chacun).",
      },
      zh: {
        about: "MPG（MPEG-1 和 MPEG-2）是 VCD、2000 年代光盘或存储卡摄像机以及许多电视录像使用的格式。文件相对画面来说很大：转成 MP4 后占用空间小得多。",
        q: "DVD 视频（VOB）可以吗？",
        a: "可以：未加密 DVD 的 VOB 文件是带 AC3 或 MP2 声音的 MPEG-2，转换方式相同。每个 VOB 单独转换（每个最长 20 分钟）。",
      },
    },
  },
  {
    from: "wma",
    label: "WMA",
    to: "mp3",
    kind: "audio",
    text: {
      es: {
        about: "WMA (Windows Media Audio) es el formato en que el Reproductor de Windows Media copiaba los CD y en que se vendía música en línea a principios de los 2000. Muchos celulares, autos y reproductores no lo aceptan; el MP3 se escucha en todos.",
        q: "¿Funciona con WMA Pro o Lossless?",
        a: "Sí: se leen WMA 1 y 2, WMA Pro, WMA Lossless y WMA Voice. Los WMA comprados con DRM no se pueden convertir.",
      },
      en: {
        about: "WMA (Windows Media Audio) is the format Windows Media Player used to rip CDs, and how a lot of music was sold online in the early 2000s. Many phones, cars and players don't accept it; MP3 plays everywhere.",
        q: "Does it work with WMA Pro or Lossless?",
        a: "Yes: WMA 1 and 2, WMA Pro, WMA Lossless and WMA Voice are read. WMA files bought with DRM can't be converted.",
      },
      pt: {
        about: "WMA (Windows Media Audio) é o formato em que o Windows Media Player copiava CDs e em que se vendia música on-line no começo dos anos 2000. Muitos celulares, carros e players não o aceitam; o MP3 toca em todos.",
        q: "Funciona com WMA Pro ou Lossless?",
        a: "Sim: são lidos WMA 1 e 2, WMA Pro, WMA Lossless e WMA Voice. WMA comprados com DRM não podem ser convertidos.",
      },
      fr: {
        about: "Le WMA (Windows Media Audio) est le format dans lequel le Lecteur Windows Media copiait les CD, et celui de nombreuses ventes de musique en ligne au début des années 2000. Beaucoup de téléphones, voitures et baladeurs ne l'acceptent pas ; le MP3 se lit partout.",
        q: "Ça marche avec le WMA Pro ou Lossless ?",
        a: "Oui : les WMA 1 et 2, WMA Pro, WMA Lossless et WMA Voice sont lus. Les WMA achetés avec DRM ne peuvent pas être convertis.",
      },
      zh: {
        about: "WMA（Windows Media Audio）是 Windows Media Player 抓取 CD 时使用的格式，也是 2000 年代初许多在线音乐销售的格式。很多手机、汽车和播放器不支持；MP3 则到处都能播放。",
        q: "支持 WMA Pro 或无损 WMA 吗？",
        a: "支持：可读取 WMA 1 和 2、WMA Pro、WMA Lossless 和 WMA Voice。带 DRM 的购买音乐无法转换。",
      },
    },
  },
  {
    from: "amr",
    label: "AMR",
    to: "mp3",
    kind: "audio",
    text: {
      es: {
        about: "AMR es el formato de las grabaciones de voz de los celulares (notas de voz, grabadora y llamadas grabadas), sobre todo de Android y de teléfonos antiguos. Está pensado para la voz y ocupa muy poco, pero muchos programas y computadoras no lo abren.",
        q: "¿Por qué el MP3 suena como una llamada telefónica?",
        a: "Porque AMR guarda solo las frecuencias de la voz (AMR-NB a 8 kHz; AMR-WB a 16 kHz). La conversión no puede recuperar lo que la grabación original no guardó, pero tampoco empeora el sonido.",
      },
      en: {
        about: "AMR is the format of phone voice recordings (voice notes, the recorder app and recorded calls), especially on Android and older phones. It's made for speech and takes very little space, but many programs and computers won't open it.",
        q: "Why does the MP3 sound like a phone call?",
        a: "Because AMR only keeps the frequencies of speech (AMR-NB at 8 kHz; AMR-WB at 16 kHz). Converting can't bring back what the original recording didn't keep, but it doesn't make it worse either.",
      },
      pt: {
        about: "AMR é o formato das gravações de voz dos celulares (mensagens de voz, gravador e chamadas gravadas), principalmente no Android e em telefones antigos. É feito para voz e ocupa muito pouco, mas muitos programas e computadores não o abrem.",
        q: "Por que o MP3 soa como uma ligação telefônica?",
        a: "Porque o AMR guarda só as frequências da voz (AMR-NB a 8 kHz; AMR-WB a 16 kHz). A conversão não recupera o que a gravação original não guardou, mas também não piora o som.",
      },
      fr: {
        about: "L'AMR est le format des enregistrements vocaux des téléphones (messages vocaux, dictaphone et appels enregistrés), surtout sur Android et les anciens téléphones. Conçu pour la voix, il prend très peu de place, mais beaucoup de logiciels et d'ordinateurs ne l'ouvrent pas.",
        q: "Pourquoi le MP3 sonne-t-il comme un appel téléphonique ?",
        a: "Parce que l'AMR ne garde que les fréquences de la voix (AMR-NB à 8 kHz ; AMR-WB à 16 kHz). La conversion ne peut pas rendre ce que l'enregistrement d'origine n'a pas gardé, mais elle ne dégrade pas non plus le son.",
      },
      zh: {
        about: "AMR 是手机录音（语音消息、录音机和通话录音）使用的格式，尤其常见于 Android 和旧手机。它专为人声设计、体积很小，但很多软件和电脑无法打开。",
        q: "为什么 MP3 听起来像电话声音？",
        a: "因为 AMR 只保存人声的频率（AMR-NB 为 8 kHz，AMR-WB 为 16 kHz）。转换无法找回原录音没有保存的内容，但也不会让声音变差。",
      },
    },
  },
];

const connector: Record<Locale, string> = { es: "a", en: "to", pt: "para", fr: "en", zh: "to" };

/** The text shared by every page, per language. `F` is the source format, `T` the target. */
const common: Record<Locale, {
  title: (f: string, t: string) => string;
  metaTitle: (f: string, t: string, kind: Kind) => string;
  metaDescription: (f: string, t: string, kind: Kind) => string;
  how: (f: string, t: string, kind: Kind) => { heading: string; body: string[] };
  engine: (kind: Kind) => { heading: string; body: string[] };
  faq: (f: string, t: string, kind: Kind) => { q: string; a: string }[];
}> = {
  es: {
    title: (f, t) => `Convertir ${f} a ${t}`,
    metaTitle: (f, t, k) => `${f} a ${t}: convierte ${k === "video" ? "videos" : "audio"} ${f} gratis y sin subirlos`,
    metaDescription: (f, t, k) => `Pasa ${k === "video" ? "tus videos" : "tus archivos"} ${f} a ${t} en el navegador, sin instalar nada y sin subirlos a internet. ${t === "MP4" ? "El MP4 se ve en cualquier celular y TV." : "El MP3 suena en cualquier lado."}`,
    how: (f, t, k) => ({
      heading: `Cómo pasar ${f} a ${t}`,
      body: [
        `Arrastra ${k === "video" ? "el video" : "el archivo"} ${f} (o varios) al recuadro, deja ${t} elegido y haz clic en Convertir. Cuando termine, descarga el resultado o, si son varios, todos juntos en un ZIP.`,
        k === "video"
          ? "El MP4 se crea en H.264 cuando tu navegador lo permite (Chrome, Edge, Safari) para que se vea en cualquier lado; también puedes elegir WebM, MOV o MKV."
          : "El MP3 se crea a 192 kbps por defecto; también puedes elegir WAV, FLAC, OGG, M4A o AIFF.",
      ],
    }),
    engine: (k) => ({
      heading: "Por qué la primera vez tarda un poco más",
      body: [
        "Los navegadores no leen estos formatos antiguos. La primera vez se descarga un motor FFmpeg (unos 31 MB, desde nuestro propio dominio) que pasa el archivo a un formato intermedio; después sigue la conversión normal. Las siguientes conversiones lo reutilizan.",
        k === "video" ? "Con estos formatos el máximo es de 20 minutos de video por archivo, y la conversión es más lenta que con un MP4." : "Con estos formatos el máximo es de 1 hora de audio por archivo.",
      ],
    }),
    faq: (f, t, k) => [
      { q: `¿Mis ${k === "video" ? "videos" : "archivos"} se suben a internet?`, a: "No. Todo pasa en tu dispositivo, dentro del navegador: el archivo nunca sale de tu computadora o celular." },
      { q: "¿Hay algún límite?", a: k === "video" ? "Hasta 200 MB por archivo y 20 minutos de duración con estos formatos antiguos (un MP4, MOV o MKV puede durar hasta 2 horas)." : "Hasta 200 MB por archivo y 1 hora de duración con estos formatos antiguos (un MP3, WAV o FLAC puede durar hasta 3 horas)." },
      { q: `¿Se pierde calidad al pasar de ${f} a ${t}?`, a: k === "video" ? "Muy poca: el video se vuelve a codificar en calidad alta. No mejora lo que ya tenía el original (por ejemplo, la baja resolución de un video viejo)." : "El MP3 a 192 kbps es prácticamente indistinguible para la mayoría. Si quieres conservar todo, elige WAV o FLAC (sin pérdida)." },
    ],
  },
  en: {
    title: (f, t) => `Convert ${f} to ${t}`,
    metaTitle: (f, t, k) => `${f} to ${t}: convert ${f} ${k === "video" ? "videos" : "audio"} free, without uploading`,
    metaDescription: (f, t, k) => `Turn your ${f} ${k === "video" ? "videos" : "files"} into ${t} in your browser, with nothing to install and nothing uploaded. ${t === "MP4" ? "MP4 plays on any phone and TV." : "MP3 plays everywhere."}`,
    how: (f, t, k) => ({
      heading: `How to convert ${f} to ${t}`,
      body: [
        `Drop the ${f} ${k === "video" ? "video" : "file"} (or several) on the box, keep ${t} selected and click Convert. When it's done, download the result or, for several files, all of them in a ZIP.`,
        k === "video"
          ? "The MP4 is made with H.264 when your browser allows it (Chrome, Edge, Safari), so it plays everywhere; you can also pick WebM, MOV or MKV."
          : "The MP3 is made at 192 kbps by default; you can also pick WAV, FLAC, OGG, M4A or AIFF.",
      ],
    }),
    engine: (k) => ({
      heading: "Why the first time takes a little longer",
      body: [
        "Browsers can't read these older formats. The first time, an FFmpeg engine is downloaded (about 31 MB, from our own domain); it turns the file into an intermediate format and then the normal conversion follows. Later conversions reuse it.",
        k === "video" ? "With these formats the maximum is 20 minutes of video per file, and converting is slower than with an MP4." : "With these formats the maximum is 1 hour of audio per file.",
      ],
    }),
    faq: (f, t, k) => [
      { q: `Are my ${k === "video" ? "videos" : "files"} uploaded?`, a: "No. Everything happens on your device, inside the browser: the file never leaves your computer or phone." },
      { q: "Are there any limits?", a: k === "video" ? "Up to 200 MB per file and 20 minutes long with these older formats (an MP4, MOV or MKV can be up to 2 hours)." : "Up to 200 MB per file and 1 hour long with these older formats (an MP3, WAV or FLAC can be up to 3 hours)." },
      { q: `Is quality lost going from ${f} to ${t}?`, a: k === "video" ? "Very little: the video is re-encoded at high quality. It can't improve what the original already lacked (such as the low resolution of an old video)." : "A 192 kbps MP3 is practically indistinguishable for most listeners. To keep everything, choose WAV or FLAC (lossless)." },
    ],
  },
  pt: {
    title: (f, t) => `Converter ${f} para ${t}`,
    metaTitle: (f, t, k) => `${f} para ${t}: converta ${k === "video" ? "vídeos" : "áudio"} ${f} grátis e sem enviar`,
    metaDescription: (f, t, k) => `Converta ${k === "video" ? "seus vídeos" : "seus arquivos"} ${f} para ${t} no navegador, sem instalar nada e sem enviar para a internet. ${t === "MP4" ? "O MP4 abre em qualquer celular e TV." : "O MP3 toca em qualquer lugar."}`,
    how: (f, t, k) => ({
      heading: `Como converter ${f} para ${t}`,
      body: [
        `Arraste ${k === "video" ? "o vídeo" : "o arquivo"} ${f} (ou vários) para a caixa, deixe ${t} selecionado e clique em Converter. Ao terminar, baixe o resultado ou, se forem vários, todos juntos em um ZIP.`,
        k === "video"
          ? "O MP4 é criado em H.264 quando o navegador permite (Chrome, Edge, Safari), para abrir em qualquer lugar; você também pode escolher WebM, MOV ou MKV."
          : "O MP3 é criado a 192 kbps por padrão; você também pode escolher WAV, FLAC, OGG, M4A ou AIFF.",
      ],
    }),
    engine: (k) => ({
      heading: "Por que na primeira vez demora um pouco mais",
      body: [
        "Os navegadores não leem esses formatos antigos. Na primeira vez é baixado um motor FFmpeg (cerca de 31 MB, do nosso próprio domínio) que passa o arquivo para um formato intermediário; depois segue a conversão normal. As próximas conversões o reutilizam.",
        k === "video" ? "Com esses formatos o máximo é de 20 minutos de vídeo por arquivo, e a conversão é mais lenta que com um MP4." : "Com esses formatos o máximo é de 1 hora de áudio por arquivo.",
      ],
    }),
    faq: (f, t, k) => [
      { q: `Meus ${k === "video" ? "vídeos" : "arquivos"} são enviados para a internet?`, a: "Não. Tudo acontece no seu aparelho, dentro do navegador: o arquivo nunca sai do seu computador ou celular." },
      { q: "Há algum limite?", a: k === "video" ? "Até 200 MB por arquivo e 20 minutos de duração com esses formatos antigos (um MP4, MOV ou MKV pode ter até 2 horas)." : "Até 200 MB por arquivo e 1 hora de duração com esses formatos antigos (um MP3, WAV ou FLAC pode ter até 3 horas)." },
      { q: `Perde qualidade ao converter ${f} para ${t}?`, a: k === "video" ? "Muito pouca: o vídeo é recodificado em alta qualidade. Não melhora o que o original já não tinha (como a baixa resolução de um vídeo antigo)." : "O MP3 a 192 kbps é praticamente indistinguível para a maioria. Para manter tudo, escolha WAV ou FLAC (sem perdas)." },
    ],
  },
  fr: {
    title: (f, t) => `Convertir ${f} en ${t}`,
    metaTitle: (f, t, k) => `${f} en ${t} : convertir ${k === "video" ? "des vidéos" : "de l'audio"} ${f} gratuitement, sans envoi`,
    metaDescription: (f, t, k) => `Transformez ${k === "video" ? "vos vidéos" : "vos fichiers"} ${f} en ${t} dans le navigateur, sans rien installer ni envoyer. ${t === "MP4" ? "Le MP4 se lit sur tout téléphone et téléviseur." : "Le MP3 se lit partout."}`,
    how: (f, t, k) => ({
      heading: `Comment convertir ${f} en ${t}`,
      body: [
        `Déposez ${k === "video" ? "la vidéo" : "le fichier"} ${f} (ou plusieurs) dans le cadre, laissez ${t} sélectionné et cliquez sur Convertir. À la fin, téléchargez le résultat ou, s'il y en a plusieurs, tout dans un ZIP.`,
        k === "video"
          ? "Le MP4 est créé en H.264 quand le navigateur le permet (Chrome, Edge, Safari), pour être lisible partout ; vous pouvez aussi choisir WebM, MOV ou MKV."
          : "Le MP3 est créé à 192 kbit/s par défaut ; vous pouvez aussi choisir WAV, FLAC, OGG, M4A ou AIFF.",
      ],
    }),
    engine: (k) => ({
      heading: "Pourquoi la première fois prend un peu plus de temps",
      body: [
        "Les navigateurs ne lisent pas ces formats anciens. La première fois, un moteur FFmpeg est téléchargé (environ 31 Mo, depuis notre propre domaine) ; il passe le fichier dans un format intermédiaire, puis la conversion normale suit. Les conversions suivantes le réutilisent.",
        k === "video" ? "Avec ces formats, le maximum est de 20 minutes de vidéo par fichier, et la conversion est plus lente qu'avec un MP4." : "Avec ces formats, le maximum est de 1 heure d'audio par fichier.",
      ],
    }),
    faq: (f, t, k) => [
      { q: `Mes ${k === "video" ? "vidéos" : "fichiers"} sont-ils envoyés sur internet ?`, a: "Non. Tout se passe sur votre appareil, dans le navigateur : le fichier ne quitte jamais votre ordinateur ou téléphone." },
      { q: "Y a-t-il des limites ?", a: k === "video" ? "Jusqu'à 200 Mo par fichier et 20 minutes de durée avec ces formats anciens (un MP4, MOV ou MKV peut durer jusqu'à 2 heures)." : "Jusqu'à 200 Mo par fichier et 1 heure de durée avec ces formats anciens (un MP3, WAV ou FLAC peut durer jusqu'à 3 heures)." },
      { q: `Perd-on de la qualité en passant de ${f} à ${t} ?`, a: k === "video" ? "Très peu : la vidéo est réencodée en haute qualité. Cela n'améliore pas ce qui manquait déjà à l'original (comme la faible résolution d'une vieille vidéo)." : "Un MP3 à 192 kbit/s est pratiquement indiscernable pour la plupart des gens. Pour tout garder, choisissez WAV ou FLAC (sans perte)." },
    ],
  },
  zh: {
    title: (f, t) => `${f} 转 ${t}`,
    metaTitle: (f, t, k) => `${f} 转 ${t}：免费转换 ${f} ${k === "video" ? "视频" : "音频"}，无需上传`,
    metaDescription: (f, t, k) => `在浏览器中把${k === "video" ? "视频" : "文件"}从 ${f} 转成 ${t}，无需安装，也不上传到网上。${t === "MP4" ? "MP4 可在任何手机和电视上播放。" : "MP3 到处都能播放。"}`,
    how: (f, t, k) => ({
      heading: `如何把 ${f} 转成 ${t}`,
      body: [
        `把 ${f} ${k === "video" ? "视频" : "文件"}（可多个）拖到框中，保持选择 ${t}，然后点击转换。完成后下载结果；多个文件可打包为 ZIP 一起下载。`,
        k === "video"
          ? "浏览器支持时（Chrome、Edge、Safari）MP4 使用 H.264 编码，到处都能播放；也可以选择 WebM、MOV 或 MKV。"
          : "MP3 默认为 192 kbps；也可以选择 WAV、FLAC、OGG、M4A 或 AIFF。",
      ],
    }),
    engine: (k) => ({
      heading: "为什么第一次会慢一点",
      body: [
        "浏览器无法读取这些旧格式。第一次会从我们自己的域名下载一个 FFmpeg 引擎（约 31 MB），先把文件转成中间格式，然后照常转换。之后的转换会重复使用它。",
        k === "video" ? "这些格式每个文件最长 20 分钟视频，转换速度比 MP4 慢。" : "这些格式每个文件最长 1 小时音频。",
      ],
    }),
    faq: (f, t, k) => [
      { q: `我的${k === "video" ? "视频" : "文件"}会上传到网上吗？`, a: "不会。全部在你的设备上、浏览器内完成：文件不会离开你的电脑或手机。" },
      { q: "有什么限制？", a: k === "video" ? "这些旧格式每个文件最大 200 MB、最长 20 分钟（MP4、MOV 或 MKV 最长可达 2 小时）。" : "这些旧格式每个文件最大 200 MB、最长 1 小时（MP3、WAV 或 FLAC 最长可达 3 小时）。" },
      { q: `从 ${f} 转成 ${t} 会损失画质或音质吗？`, a: k === "video" ? "很少：视频会以高画质重新编码。但无法改善原视频本来缺少的东西（例如旧视频的低分辨率）。" : "192 kbps 的 MP3 对大多数人来说几乎听不出差别。想完整保留，请选择 WAV 或 FLAC（无损）。" },
    ],
  },
};

const locales: Locale[] = ["es", "en", "pt", "fr", "zh"];
const id = (p: Pair, l: Locale) => `${p.from}-${p.to}-${l}`;

/** One page per pair and language, linked to each other as translations. */
export const legacyConversionPages: LongtailPage[] = pairs.flatMap((p) =>
  locales.map((l): LongtailPage => {
    const c = common[l];
    const t = p.text[l];
    const to = p.to.toUpperCase();
    return {
      id: id(p, l),
      locale: l,
      slug: `${p.from}-${connector[l]}-${p.to}`,
      title: c.title(p.label, to),
      metaTitle: c.metaTitle(p.label, to, p.kind),
      metaDescription: c.metaDescription(p.label, to, p.kind),
      intro: [t.about],
      widget: { kind: "tool", tool: p.kind === "video" ? "video-converter" : "audio-converter" },
      sections: [c.how(p.label, to, p.kind), c.engine(p.kind)],
      faq: [{ q: t.q, a: t.a }, ...c.faq(p.label, to, p.kind)],
      translations: Object.fromEntries(locales.filter((o) => o !== l).map((o) => [o, id(p, o)])),
    };
  }),
);
