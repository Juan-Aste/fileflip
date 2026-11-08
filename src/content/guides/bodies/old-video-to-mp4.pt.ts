const body = `
Em algum HD antigo ou pen drive você guarda vídeos de quinze ou vinte anos atrás: o aniversário filmado com uma câmera digital compacta, o casamento que alguém editou no Windows Movie Maker, os clipes do primeiro celular com câmera. Você passa para o celular ou para a TV e eles não abrem, ou o som aparece mas a imagem não. A solução é converter para MP4, o formato que roda em praticamente qualquer celular, TV, computador e rede social. Este guia explica como fazer isso no navegador, sem instalar programas, e o que esperar do resultado.

## Por que o celular ou a TV não abrem seus vídeos antigos

Um arquivo de vídeo tem duas camadas: o **contêiner** (o que a extensão indica: AVI, WMV, MP4…) e os **codecs**, que são a forma como a imagem e o som estão comprimidos lá dentro. Os vídeos antigos costumam combinar as duas coisas de um jeito que quase nada suporta hoje:

- **AVI**: o formato do Windows dos anos 90 e 2000, com vídeo DivX ou Xvid (MPEG-4 Part 2) e som MP3. Muitas câmeras compactas usavam, assim como os filmes baixados da época.
- **WMV**: o formato do Windows Media e do Movie Maker, com codecs próprios da Microsoft.
- **3GP**: o formato dos celulares de antes dos smartphones, com vídeo H.263 e som AMR, feito para telas minúsculas.
- **MOV**: o formato do QuickTime, do iPhone e de muitas câmeras. Costuma abrir em aparelhos da Apple, mas nem sempre no Android ou na TV. Se for um MOV moderno, com H.264 ou HEVC, ele vira MP4 sem recomprimir, em segundos.
- **FLV**, **MPG**, **VOB** e **RM**: os vídeos em Flash dos sites de anos atrás, o MPEG-1 e o MPEG-2 das filmadoras e dos DVDs, e o RealMedia.

Os celulares, as smart TVs e os navegadores atuais deixaram de incluir esses codecs. Já um MP4 com vídeo **H.264** e som **AAC** roda em qualquer lugar. É isso que você obtém ao converter.

## Como converter um vídeo antigo para MP4, passo a passo

1. Abra o [Converter vídeo](tool:video-converter) e arraste seus vídeos para a área indicada, ou clique para escolhê-los. Dá para adicionar vários de uma vez.
2. Em **Converter para**, deixe **MP4** selecionado (é a opção padrão).
3. Toque em **Converter vídeo**. Enquanto ele trabalha, aparece uma barra de **Processando…**; se você escolheu o arquivo errado, toque em **Cancelar**.
4. Quando aparecer **Seu arquivo está pronto**, toque em **Baixar** ao lado de cada vídeo, ou em **Baixar tudo em ZIP** se converteu vários.
5. Copie os MP4 para o celular, envie para a nuvem ou coloque num pen drive para a TV.

![Três vídeos antigos (AVI, WMV e 3GP) carregados no Converter vídeo, com MP4 escolhido como formato de saída](shot:video-viejo-mp4-elegir.pt "Um AVI, um WMV e um 3GP prontos para virar MP4 de uma vez só.")

Tudo acontece no seu navegador: os vídeos não são enviados a nenhum servidor. Isso faz diferença com vídeos de família e ainda evita esperar o upload de um arquivo pesado.

## Por que a primeira vez demora um pouco mais

Seu navegador sabe ler MP4, MOV, MKV e WebM, mas não esses formatos antigos. Quando reconhece um deles, a ferramenta baixa um motor FFmpeg (cerca de 31 MB, do nosso próprio domínio) que roda dentro da página. A conversão acontece então em duas etapas:

1. O FFmpeg lê o vídeo antigo e o transforma num formato intermediário que o navegador entende.
2. Esse arquivo intermediário segue a conversão normal: é codificado em H.264 com o codificador do seu navegador, e o som vira AAC.

Por isso a barra de progresso avança em dois trechos e a conversão é mais lenta que a de um MP4 moderno. Como referência, no nosso teste num computador de mesa, um AVI de um minuto em 640 × 480 levou cerca de meio minuto, contando o download do motor. Num celular ou num computador antigo, demora mais. As conversões seguintes reaproveitam o motor já baixado.

No fim, cada vídeo informa o que foi feito com ele: com os formatos antigos você verá **Vídeo recodificado em H.264.**, porque a imagem sempre é comprimida de novo, em alta qualidade.

![Resultado da conversão: três MP4 prontos para baixar, cada um recodificado em H.264](shot:video-viejo-mp4-resultado.pt "Cada arquivo informa com qual codec ficou; com vários, dá para baixar todos num ZIP.")

## Limites que vale a pena conhecer

- **Tamanho**: até 200 MB por arquivo e até 50 arquivos por vez.
- **Duração**: com os formatos antigos, o máximo é de 20 minutos de vídeo por arquivo, porque o motor FFmpeg é mais lento e trabalha na memória do navegador. Um MP4, MOV, MKV ou WebM pode ter até 2 horas.
- **Tempo**: se um vídeo levar mais de 30 minutos para converter, o processo é interrompido para não travar seu aparelho.
- **Faixas**: ficam a faixa de vídeo e a de áudio principais. Legendas e áudios alternativos, como o segundo idioma de um DVD, não são copiados.
- **DVD**: os arquivos VOB de um DVD costumam ter perto de 1 GB cada, mais que o limite, e ainda vêm divididos em partes. A ferramenta serve para VOB pequenos, mas não para converter um DVD inteiro.
- **Navegador**: para obter H.264, use o Chrome, o Edge ou o Safari. Em navegadores sem codificador H.264 (como o Chromium ou o Firefox no Linux), aparece um aviso e o MP4 é criado com VP9 ou AV1, que rodam no Chrome, no Edge, no Firefox e no Android, mas talvez não no iPhone nem em todas as TVs.

## O que a conversão não consegue consertar

Converter muda o formato, não a imagem. Um vídeo de celular de 2008 gravado em 176 × 144 continua com esse tamanho: vai rodar na TV, mas pequeno e borrado, igualzinho ao original. A ferramenta não aumenta a resolução nem tira o ruído de uma câmera antiga, e também não recupera um arquivo danificado: se o vídeo para no meio no seu computador, o MP4 também vai parar.

Há ainda alguns vídeos que, por enquanto, não podem ser lidos mesmo com uma extensão conhecida. Nos nossos testes falharam os MOV muito antigos do QuickTime (com codecs como Sorenson ou Cinepak) e os MP4 de algumas câmeras antigas que usam MPEG-4 Part 2 em vez de H.264. Nesses casos aparece uma mensagem dizendo que o navegador não consegue ler o vídeo do arquivo.

## Depois de converter

Com o MP4 em mãos, você pode continuar com outras ferramentas, que trabalham com MP4 do mesmo jeito que o conversor:

- **Para mandar pelo WhatsApp ou por e-mail**: se estiver pesado demais, o [Comprimir vídeo](tool:compress-video) reduz a qualidade ou a resolução.
- **Para ficar só com um trecho**: o [Cortar vídeo](tool:trim-video) tira o começo e o fim, como aqueles minutos em que a câmera ficou apontada para o chão.
- **Para montar um só vídeo com vários clipes**: o [Juntar vídeos](tool:join-videos) une todos na ordem que você escolher, por exemplo os 3GP de uma viagem.
- **Para câmera lenta ou acelerada**: o [Alterar velocidade do vídeo](tool:video-speed) vai de 0,25× a 4×.
- **Para guardar só o som**: o [Extrair áudio de vídeo](tool:extract-audio) salva em MP3, M4A, WAV, FLAC ou OGG.
- **Para passar para texto o que se fala**: o [Transcrever áudio para texto](tool:audio-to-text) aceita o MP4; o guia [Como transcrever um áudio ou mensagem de voz para texto](guide:transcribe-audio) explica como.
- **Para compartilhar um momento curto**: o [Vídeo para GIF](tool:video-to-gif) transforma alguns segundos numa animação.

Se o que não abre no seu celular são fotos, e não vídeos, o guia [Como converter fotos HEIC do iPhone para JPG](guide:heic-to-jpg) trata do mesmo problema com as imagens do iPhone.

## Resumo

- Vídeos AVI, WMV, 3GP, FLV, MPG, VOB e RM não abrem em muitos celulares e TVs porque usam codecs que não vêm mais incluídos.
- O [Converter vídeo](tool:video-converter) transforma esses arquivos em MP4 com H.264 e AAC, no navegador e sem enviá-los a lugar nenhum.
- Na primeira vez ele baixa um motor de cerca de 31 MB e é mais lento que com um MP4; o máximo é de 20 minutos e 200 MB por arquivo.
- A conversão não melhora a imagem: um vídeo de baixa resolução continua assim.
- Para H.264, use o Chrome, o Edge ou o Safari.
`;

export default body;
