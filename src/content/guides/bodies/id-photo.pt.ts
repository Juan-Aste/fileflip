const body = `
Para o RG, a CNH, o passaporte, um visto ou um cadastro on-line, o pedido é quase sempre o mesmo: uma foto de frente, com fundo claro e num tamanho exato. Com o celular, uma parede lisa e boa luz, dá para tirar a foto em casa, cortar no tamanho certo e imprimir várias cópias numa única foto 10 × 15 cm. Este guia explica como fazer e no que prestar atenção para a foto não ser recusada.

## Primeiro: qual tamanho pedem

Cada órgão define as próprias exigências (tamanho, fundo, tamanho da cabeça, se pode usar óculos), e elas mudam conforme o país e o documento. Antes de tirar a foto, procure as instruções oficiais ou pergunte no órgão. Muitos documentos, aliás, já são fotografados no local e você não precisa levar nada.

A nossa ferramenta traz os tamanhos mais pedidos:

| Tamanho | Uso comum |
| --- | --- |
| 3 × 4 cm | Brasil (RG, CNH, carteira de trabalho) e muitos trâmites no Chile, na Colômbia e em outros países |
| 4 × 4 cm | Muitos trâmites na Argentina |
| 3,5 × 4,5 cm | Passaportes e vistos no padrão internacional ICAO, como o mexicano e os europeus |
| 2,5 × 3 cm | O “tamaño infantil” do México |
| 2 × 2 polegadas (5,1 × 5,1 cm) | Passaporte e visto dos EUA |

Se pedem outro tamanho, esta ferramenta não tem: você pode cortar a foto na proporção que quiser com [Cortar imagem](tool:crop-image) e deixá-la com os pixels exatos com [Redimensionar imagem](tool:resize-image).

## Como tirar a foto com o celular

Estas dicas servem para quase qualquer documento; os detalhes são definidos pelo órgão que pede a foto.

- **Luz uniforme e de frente**: o ideal é a luz do dia, de frente para uma janela. Evite luz de cima (marca olheiras) e luz de um lado só (metade do rosto na sombra). O flash direto costuma deixar brilho na pele e uma sombra forte na parede.
- **Fundo liso e claro**: uma parede branca ou cinza-claro, sem quadros, portas ou tomadas atrás. Fique a meio metro ou mais da parede, para a sua sombra não cair nela.
- **Peça para outra pessoa tirar**: com a câmera na altura dos olhos e a um metro ou mais. Uma selfie com o braço esticado fica perto demais e deforma o rosto (o nariz parece maior). Se estiver sozinho, apoie o celular em algo firme e use o temporizador.
- **Expressão neutra**: de frente, olhando para a câmera, boca fechada e olhos bem abertos. Sem boné nem óculos escuros, e sem cabelo cobrindo o rosto.
- **Sem filtros**: desligue o modo retrato, o embelezamento e os filtros. Muitos órgãos não aceitam fotos retocadas, e a ferramenta também não retoca nada.
- **Várias fotos**: tire algumas e fique com a mais nítida. Não precisa enquadrar com precisão: deixe espaço em volta da cabeça e dos ombros, porque o corte vem depois.

## Como fazer a foto 3x4 passo a passo

1. Abra [Foto 3x4 e documentos](tool:id-photo) e escolha a foto. Aceita JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF e HEIC do iPhone, de até 50 MB.
2. Em **Tamanho**, escolha o que pedem, por exemplo **3 × 4 cm** ou **3,5 × 4,5 cm (passaporte, ICAO)**.
3. Mova o quadro e arraste os cantos para que a cabeça fique dentro do oval e os olhos sobre a linha pontilhada.
4. Toque em **Criar foto**.
5. Baixe os dois arquivos com **Baixar**, ou juntos com **Baixar tudo em ZIP**.

![Uma foto ilustrada com o quadro de 3,5 × 4,5 cm e o oval de guia sobre o rosto](shot:foto-carnet-encuadrar "O quadro mantém a proporção do tamanho escolhido; o oval e a linha pontilhada mostram onde ficam a cabeça e os olhos.")

Tudo acontece no seu navegador: a foto não é enviada a nenhum servidor.

Escolha o tamanho antes de enquadrar: ao mudar, o quadro volta a ficar centralizado com a nova proporção e você precisa ajustá-lo de novo.

## Enquadrar bem o rosto

O quadro sempre tem a proporção do tamanho escolhido, então não dá para deformar o rosto ao esticá-lo. Para ajustar:

- **Com o dedo ou o mouse**: arraste o quadro para movê-lo e os cantos para aumentá-lo ou diminuí-lo.
- **Com o teclado**: as setas movem e **Shift** + setas mudam o tamanho.
- **Com números**: os campos **X**, **Y**, **Largura** e **Altura** (em pixels) servem para ajustes finos.

O topo da cabeça fica perto da borda de cima do oval, e o queixo, na borda de baixo. O mais importante é a altura, do topo da cabeça ao queixo: é normal o cabelo ou as orelhas passarem um pouco dos lados. A linha vertical ajuda a ver se a cabeça está centralizada e reta.

O oval ocupa 72 % da altura da foto: cerca de 29 mm em 3 × 4 e em 4 × 4 cm, 32 mm em 3,5 × 4,5 cm e 37 mm em 2 × 2 polegadas. Se as instruções dizem quanto a cabeça deve medir, compare com esses números e diminua ou aumente o quadro.

## Quais arquivos você baixa

![Os dois arquivos prontos: a foto sozinha e a folha 10 × 15 cm com 8 cópias](shot:foto-carnet-resultado "A foto sozinha a 600 dpi e uma folha 10 × 15 cm com todas as cópias que cabem.")

- **A foto sozinha**, em JPG a 600 dpi (por exemplo, 709 × 945 pixels em 3 × 4 cm). É a que você envia num cadastro on-line ou imprime no tamanho real.
- **Uma folha 10 × 15 cm** a 300 dpi, com todas as cópias que cabem, separadas e com linhas cinza de corte: 9 cópias de 3 × 4 cm, 6 de 4 × 4 cm, 8 de 3,5 × 4,5 cm, 15 de 2,5 × 3 cm ou 2 de 2 × 2 polegadas.

Se a área enquadrada tiver pouca resolução para imprimir nítida (menos de 300 dpi), a ferramenta avisa. Isso acontece quando o rosto ocupa muito pouco da foto original: é melhor tirar de novo, mais de perto.

## Como imprimir

Leve a folha a um laboratório, um quiosque de fotos ou uma impressora fotográfica e peça uma cópia 10 × 15 cm, **sem cortar nem ajustar**: a folha já tem esse tamanho e as cópias saem exatas. Depois corte nas linhas cinza com tesoura ou, melhor ainda, com estilete e régua.

Se imprimir a foto sozinha em casa, escolha **tamanho real** ou 100 % nas opções da impressora, e não “ajustar à página”: o arquivo leva a resolução para sair no tamanho exato.

## Se a parede não é lisa

A ferramenta corta e redimensiona a foto como ela está: não muda o fundo nem retoca o rosto. Se você não tem uma parede clara por perto, [Remover fundo de imagem](tool:remove-background) pode ajudar: no modo **Pessoas (automático)** ele encontra a pessoa, e você baixa o resultado com fundo **Branco** ou de outra **Cor**, em JPG e do mesmo tamanho do original. Depois abra esse JPG na ferramenta de foto 3x4. O guia [Como remover o fundo de uma foto](guide:remove-background) explica em detalhes.

Confira bem a borda do cabelo antes de usar e lembre que alguns órgãos recusam fotos com o fundo trocado. Se puder, uma parede clara continua sendo a opção mais segura. Se deixar o fundo transparente num PNG, a ferramenta o preenche de branco.

## Se vai enviar num cadastro on-line

Os sites costumam definir um formato, as medidas em pixels e um tamanho máximo de arquivo. A foto que você baixa é um JPG a 600 dpi:

- Se pedem **outras medidas em pixels**, ajuste com [Redimensionar imagem](tool:resize-image).
- Se o arquivo **passa do limite**, reduza com [Comprimir imagem](tool:compress-image).
- Se a sua foto é **HEIC** do iPhone, a ferramenta abre direto. Se também precisar do original em JPG, o guia [Como converter fotos HEIC em JPG](guide:heic-to-jpg) explica como.

Os arquivos que a ferramenta gera são criados de novo a partir dos pixels, então não levam os dados EXIF da foto original, como o modelo do celular ou a localização. Se for mandar a foto original como está, você pode tirar esses dados com [Remover metadados EXIF](tool:remove-exif).

## Resumo

- Confirme o tamanho e as exigências com o órgão que pede a foto: mudam conforme o país e o documento.
- Tire de frente, com luz uniforme, diante de uma parede lisa e clara, a um metro ou mais e sem filtros.
- Em [Foto 3x4 e documentos](tool:id-photo), escolha o tamanho, enquadre a cabeça no oval com os olhos na linha e baixe.
- Você recebe a foto a 600 dpi para enviar e uma folha 10 × 15 cm com várias cópias para imprimir sem ajustar.
- Se a parede não servir, experimente [Remover fundo de imagem](tool:remove-background), sabendo que alguns órgãos não aceitam fundo trocado.
`;

export default body;
