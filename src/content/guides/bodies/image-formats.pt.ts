const body = `
JPG, PNG, WebP e AVIF fazem a mesma coisa, guardar uma imagem, mas cada um resolve um problema diferente. Escolher o formato errado tem consequências bem concretas: uma foto salva em PNG que pesa dez vezes mais do que deveria, um logotipo salvo em JPG com borrões em volta das letras, ou uma imagem AVIF recusada pelo formulário de um órgão público. Este guia ajuda você a decidir com números medidos nas nossas próprias ferramentas, não com generalidades.

## A resposta curta

- **Fotos para enviar, anexar em um formulário ou imprimir**: JPG. Absolutamente tudo abre.
- **Capturas de tela, logotipos, gráficos ou imagens com fundo transparente**: PNG.
- **Imagens para um site**: WebP, ou AVIF se você quer o menor arquivo possível.
- **Se você não sabe que programa ou pessoa vai abrir o arquivo**: JPG para fotos e PNG para todo o resto.

O restante do guia explica o porquê e mostra quanto o tamanho do arquivo muda em cada caso.

## O que diferencia cada formato

**JPG** (ou JPEG) usa compressão com perda: descarta detalhes que o olho mal percebe e consegue arquivos pequenos a partir de fotos. É o formato mais compatível que existe, mas não aceita transparência e, em bordas nítidas como letras ou linhas finas, a compressão deixa pequenos borrões. Cada vez que você salva um JPG de novo, ele perde mais um pouco de qualidade.

**PNG** não perde nada: a imagem que sai é exatamente a que entrou, pixel por pixel. Aceita transparência e mantém as bordas nítidas, por isso é o formato natural para capturas de tela e logotipos. O preço é o tamanho: com fotos, um PNG fica enorme.

**WebP** é um formato mais moderno, que pode comprimir com ou sem perda e aceita transparência. Com fotos, fica um pouco menor que um JPG de qualidade parecida, e todos os navegadores atuais o abrem. Alguns programas de computador e alguns sites ainda não o aceitam.

**AVIF** é o mais novo dos quatro. Comprime bem melhor que JPG e WebP, aceita transparência e os navegadores atuais o abrem, mas demora mais para ser gerado e menos programas e formulários o aceitam.

## O que medimos com uma foto

Pegamos uma foto da NASA em domínio público, ajustamos para o tamanho de uma foto de celular (12 megapixels, 3024 × 4032) e salvamos como um JPG de 2,4 MB. Depois convertemos com o nosso conversor (o mesmo do [JPG para AVIF](conv:jpg-avif)) para cada formato, na qualidade padrão (82 de 100):

| Formato | Tamanho | Comparado ao JPG |
| --- | --- | --- |
| JPG | 822 KB | — |
| WebP | 763 KB | 7% menor |
| AVIF | 329 KB | 60% menor |
| PNG | 23,4 MB | 28 vezes maior |

Olhando a foto inteira na tela, não dá para notar diferença. Com zoom de 100%, o AVIF suaviza alguns detalhes finos nas áreas escuras (a folhagem, nesta foto); o JPG e o WebP os preservam um pouco melhor. Para uma foto que vai ser vista no celular ou numa página da web, essa diferença não importa; para uma foto que você vai recortar ou imprimir em tamanho grande, importa.

O PNG é o exemplo do que não fazer: ele guarda cada pixel sem perda, inclusive o ruído natural da foto, e acaba maior do que o JPG de onde partiu.

Também cronometramos num computador de mesa: o JPG e o WebP levaram cerca de 3 segundos, e o AVIF, 7,5. No celular tudo demora mais, e com AVIF dá para sentir.

## O que medimos com uma captura de tela

Com uma captura de tela do nosso site (texto, ícones e fundos lisos, 2560 × 1600 pixels), o resultado se inverte. O PNG gerado pelo navegador tinha 363 KB; convertido para JPG ficou com 184 KB, para WebP com 117 KB e para AVIF com 68 KB.

Os formatos com perda ficam menores, mas numa captura de tela as bordas das letras são justamente o que a compressão com perda mais maltrata: dê zoom e você verá halos em volta do texto. Então, se a captura serve para documentar algo, para um tutorial ou para alguém ler o que está escrito, mantenha em PNG. Se é para um site em que o tamanho importa, o WebP é um bom meio-termo.

## Transparência: quando o formato decide por você

Se a imagem tem fundo transparente, como um logotipo que vai sobre outra cor, uma assinatura recortada ou uma imagem da qual você [removeu o fundo](tool:remove-background), **não salve em JPG**. O JPG não tem transparência: o nosso conversor preenche o fundo de branco e, se depois você colocar a imagem sobre um fundo escuro, aparece um quadrado branco.

Para transparência, use PNG se a imagem vai para um documento ou outro programa, e WebP ou AVIF se vai para uma página da web.

## Compatibilidade: quem abre cada formato

- **JPG e PNG**: qualquer computador, celular, programa, impressora, rede social ou formulário.
- **WebP**: todos os navegadores atuais e a maioria das redes sociais. Alguns programas de edição mais antigos e alguns formulários on-line não aceitam.
- **AVIF**: navegadores atuais. Muitos programas e formulários ainda não o reconhecem.

Uma regra prática: se o arquivo vai sair das suas mãos (você manda por e-mail, outra pessoa vai anexar num formulário, uma gráfica vai imprimir), use JPG ou PNG. Os formatos novos brilham quando você controla onde eles serão exibidos, como no seu próprio site.

## Como converter entre formatos

1. Abra o conversor (por exemplo, [JPG para WebP](conv:jpg-webp) ou [PNG para JPG](conv:png-jpg)) e arraste uma ou mais imagens.
2. Escolha o formato de saída.
3. Se quiser, abra **Opções** para ajustar a qualidade ou reduzir a imagem. Menos qualidade significa um arquivo mais leve.
4. Clique em **Converter** e baixe cada imagem, ou todas juntas em um ZIP.

![O conversor de imagens com uma foto pronta para converter](shot:formatos-convertir "As imagens são convertidas no seu navegador: nunca são enviadas a um servidor.")

A conversão acontece no seu próprio navegador, então as fotos não saem do seu aparelho. Você pode converter até 50 imagens de uma vez.

## Se o que você quer é um arquivo menor

Mudar de formato é uma forma de reduzir o tamanho, mas não a única. Se um formulário pede uma foto de menos de 200 KB, o [Comprimir imagem](tool:compress-image) permite definir exatamente esse tamanho: ele encontra a melhor qualidade que cabe nele e, se isso não bastar, reduz a imagem. Você também pode [redimensionar](tool:resize-image) a imagem em pixels: uma foto de 12 megapixels é muito mais do que o necessário para ver numa tela, e reduzi-la para 2000 pixels de largura diminui o tamanho mais do que qualquer troca de formato.

Se as suas fotos vêm de um iPhone no formato HEIC, primeiro é preciso convertê-las para JPG, que é o que quase todo formulário aceita. O guia [Como converter fotos HEIC do iPhone para JPG](guide:heic-to-jpg) explica como.

## Resumo

- Uma foto que pode ir para qualquer lugar: **JPG**.
- Captura de tela, logotipo, gráfico ou transparência: **PNG**.
- O seu próprio site: **WebP**, ou **AVIF** para o menor tamanho.
- Nunca salve uma foto em PNG nem um logotipo transparente em JPG.
- Para um tamanho de arquivo exato, use o Comprimir imagem em vez de testar formatos.
`;

export default body;
