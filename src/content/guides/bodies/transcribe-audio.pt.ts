const body = `
Transformar um áudio longo do WhatsApp, uma aula gravada ou uma entrevista em texto significava ouvir e digitar, ou pagar um serviço para o qual era preciso enviar o áudio. Hoje um modelo de reconhecimento de voz consegue fazer isso no seu próprio computador ou celular, de graça e sem que o áudio saia do seu aparelho. Este guia explica como usar a nossa ferramenta [Transcrever áudio para texto](tool:audio-to-text), o que esperar do resultado e como tirar o arquivo de áudio do WhatsApp ou do iPhone.

## Como funciona: o Whisper no seu navegador

A ferramenta usa o **Whisper**, o modelo de reconhecimento de voz que a OpenAI publicou com licença aberta. Em vez de mandar o seu áudio para um servidor, o modelo é baixado uma vez para o seu navegador, e a transcrição roda no processador do seu aparelho.

Isso tem duas consequências práticas:

- **Privacidade**: o áudio não é enviado para lugar nenhum. A única coisa baixada é o modelo, do Hugging Face, na primeira vez que você usa; depois ele fica guardado no navegador.
- **Velocidade variável**: depende do seu aparelho. Um computador atual transcreve mais rápido do que a duração do áudio; um celular, mais devagar.

## Passo a passo

1. Abra o [Transcrever áudio para texto](tool:audio-to-text) e escolha o arquivo de áudio ou vídeo. Você verá a duração dele.
2. Escolha o **Modelo**: **Rápido** ou **Preciso (mais lento)**. Ao lado de cada um aparece o tamanho do download, ou “já baixado” se você já o usou.
3. Escolha o **Idioma do áudio**, ou deixe em **Detectar automaticamente**.
4. Clique em **Transcrever**. Você acompanha o progresso e o tempo que falta, e pode cancelar a qualquer momento.
5. Revise o texto, corrija o que for preciso e copie ou baixe em **TXT**, **SRT** ou **VTT**.

![Uma gravação transcrita, com o texto editável e os botões de download](shot:transcribir-resultado "Uma gravação de 7 segundos transcrita com o modelo rápido: cada linha é uma frase com o seu tempo.")

São aceitos áudios (MP3, WAV, M4A, OGG, OPUS, FLAC e outros) e vídeos (MP4, MOV, MKV, WEBM; a trilha sonora é transcrita), de até 30 minutos por arquivo.

## Rápido ou preciso: qual escolher

| | Rápido | Preciso |
| --- | --- | --- |
| Modelo | Whisper tiny | Whisper base |
| Download (uma vez) | cerca de 43 MB | cerca de 79 MB |
| Num computador de mesa | cerca de 3,8 minutos de áudio por minuto | cerca de 2,3 minutos de áudio por minuto |
| Num celular intermediário (estimativa) | quase 1 minuto de áudio por minuto | meio minuto de áudio por minuto |

Medimos essas velocidades com 3 minutos de fala em espanhol na nossa máquina de testes; na sua, podem ser diferentes. Uma gravação de 10 minutos leva, portanto, uns 3 minutos num computador com o modelo rápido, e perto de 10 num celular.

Comece pelo **rápido**, principalmente no celular. Se o resultado tiver muitos erros, por causa de ruído de fundo, sotaque forte ou palavras técnicas, transcreva de novo com o **preciso**.

## Qual é a qualidade do resultado

Os nossos testes foram feitos com gravações em inglês e em espanhol, mas o modelo também reconhece fala em português: basta escolher o idioma ou deixar que ele o detecte.
Com uma voz clara, uma única pessoa falando e pouco ruído, o texto sai quase pronto. A gravação curta em inglês da captura acima saiu palavra por palavra. Com áudios mais longos ou difíceis, a história é outra: numa gravação de 36 segundos em espanhol, nos nossos testes, o modelo rápido acertou quase todas as palavras, mas tropeçou nos trechos mais difíceis. Ele escreveu o nome da marca “Fileflect” como “File Efect” e trocou algumas palavras em frases de som parecido. Esses são os erros típicos: nomes próprios, marcas, palavras pouco comuns e frases que soam parecidas. Nos nossos testes, o modelo preciso transcreveu esse mesmo áudio com menos erros.

Outros limites que vale conhecer:

- **Não separa quem fala.** Numa entrevista ou reunião, o texto sai corrido, sem indicar quem disse o quê.
- **Números e siglas** podem ser escritos de formas diferentes.
- **Música alta, ruído ou várias pessoas falando ao mesmo tempo** pioram muito o resultado.
- **Silêncios longos**: o modelo pode pulá-los ou, raramente, repetir uma frase. Revise o texto antes de usá-lo para algo importante.

Se o idioma detectado estiver errado (acontece com gravações muito curtas ou com mistura de idiomas), escolha o idioma você mesmo e transcreva de novo.

## Como tirar o áudio do WhatsApp ou do iPhone

**Áudios do WhatsApp**: mantenha o dedo pressionado sobre o áudio e use a opção de compartilhar ou encaminhar para salvá-lo em Arquivos ou mandá-lo para o seu próprio e-mail. Os menus mudam um pouco entre iPhone e Android, mas o resultado é um arquivo .opus ou .ogg, que a ferramenta aceita direto.

**Gravador do iPhone**: no app Gravador, toque na gravação, depois nos três pontinhos e em **Compartilhar**, e escolha **Salvar em Arquivos**. Você fica com um arquivo .m4a.

**Gravações de reuniões ou vídeos**: se você tem o vídeo, não precisa extrair o som; a ferramenta faz isso. Se você só quer o áudio para guardar ou enviar, o [Extrair áudio de vídeo](tool:extract-audio) separa a trilha.

Se o seu navegador não conseguir ler o arquivo (acontece com alguns M4A em certos navegadores), tente o Chrome, o Edge ou o Safari, ou converta antes com o [Converter áudio](tool:audio-converter).

## Gravações com mais de 30 minutos

O limite existe para que a transcrição não demore demais nem esgote a memória do navegador. Para uma gravação mais longa, corte-a em partes com o [Cortar áudio](tool:trim-audio) e transcreva cada uma. Uma dica: corte numa pausa, não no meio de uma frase, para o modelo não perder palavras no corte.

## Usando a transcrição como legenda

O arquivo **SRT** ou **VTT** traz cada frase com o tempo de início e de fim, em linhas curtas, pronto para carregar num player de vídeo, no YouTube ou num editor. Se você corrigir palavras no texto sem juntar nem separar linhas, as legendas usam a sua correção.

Se as legendas aparecerem adiantadas ou atrasadas em relação ao vídeo, o [Sincronizar legendas](tool:subtitle-sync) desloca todas de uma vez. E, se você precisar de outro formato, o [Converter legendas](tool:subtitle-converter) transforma SRT em VTT, ASS e outros.

## O caminho inverso: de texto para voz

Se você precisa do contrário, que o computador leia um texto ou documento para você, o [Ler texto em voz alta](tool:text-to-speech) faz isso com as vozes do seu sistema ou com uma voz IA, também no navegador. O guia [Como fazer o computador ler um texto ou PDF em voz alta](guide:read-aloud) explica em detalhes.

## Resumo

- O [Transcrever áudio para texto](tool:audio-to-text) roda o Whisper dentro do seu navegador: de graça e sem enviar o áudio.
- Comece pelo modelo rápido; se houver muitos erros, use o preciso.
- Sempre revise nomes próprios, números e frases de som parecido.
- Aceita áudios do WhatsApp (.opus, .ogg), gravações do iPhone (.m4a) e vídeos, de até 30 minutos.
- Baixe TXT para o texto, SRT ou VTT para legendas.
`;

export default body;
