const body = `
Uma foto de produto com fundo branco fica mais caprichada numa loja virtual; um retrato sem fundo serve para currículo, crachá ou foto de perfil; um objeto ou um logotipo sem fundo pode ir em cima de qualquer arte. Este guia explica como remover o fundo de uma foto de graça e sem enviá-la para nenhum servidor, quando usar cada modo da ferramenta, como corrigir as bordas e qual formato baixar conforme o lugar onde a imagem vai ser usada.

## Qual modo escolher: pessoas ou objetos

[Remover fundo de imagem](tool:remove-background) tem dois modos, e escolher o certo é o que mais pesa no resultado:

- **Pessoas (automático)**: para retratos, selfies e fotos de uma ou mais pessoas. Assim que você escolhe a foto, um modelo de inteligência artificial (o MediaPipe Selfie Segmenter, do Google) encontra a pessoa e remove o fundo sozinho. Na primeira vez são baixados uns 4 MB do Fileflect (depois eles ficam no cache do navegador), e é preciso ter WebGL. Ele só reconhece pessoas: se não houver uma pessoa clara na foto, ele avisa e oferece **Usar o modo retângulo**.
- **Objetos e produtos (retângulo)**: para todo o resto, como um produto em cima de uma mesa, um objeto, um logotipo fotografado ou um bichinho de estimação. Você enquadra o assunto num retângulo e um método clássico (GrabCut, sem nenhum modelo) separa as cores dele das do fundo. Não baixa nada e funciona melhor quando as cores do assunto se destacam das do fundo.

Nos dois modos a foto é processada no seu navegador: nem a foto nem o resultado saem do seu dispositivo.

## Como remover o fundo passo a passo

Este é o caminho para uma foto de produto; com uma pessoa é igual, só que o primeiro recorte sai sozinho e não há retângulo.

1. Abra [Remover fundo de imagem](tool:remove-background), escolha o modo **Objetos e produtos (retângulo)** e selecione a foto.
2. Ajuste o retângulo da **Foto original** para que ele envolva o objeto com um pouco de margem. Tudo o que ficar fora é removido.
3. Confira o **Resultado**. Se sobrou fundo, escolha **Pincel: remover** e pinte por cima; se uma parte do objeto sumiu, escolha **Pincel: manter** e pinte por cima. O recorte é recalculado a cada pincelada.
4. Em **Fundo**, escolha **Transparente**, **Branco** ou **Cor**, e em **Formato**, PNG, WEBP ou JPG.
5. Toque em **Remover fundo** e baixe a imagem. Ela mantém o tamanho original, e o nome termina em “-sem-fundo”.

![Uma caneca fotografada sobre uma mesa, dentro do retângulo, e o resultado sem fundo sobre o xadrez](shot:quitar-fondo-producto.pt "O retângulo marca o objeto; à direita, o resultado com fundo transparente sobre o xadrez.")

A linha de status mostra quanto da foto foi mantido (por exemplo, “Recorte pronto: 15 % da foto é mantido.”). Se o número for bem maior do que você esperava, provavelmente sobrou parte do fundo.

## Como corrigir as bordas

O recorte automático raramente sai perfeito de primeira. A ferramenta tem dois tipos de pincel, que fazem coisas diferentes:

- **Pincel: manter** e **Pincel: remover** são indicações: dizem ao método “isto é o assunto” ou “isto é fundo”, e o recorte é recalculado a partir delas. Servem para áreas grandes, como uma etiqueta da mesma cor da parede ou uma sombra grudada no objeto. Uma pincelada atravessando a área já basta; não precisa pintá-la inteira.
- **Borracha** e **Restaurar** mudam exatamente os pixels que você pinta, sem recalcular nada. São para os detalhes: restos nos cantos, o vão da alça de uma caneca, o espaço entre os dedos. Dá para escolher a **Borda do pincel**: **Suave** para bordas naturais ou **Dura** para cortes limpos.

Para trabalhar com precisão, aproxime com o zoom (roda do mouse, pinça com dois dedos ou os botões, até 800 %) e se mova segurando a barra de espaço, com **Mão (mover)** ou deslizando com dois dedos. As teclas [ e ] mudam o **Tamanho do pincel**, e **Desfazer** e **Refazer** (Ctrl + Z e Ctrl + Y) percorrem todas as etapas.

Um truque útil: em **Ver sobre**, troque a visualização para **Preto** ou **Magenta**. Sobre uma cor forte, os restos claros e o halo do fundo antigo aparecem na hora, enquanto no xadrez passam despercebidos. Isso só muda a prévia, não a imagem que você baixa.

Tenha em mente um limite: o recorte é calculado numa cópia reduzida da foto (480 pixels no lado maior) e aplicado no tamanho original com a borda suavizada. As bordas nítidas de um produto ficam boas, mas cabelo solto ou o pelinho de um bicho de pelúcia ficam suavizados, não recortados fio a fio.

## Fundo branco para loja virtual

Muitas lojas e marketplaces preferem ou exigem fotos de produto com fundo branco liso. Com esta ferramenta:

1. Escolha **Branco** em **Fundo** (ou **Cor** e o tom que quiser em **Cor do fundo**).
2. Escolha JPG ou WEBP como formato: numa foto, eles ficam bem menores que o PNG.
3. Confira o resultado com **Fundo escolhido**, que mostra como a imagem baixada vai ficar.

![A mesma caneca com o fundo branco e o formato JPG selecionados](shot:quitar-fondo-blanco.pt "Com “Branco” e JPG, a prévia mostra a foto exatamente como ela será baixada.")

Se você escolher JPG com o fundo em **Transparente**, a ferramenta muda sozinha para **Branco**, porque o JPG não guarda transparência.

Algumas dicas para um resultado profissional:

- **Fotografe pensando no recorte**: um fundo liso e de cor diferente da do produto (uma cartolina, uma parede) facilita muito o trabalho. Evite fundos da mesma cor do objeto.
- **Cuidado com a sombra**: uma sombra suave na mesa pode ficar grudada no produto. Tire-a com **Pincel: remover** ou com a **Borracha**.
- **Deixe o produto centralizado e com margem**: depois você pode deixá-lo quadrado com [Cortar imagem](tool:crop-image) e no tamanho que a loja pede com [Redimensionar imagem](tool:resize-image).
- **Fique de olho no peso**: se a loja limita o tamanho do arquivo ou se você quer que a página carregue rápido, [Comprimir imagem](tool:compress-image) reduz o arquivo sem mudar as dimensões.

## Fundo transparente: qual formato baixar

Se a imagem vai ser colocada sobre outra arte (uma apresentação, um catálogo, uma página web), baixe-a com fundo **Transparente** em PNG, o formato com transparência mais compatível. O JPG não tem transparência. As diferenças entre os formatos estão explicadas em [JPG, PNG, WebP ou AVIF: qual usar em cada caso](guide:image-formats).

Para uma foto de perfil redonda, passe o PNG sem fundo pelo [Arredondar imagem](tool:round-image).

Um caso à parte é o **fundo transparente falso**: imagens baixadas da internet que mostram o xadrez cinza e branco, mas que na verdade têm esse xadrez desenhado nos pixels. Se você abrir uma delas, a ferramenta detecta e oferece **Remover fundo falso**, que transforma esse xadrez em transparência de verdade sem precisar recortar nada à mão.

## Fundo branco para foto de documento

Para uma foto 3x4 ou de passaporte com fundo branco, remova o fundo no modo **Pessoas (automático)**, escolha **Branco** e baixe a imagem; depois abra-a em [Foto 3x4 e documentos](tool:id-photo) para enquadrá-la no tamanho exigido e montar a folha de cópias. Essa ferramenta não troca o fundo sozinha. O guia [Como fazer uma foto 3x4](guide:id-photo) explica o enquadramento e a impressão.

Antes, confira as exigências do órgão: alguns não aceitam fotos editadas ou pedem que o fundo seja o da foto original. Nesse caso, o mais seguro é tirar a foto na frente de uma parede branca ou da cor que eles pedem.

## Limites e formatos

- Uma foto por vez, de até 30 MB e 40 megapixels.
- Aceita JPG, PNG, WEBP, AVIF, GIF (só o primeiro quadro) e BMP. As fotos HEIC do iPhone precisam ser convertidas antes para JPG com [HEIC para JPG](conv:heic-jpg).
- O arquivo baixado mantém o tamanho em pixels da foto original.

## Resumo

- Para pessoas, use **Pessoas (automático)**; para produtos, objetos e bichos, **Objetos e produtos (retângulo)**.
- Corrija áreas grandes com **Pincel: manter** e **Pincel: remover**, e os detalhes com **Borracha** e **Restaurar**, com zoom.
- Confira a borda vendo a imagem sobre **Preto** ou **Magenta**.
- Fundo branco ou colorido em JPG ou WEBP para lojas; fundo transparente em PNG para artes.
- Tudo acontece no seu dispositivo: a foto não é enviada.
`;

export default body;
