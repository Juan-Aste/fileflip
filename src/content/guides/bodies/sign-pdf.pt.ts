const body = `
Alguém manda um contrato, uma autorização ou um formulário em PDF e pede que você devolva assinado. O caminho clássico é imprimir, assinar à mão, escanear ou fotografar e montar o PDF de novo. Funciona, mas leva tempo e o resultado costuma ficar torto e acinzentado. Este guia explica como colocar a sua assinatura direto no PDF, pelo computador ou pelo celular, e qual é a diferença entre essa assinatura e uma assinatura digital com certificado.

## Antes de começar: que tipo de assinatura pedem

Vale esclarecer primeiro, porque são coisas diferentes:

- **Assinatura de próprio punho no PDF**: uma imagem da sua assinatura colocada na página, como se você assinasse o papel e o escaneasse. É o que a nossa ferramenta faz, e basta para muitos acordos particulares, autorizações, declarações e formulários.
- **Assinatura digital com certificado**: usa um certificado emitido por uma autoridade certificadora (em um token, um cartão ou um aplicativo oficial; no Brasil, dentro da ICP-Brasil) e fica registrada de forma criptográfica dentro do PDF. Qualquer alteração posterior a invalida. Muitos procedimentos oficiais e alguns contratos exigem esse tipo.

A validade jurídica de cada uma depende do país e do procedimento. Se o órgão ou a empresa pede “assinatura digital”, uma imagem da sua assinatura não a substitui; se pedem para “assinar e devolver o PDF”, a assinatura de próprio punho costuma bastar. Na dúvida, pergunte a quem pediu.

## Como assinar um PDF, passo a passo

1. Abra o [Assinar PDF](tool:sign-pdf) e escolha o PDF.
2. Em **Sua assinatura**, escolha **Desenhar** e assine com o dedo, o mouse ou uma caneta no quadro; ou escolha **Enviar uma foto ou imagem** da sua assinatura no papel.
3. Escolha a **Cor da tinta** (azul ou preto) e clique em **Usar esta assinatura**.
4. Vá até a página em que vai a assinatura usando as setas e **toque no lugar** onde quer colocá-la, ou arraste-a.
5. Ajuste o **tamanho da assinatura** com o controle deslizante.
6. Clique em **Assinar e baixar**.

![Uma assinatura desenhada colocada sobre a linha de assinatura de uma autorização](shot:firmar-pdf-colocar "Você posiciona a assinatura tocando na página; depois pode movê-la e mudar o tamanho.")

Tudo acontece no seu navegador: nem o documento nem a sua assinatura saem do seu aparelho, e não guardamos a sua assinatura. Por isso, na próxima vez você vai precisar desenhá-la ou enviá-la de novo.

## Desenhar ou enviar uma foto

**Desenhar** é o mais rápido. No celular, com o dedo, fica bem natural; com o mouse é mais difícil. Se você tem um tablet com caneta, essa é a melhor opção.

**Enviar uma foto** dá o resultado mais parecido com a sua assinatura no papel:

1. Assine numa folha **branca e lisa** com uma caneta de tinta escura (azul ou preta).
2. Tire uma foto **com boa luz**, de frente e sem sombras.
3. Envie com **Enviar uma foto ou imagem** e deixe marcado **Tirar o fundo branco do papel**.

A ferramenta remove o branco do papel e corta as bordas, para que fique só o traço, com fundo transparente. Assim a assinatura aparece limpa sobre a linha do documento, sem um retângulo branco em volta. São aceitos PNG, JPG ou WEBP de até 10 MB.

## Posicionando bem

- **Tamanho**: uma assinatura de verdade ocupa entre um quarto e um terço da largura de uma folha A4 ou Carta. O controle mostra o tamanho em porcentagem da largura da página.
- **Posição**: procure fazer o traço se apoiar na linha de assinatura, sem ficar flutuando acima dela.
- **Pelo teclado**: selecione a assinatura com Tab e mova-a com as setas; com Shift ela se move mais rápido. Útil para ajustes finos.

## Assinar várias páginas

A ferramenta coloca a assinatura em uma página por vez. Se o documento precisa de assinatura em várias páginas (por exemplo, em todas as páginas de um contrato), assine a primeira, baixe o PDF e abra esse PDF assinado de novo para assinar a seguinte.

Se você também precisa **rubricar** cada página ou acrescentar um texto como o seu nome, o número do RG ou do CPF ou a data, use o [Editar PDF](tool:edit-pdf): ele permite digitar texto em qualquer lugar da página, em várias páginas, e também acrescentar uma imagem, como a sua assinatura salva em PNG.

## Se o PDF for um formulário

Muitos formulários em PDF têm campos para preencher (caixas de seleção, campos de texto, listas). Preencha primeiro os dados com o [Preencher formulário PDF](tool:fill-pdf-form) e salve o PDF achatado; depois, assine. Assim os dados e a assinatura ficam fixos na página e aparecem iguais em qualquer leitor ou impressora.

Se o formulário não tem campos, só linhas para escrever à mão, preencha os dados com o [Editar PDF](tool:edit-pdf).

## Depois de assinar

- **Confira o resultado** antes de enviar: abra o PDF baixado e verifique se a assinatura está na página certa e no lugar certo.
- **Se ficar pesado demais** para mandar por e-mail, o [Comprimir PDF](tool:compress-pdf) o reduz. O guia [Como diminuir o tamanho de um PDF](guide:reduce-pdf-size) explica qual nível escolher.
- **Se for confidencial**, você pode colocar uma senha de abertura com o [Proteger PDF com senha](tool:protect-pdf) e mandar a senha por outro canal.

A assinatura é desenhada na página como imagem, então aparece igual em qualquer leitor de PDF e na impressão. Lembre que, diferente de uma assinatura digital com certificado, ela não impede que alguém altere o documento depois: guarde uma cópia do PDF que você enviou.

## Resumo

- O [Assinar PDF](tool:sign-pdf) coloca a sua assinatura de próprio punho no PDF, sem imprimir nem escanear, e sem enviar nada.
- Desenhe a assinatura ou envie uma foto em papel branco: o fundo é removido automaticamente.
- Assine uma página por vez; para mais páginas, abra de novo o PDF assinado.
- Preencha os formulários antes de assinar, com o Preencher formulário PDF ou o Editar PDF.
- Uma assinatura de próprio punho no PDF não é uma assinatura digital com certificado: se é isso que pedem, ela não a substitui.
`;

export default body;
