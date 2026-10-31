const body = `
Se você tem iPhone, as suas fotos quase certamente estão no formato HEIC. No celular você nem percebe, mas a diferença aparece assim que você passa as fotos para um computador com Windows, anexa em um formulário on-line ou tenta mandar para alguém que não usa Apple: o arquivo não abre, não aparece miniatura ou o site diz “formato não suportado”. Este guia explica o que é HEIC, como converter as fotos para JPG sem instalar nada e como evitar o problema no próprio iPhone.

## O que é HEIC e por que o iPhone usa

HEIC é o nome que a Apple usa para imagens guardadas no formato HEIF com o codec de vídeo HEVC. Desde o iOS 11, a câmera do iPhone salva as fotos assim por um motivo prático: com qualidade parecida, um arquivo HEIC ocupa mais ou menos metade do espaço de um JPG, e num celular com milhares de fotos isso faz muita diferença no armazenamento.

O problema é a compatibilidade. O JPG é aberto por qualquer programa, navegador, rede social e formulário há décadas; o HEIC, não. O Windows pode precisar de extensões da Microsoft Store para exibi-lo, muitos sistemas de órgãos públicos e de empresas não o aceitam, e alguns programas de edição mais antigos não o reconhecem.

## Como converter fotos HEIC para JPG

1. Abra o [HEIC para JPG](conv:heic-jpg) e arraste as fotos, ou toque para escolhê-las. Você pode selecionar várias de uma vez.
2. Confira se **JPG** está escolhido em “Converter para”.
3. Se quiser fotos mais leves, abra **Opções** e diminua a qualidade ou o tamanho. Se não, mantenha o padrão.
4. Clique em **Converter** e baixe cada foto, ou todas juntas com **Baixar tudo em ZIP**.

![O conversor com uma foto HEIC pronta para virar JPG](shot:heic-convertir "As fotos HEIC são convertidas no seu navegador: nunca são enviadas a um servidor.")

A conversão acontece dentro do seu navegador: as fotos nunca são enviadas a um servidor, o que importa quando são fotos pessoais ou de documentos. Funciona no Chrome, no Edge, no Firefox e no Safari, no computador ou no próprio celular, com até 50 fotos de uma vez.

A foto mantém a orientação: se você tirou em pé, o JPG também fica em pé, mesmo que o arquivo original guarde a rotação separadamente.

## Pelo celular ou pelo computador

**No iPhone**: abra a página no Safari, toque na área para escolher arquivos e depois em “Fototeca”. Quando terminar, baixe o JPG; o Safari o salva no app Arquivos, na pasta Downloads, de onde você pode enviá-lo ou salvá-lo no app Fotos.

**Num computador com Windows**: primeiro copie as fotos do iPhone para o computador (por cabo, pela nuvem ou por e-mail). Depois arraste todas para o conversor de uma vez. Se forem muitas, o ZIP evita baixar uma por uma.

**No Android**: se alguém mandou fotos HEIC e o seu celular não consegue abrir, o processo é o mesmo do iPhone: escolha os arquivos pelo navegador e baixe os JPGs.

## Vale saber antes de converter

**Os dados da foto não passam para o JPG.** Os arquivos HEIC do iPhone guardam, além da imagem, informações como a data e a hora, o modelo do celular e, se a localização da câmera estiver ativada, as coordenadas de GPS de onde a foto foi tirada. O nosso conversor desenha a imagem e a salva de novo, então o JPG resultante não leva esses dados. Na hora de compartilhar fotos com desconhecidos, isso é uma vantagem: você não revela onde estava. Mas, se depois você pretende organizar as fotos por data em algum programa, lembre que essa informação não estará no arquivo.

Se o que você quer é tirar a localização de fotos que já estão em JPG, o [Remover metadados EXIF](tool:remove-exif) faz isso sem convertê-las de novo.

**O JPG fica maior que o HEIC.** É normal: o HEIC comprime melhor. Na qualidade padrão, o JPG pode ficar bem maior que o original. Se o formulário pede um tamanho máximo (por exemplo, “menos de 500 KB”), use depois o [Comprimir imagem](tool:compress-image), que permite definir exatamente esse tamanho.

**As Live Photos são uma foto mais um vídeo curto.** Ao converter uma Live Photo, você fica só com a foto parada. O movimento se perde, assim como quando você a envia por e-mail como foto comum.

## Como fazer o iPhone tirar fotos em JPG

Se você sempre precisa de JPG, pode mudar o formato da câmera:

1. Abra os **Ajustes** do iPhone.
2. Entre em **Câmera** e depois em **Formatos**.
3. Escolha **Mais Compatível**.

A partir daí, as fotos novas são salvas em JPG e os vídeos em H.264. As fotos que você já tem continuam em HEIC. Em compensação, as fotos novas ocupam mais espaço no celular; se o armazenamento está apertado, talvez seja melhor manter o HEIC e converter só as fotos que você precisa enviar.

## Como copiar as fotos para o computador já em JPG

O iPhone tem outra opção, pensada para quando você o conecta a um computador por cabo: em **Ajustes → Fotos**, lá embaixo, fica a seção **Transferir para Mac ou PC**. Com **Automático**, o iPhone converte as fotos para um formato compatível enquanto as copia; com **Manter Originais**, ele as copia em HEIC.

Essa opção só vale para a cópia por cabo. Se você passa as fotos pela nuvem, por um app de mensagens ou por e-mail, o formato depende de cada serviço: alguns convertem para JPG e outros enviam o arquivo como está. Se quem recebe não consegue abrir, converta antes de enviar.

## Outros formatos de destino

O JPG é a escolha mais segura, mas não a única:

- **PNG**: não perde qualidade, mas uma foto em PNG fica muito maior. Só faz sentido se você vai editar a imagem muitas vezes. Você pode usar o [HEIC para PNG](conv:heic-png).
- **WebP**: menor que o JPG e os navegadores atuais o abrem, mas nem todo formulário aceita.
- **PDF**: se você precisa enviar várias fotos de um documento (frente e verso do RG, uma nota com várias páginas), o [Imagens para PDF](tool:images-to-pdf) aceita HEIC direto e monta um único PDF com uma foto por página.

O guia [JPG, PNG, WebP ou AVIF: qual usar em cada caso](guide:image-formats) explica as diferenças entre esses formatos com tamanhos medidos.

## Resumo

- HEIC é o formato do iPhone: arquivos menores, mas nem tudo abre.
- Para converter, use o [HEIC para JPG](conv:heic-jpg): no seu navegador, sem enviar as fotos, várias de uma vez.
- O JPG não guarda a data nem a localização da foto, e fica maior que o HEIC.
- Para o iPhone tirar fotos em JPG: **Ajustes → Câmera → Formatos → Mais Compatível**.
- Para copiar por cabo já convertidas: **Ajustes → Fotos → Transferir para Mac ou PC → Automático**.
`;

export default body;
