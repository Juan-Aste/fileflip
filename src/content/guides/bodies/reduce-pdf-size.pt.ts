const body = `
Um PDF grande demais é um problema prático: o e-mail volta, o formulário de envio pede “menos de 2 MB”, ou quem recebe pelo WhatsApp precisa gastar os dados móveis para abrir. A boa notícia é que quase sempre dá para reduzi-lo bastante sem que ele fique difícil de ler. O segredo é entender **o que ocupa espaço** dentro do PDF.

## Por que um PDF fica tão pesado

Um PDF só de texto, como um salvo do Word sem nada além de palavras, é minúsculo: cada página ocupa alguns kilobytes. O que faz um PDF pesar megabytes quase sempre são **as imagens dentro dele**, principalmente fotos tiradas com o celular.

O caso típico: você “escaneou” um contrato fotografando com o celular e juntou as fotos em um PDF. Cada foto tem 12 megapixels ou mais, uma resolução muito maior do que a necessária para ler uma página, e o PDF acaba com 1 a 3 MB por página.

Por isso a nossa ferramenta [Comprimir PDF](tool:compress-pdf) trabalha nas imagens: ela as salva de novo com menos resolução e mais compressão, e deixa o texto, as fontes e os desenhos vetoriais intactos. O texto continua nítido e ainda pode ser selecionado e pesquisado.

## Como comprimir um PDF, passo a passo

1. Abra o [Comprimir PDF](tool:compress-pdf) e arraste o arquivo, ou toque para escolhê-lo.
2. Escolha o nível de compressão: **Baixa** (melhor qualidade), **Recomendada** ou **Forte** (arquivo mais leve).
3. Clique em **Comprimir PDF**.
4. Veja o resultado: a ferramenta mostra o tamanho antes e depois. Se servir, baixe; se não, teste outro nível.

![Comprimir PDF com o nível recomendado e o resultado](shot:comprimir-pdf-resultado "A ferramenta mostra quanto o PDF pesava e quanto pesa agora.")

O PDF é processado no seu próprio navegador: nunca é enviado a um servidor, então você pode comprimir documentos com dados pessoais com segurança. São aceitos arquivos de até 200 MB.

## Qual nível escolher: o que medimos

Para dar uma ideia real, montamos um PDF de 4 páginas com imagens que imitam fotos de celular de um contrato: 3024 × 4032 pixels cada, como a maioria dos celulares gera, com iluminação irregular e granulado. Ele pesava 4,8 MB. Estes são os resultados em cada nível:

| Nível | Tamanho | Redução | O que faz com as fotos |
| --- | --- | --- | --- |
| Baixa | 756 KB | 85% | Lado maior de até 2400 pixels, qualidade alta |
| Recomendada | 321 KB | 94% | Lado maior de até 1600 pixels, qualidade média |
| Forte | 144 KB | 97% | Lado maior de até 1100 pixels, qualidade baixa |

No nível forte, o texto do contrato continuava perfeitamente legível vendo a página inteira na tela. O que se perde é o detalhe fino: se o PDF tem fotos que importam por si mesmas (um catálogo de produtos, uma planta com letras muito pequenas, um relatório com fotografias), fique no nível baixo ou no recomendado.

Uma dica prática: **comece pelo Recomendado**. Para e-mail ou WhatsApp, costuma bastar. Se um formulário de envio pedir um arquivo menor, passe para o Forte.

## Por que às vezes quase não diminui

Se o seu PDF é basicamente texto, ou se as imagens já estão bem comprimidas, sobra pouco para reduzir. Um PDF de texto com poucas páginas pesa alguns kilobytes e não faz sentido comprimi-lo. Se a ferramenta não conseguir reduzir, ela avisa, e nunca entrega um arquivo maior que o original.

O mesmo acontece com PDFs que já passaram por outro compressor, ou com imagens em formatos que não recomprimimos para não arriscar a qualidade (por exemplo, algumas digitalizações em preto e branco puro ou imagens com cores de impressão). Se o PDF continuar grande depois de comprimido, teste as outras ideias deste guia.

## Outras formas de deixar um PDF menor

**Tire as páginas que sobram.** Muitas vezes o PDF tem páginas em branco, anexos que ninguém precisa ou a mesma página duas vezes. Com o [Excluir páginas de um PDF](tool:delete-pdf-pages) você vê uma miniatura de cada página e remove as que não quer. O resto mantém a mesma qualidade.

**Divida em partes.** Se o formulário aceita vários arquivos, mas cada um com um tamanho máximo, o [Dividir PDF](tool:split-pdf) separa o documento em intervalos de páginas (por exemplo, 1-5 e 6-10), e cada parte fica menor.

**Reduza as fotos antes de montar o PDF.** Se você vai criar o PDF a partir de fotos, pode fazer isso com o [Imagens para PDF](tool:images-to-pdf) e depois comprimir o resultado; ou reduzir as fotos antes com o [Comprimir imagem](tool:compress-image), que permite definir um tamanho exato para cada foto.

**Digitalize melhor.** Se o PDF vem de fotos de papel, o [Escanear documento](tool:scan-document) endireita a página e deixa o papel branco e o texto preto: o resultado parece uma digitalização de verdade, mais legível que a foto original.

## Quanto ele precisa pesar para ser enviado

Não existe um número único, mas há referências úteis:

- **E-mail**: muitos serviços de e-mail recusam anexos acima de 20 ou 25 MB (no Gmail, o limite é de 25 MB). Além disso, um arquivo pequeno é mais gentil com quem recebe: para um documento de poucas páginas, menos de 2 MB é razoável.
- **WhatsApp**: aceita documentos grandes, mas quem recebe precisa baixá-los, às vezes pelos dados móveis. Se você enviar como documento (e não como foto), o PDF chega exatamente como está.
- **Formulários e cadastros on-line**: normalmente informam o tamanho máximo ao lado do botão de envio. Limites de 1, 2 ou 5 MB por arquivo são comuns. Confira esse número antes de comprimir, para escolher o nível certo.

## Erros comuns

- **Comprimir o mesmo PDF várias vezes.** Cada passada perde um pouco de qualidade e, a partir da segunda, quase não reduz o tamanho. É melhor voltar ao original e escolher um nível mais forte.
- **Transformar o PDF em imagens para reduzi-lo.** Converter cada página em JPG e remontar o PDF faz o texto deixar de ser texto: não dá mais para pesquisar nem copiar, e muitas vezes o arquivo fica maior.
- **Colocar senha antes de comprimir.** Primeiro comprima, depois proteja. Se o PDF já tem senha de abertura, tire-a com o [Remover senha de PDF](tool:unlock-pdf), comprima e proteja de novo com o [Proteger PDF com senha](tool:protect-pdf).

## Resumo

- O que deixa um PDF pesado são as fotos; o texto quase não ocupa espaço.
- O [Comprimir PDF](tool:compress-pdf) recomprime as fotos e deixa o texto intacto, no seu navegador.
- Comece pelo nível recomendado; use o Forte se pedirem um arquivo bem pequeno.
- Se não bastar, tire páginas, divida o PDF ou melhore a digitalização.
- Se você vai editar o PDF depois, o guia [Como converter PDF em Word editável](guide:pdf-to-word) explica o que se mantém na conversão.
`;

export default body;
