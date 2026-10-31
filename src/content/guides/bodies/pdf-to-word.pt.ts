const body = `
Converter um PDF em Word serve para uma coisa bem específica: **voltar a editar o texto** quando você não tem o arquivo original. Um contrato que mandaram em PDF e que você precisa corrigir, um currículo antigo, uma apostila que você quer reescrever. O que nenhum conversor consegue prometer é um Word idêntico ao PDF: o PDF não guarda parágrafos nem tabelas, só letras desenhadas em posições fixas da página, e o conversor precisa deduzir como era o documento.

Este guia mostra como fazer isso com o nosso conversor, o que se mantém e o que não, e qual ferramenta usar nos três casos em que a conversão direta não basta: PDFs digitalizados, tabelas e imagens.

## Antes de começar: o seu PDF tem texto?

Abra o PDF e tente selecionar uma palavra com o mouse (ou mantenha o dedo pressionado sobre ela no celular). Há duas possibilidades:

- **A palavra fica selecionada**: o PDF tem texto digital. É o normal em PDFs gerados pelo Word, por um sistema de emissão de notas ou pelo banco. A conversão para Word funciona direto.
- **Fica selecionado um retângulo, ou nada**: o PDF é uma imagem, como uma digitalização ou uma foto salva em PDF. Não há letras para levar ao Word, só pixels. Nesse caso, pule para a seção sobre PDFs digitalizados.

Esse teste de dez segundos evita a frustração mais comum: um Word vazio ou uma mensagem de erro.

## Como converter PDF em Word, passo a passo

1. Abra [PDF para Word](conv:pdf-docx) e arraste o PDF para a área indicada, ou toque nela para escolher o arquivo no seu aparelho.
2. Confira se **Word** está escolhido em “Converter para”.
3. Clique em **Converter** e espere alguns segundos.
4. Baixe o arquivo .docx pelo botão e abra no Word, no LibreOffice Writer, no Google Docs ou no Pages.

![O conversor com um PDF pronto para virar Word](shot:pdf-a-word-convertir "Com o PDF escolhido, o formato de saída é Word: é só clicar em Converter.")

Você pode converter até 5 PDFs de uma vez, de até 15 MB cada. Diferente da maioria das nossas ferramentas, esta conversão **é feita no nosso servidor**: o arquivo viaja criptografado, é convertido e apagado automaticamente em até uma hora. Se o documento for muito sigiloso, leve isso em conta antes de enviá-lo.

## O que se mantém e o que não

O nosso conversor lê o texto do PDF com sua posição e seu tamanho e o reconstrói como um documento comum do Word:

- **Mantém**: todo o texto, de cima para baixo; os parágrafos (as linhas são unidas em parágrafos mesmo quando o PDF as quebra); os títulos (linhas com letra maior viram títulos do Word, com o estilo correspondente); o tamanho aproximado da fonte; as quebras de página (cada página do PDF começa uma página nova no Word); e o tamanho do papel.
- **Pode mudar ou ficar de fora**: colunas (num texto em duas colunas, as linhas que estão na mesma altura se juntam, então vale revisar); tabelas (as células viram linhas de texto); imagens; cores; as fontes exatas; e cabeçalhos ou rodapés, que entram como texto normal em cada página.

![O PDF já convertido, com o botão para baixar o documento do Word](shot:pdf-a-word-resultado "Ao terminar, aparece o botão para baixar o .docx. O aviso acima resume o que se mantém.")

O resultado é um documento **limpo e fácil de editar**, não uma cópia visual do PDF. Para corrigir um texto, reescrever trechos ou reaproveitar parágrafos, é exatamente o que você precisa: nada de brigar com caixas de texto sobrepostas ou com quebras de linha no meio de cada frase.

## Se o PDF for digitalizado

Um PDF digitalizado não tem texto, então o conversor mostra um aviso em vez de entregar um Word vazio. Primeiro é preciso reconhecer as letras da imagem, o chamado OCR:

1. Abra [OCR de PDF digitalizado](tool:ocr-pdf), escolha o PDF e o **idioma em que ele está escrito** (isso importa: com o idioma errado, acentos e letras como ç e ã se confundem).
2. Baixe o PDF que a ferramenta devolve. Ele parece igual ao original, mas agora tem uma camada de texto invisível sobre cada palavra.
3. Passe esse PDF novo pelo [PDF para Word](conv:pdf-docx).

O OCR roda no seu navegador, sem enviar a digitalização, e pode levar alguns segundos por página. A precisão depende da qualidade da imagem: com uma folha bem iluminada e reta quase não há erros; com uma foto torta ou borrada, aparecem letras trocadas. Se você só precisa do texto para colar em outro lugar, o OCR também pode entregar direto um arquivo .txt, e você nem passa pelo Word.

Se o documento for uma foto tirada com o celular, passe-a antes pelo [Escanear documento](tool:scan-document): ele corrige a perspectiva e deixa o papel branco, o que melhora muito o reconhecimento.

## Se o que você precisa são as tabelas

Se o PDF é um extrato bancário, uma tabela de preços ou um relatório cheio de números, quase sempre o que você quer é uma planilha, não um Word. Nesse caso, use o [PDF para Excel](tool:pdf-to-excel): ele monta linhas e colunas pelo alinhamento do texto, transforma valores como 1.234,56 em números de verdade, que você pode somar, e mostra a tabela detectada antes de baixar. Depois, dá para copiar a tabela do Excel e colar no Word, onde ela vira uma tabela editável.

O guia [Como passar uma tabela de PDF para o Excel](guide:pdf-table-to-excel) explica esse caminho em detalhes.

## Se você precisa das imagens

Fotos e logotipos do PDF não vão para o Word. Para recuperá-los, o [Extrair imagens de um PDF](tool:extract-pdf-images) entrega cada imagem na resolução original, sem perda de qualidade, e você as insere no Word onde precisar. Se o que você quer é uma página inteira como imagem (por exemplo, uma planta ou um gráfico desenhado em vetor), use o [PDF para JPG](conv:pdf-jpg).

## Quando não é preciso converter o PDF em Word

Muitas vezes a conversão é um desvio. Antes de converter, pense no que você realmente precisa fazer:

- **Preencher um formulário**: se o PDF tem campos, o [Preencher formulário PDF](tool:fill-pdf-form) mostra esses campos como um formulário comum. Se é um formulário sem campos (só linhas para escrever), o [Editar PDF](tool:edit-pdf) permite digitar em cima da página.
- **Trocar uma palavra ou uma data**: no Editar PDF você pode cobrir o texto antigo com um retângulo branco e digitar o novo por cima, sem mexer no resto do layout. Atenção: cobrir não apaga. O texto de baixo continua no arquivo, a não ser que você marque “Ocultar de verdade”.
- **Copiar um parágrafo**: o [PDF para texto](tool:pdf-to-text) entrega todo o texto em um .txt, sem passar pelo Word.
- **Assinar**: não precisa imprimir nem converter; o [Assinar PDF](tool:sign-pdf) coloca sua assinatura direto no arquivo.

## Depois de editar: de volta ao PDF

Quando terminar de corrigir o documento no Word, o normal é enviá-lo de novo em PDF, para que fique igual em qualquer aparelho. Você pode usar a opção de salvar como PDF do próprio Word ou passar o .docx pelo [Word para PDF](conv:docx-pdf). Se o resultado ficar pesado demais para mandar por e-mail, o guia [Como diminuir o tamanho de um PDF](guide:reduce-pdf-size) explica o que fazer.

## Resumo

- Primeiro, confira se o PDF tem texto selecionável.
- Com texto: o [PDF para Word](conv:pdf-docx) gera um documento editável com parágrafos, títulos e quebras de página; colunas, tabelas e imagens podem mudar.
- Digitalizado: primeiro o [OCR de PDF digitalizado](tool:ocr-pdf), depois o PDF para Word.
- Tabelas: [PDF para Excel](tool:pdf-to-excel). Imagens: [Extrair imagens de um PDF](tool:extract-pdf-images).
- Se você só precisa preencher, corrigir uma linha ou assinar, edite o PDF direto e evite a conversão.
`;

export default body;
