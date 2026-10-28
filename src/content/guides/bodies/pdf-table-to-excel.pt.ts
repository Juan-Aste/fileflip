const body = `
Um extrato bancário, a tabela de preços de um fornecedor, o relatório que alguém mandou: muitas tabelas chegam em PDF, e para somar, filtrar ou ordenar os dados você precisa delas numa planilha. Copiar e colar do leitor de PDF quase nunca funciona bem: tudo cai numa coluna só, ou os números entram como texto e o Excel não soma. Este guia mostra como fazer isso com o [PDF para Excel](tool:pdf-to-excel), como conferir o resultado e o que fazer quando o PDF é digitalizado.

## Por que copiar e colar não basta

O PDF não guarda tabelas. Ele guarda pedaços soltos de texto com sua posição na página: “84,35” está a tantos milímetros da margem, “Supermercado” um pouco mais à esquerda. As linhas que você vê como bordas das células são desenhos sem nenhuma relação com o texto. Quando você copia, o leitor de PDF entrega o texto numa ordem qualquer, e a estrutura de linhas e colunas se perde.

A nossa ferramenta reconstrói a tabela a partir dessas posições: forma as linhas com o texto que está na mesma altura e as colunas pelo alinhamento, do jeito que uma pessoa faria olhando a página.

## Antes de começar: confira se o PDF tem texto

Abra o PDF e tente selecionar um número com o mouse. Se ele ficar selecionado, o PDF tem texto e a ferramenta vai funcionar: é o normal em PDFs gerados pelo banco, por um sistema de emissão de notas ou por programas como Excel ou Word.

Se, em vez disso, a página inteira for selecionada como uma imagem, o PDF é uma digitalização ou uma foto. Continue lendo: mais abaixo explicamos o que fazer nesse caso.

## Como passar uma tabela de PDF para o Excel, passo a passo

1. Abra o [PDF para Excel](tool:pdf-to-excel) e escolha o PDF.
2. Espere alguns segundos: a ferramenta procura as tabelas e informa quantas encontrou.
3. Confira a **Pré-visualização**. Se houver várias tabelas, escolha na lista para vê-las uma por uma.
4. Escolha o formato: **Excel (XLSX)** ou **CSV**.
5. Escolha como distribuir as tabelas em **Planilhas**: uma planilha por página, uma por tabela ou tudo em uma planilha.
6. Clique em **Converter para Excel** e baixe o arquivo.

![Pré-visualização de uma tabela detectada no PDF de um extrato](shot:pdf-excel-vista-previa "A ferramenta encontrou duas tabelas num extrato de duas páginas e mostra a primeira antes do download.")

Tudo acontece no seu navegador: o PDF nunca é enviado a um servidor, o que importa quando se trata de extratos e notas fiscais. São aceitos PDFs de até 100 MB.

## Confira a pré-visualização antes de baixar

A pré-visualização é o passo mais importante. Como as colunas são deduzidas pelo alinhamento, há casos em que o resultado merece uma olhada:

- **Células com texto em duas linhas**: uma descrição longa quebrada em duas linhas pode virar duas linhas da tabela. Na planilha, basta juntar essas células.
- **Células que ocupam várias colunas**: um título que atravessa a tabela inteira pode ir parar numa única célula à esquerda.
- **Colunas muito próximas**: se duas colunas quase se encostam no PDF, os valores delas podem cair na mesma célula.

Na captura acima, o extrato de exemplo saiu perfeito: data, descrição, débito e crédito cada um na sua coluna, e as células vazias (um lançamento tem débito, mas não crédito) ficaram vazias, sem deslocar os valores.

## Números de verdade, com ponto ou vírgula decimal

O que mais economiza tempo é que os valores saem como números, não como texto: dá para somá-los com uma fórmula na mesma hora.

A ferramenta detecta, tabela por tabela, como os números estão escritos:

- Com **vírgula decimal**, como no Brasil, em Portugal, na maior parte da América Latina e em boa parte da Europa: 1.234,56.
- Com **ponto decimal**, como nos Estados Unidos, no Reino Unido ou no México: 1,234.56.
- Com **espaço como separador de milhar**, como na França: 1 250,5.

Se a detecção errar (pode acontecer em tabelas com poucos números, em que um valor como 1,250 pode ser mil duzentos e cinquenta ou um vírgula vinte e cinco), escolha você mesmo o separador em **Separador decimal dos números**.

Alguns dados ficam de propósito como texto: códigos com zeros à esquerda (como 007, para não perder os zeros), datas, porcentagens e valores com o símbolo da moeda grudado, como R$ 1.234,56. Eles aparecem exatamente como no PDF e, se você precisar deles como números ou datas, o Excel os converte com **Dados → Texto para Colunas**.

## Uma planilha por página, por tabela ou tudo junto

- **Uma planilha por página** é a opção mais natural para um documento curto ou quando cada página trata de uma coisa diferente.
- **Uma planilha por tabela** é útil quando uma página tem várias tabelas separadas, como um resumo e um detalhamento.
- **Tudo em uma planilha** é a melhor opção para um extrato de várias páginas: todos os lançamentos ficam um embaixo do outro, com uma linha vazia entre uma tabela e a seguinte. Se o cabeçalho se repete em cada página, ele aparece várias vezes: apague essas linhas e as vazias, e você poderá ordenar ou filtrar tudo de uma vez.

Se você escolher CSV, cada planilha vira um arquivo CSV separado. Para abrir esses arquivos no Excel sem problemas com acentos, deixe marcado **UTF-8 com BOM**; o guia [CSV ou Excel: diferenças e como abrir um CSV sem estragar os acentos](guide:csv-vs-excel) explica por quê.

## Se o PDF for digitalizado

Um PDF digitalizado não tem texto, só uma imagem de cada página, então a ferramenta avisa que não consegue detectar tabelas. O caminho é:

1. Passe o PDF pelo [OCR de PDF digitalizado](tool:ocr-pdf), escolhendo o idioma do documento. O OCR reconhece as letras e adiciona uma camada de texto invisível.
2. Use o PDF que ele devolve no [PDF para Excel](tool:pdf-to-excel).

Funciona, mas com um alerta importante: **o OCR pode ler caracteres errado**, e numa tabela de números isso é grave (um 8 lido como 3, uma vírgula decimal que some). Compare os números da pré-visualização com o original, principalmente os totais. Com digitalizações nítidas e retas há poucos erros; com fotos tortas ou borradas, muitos. Se o documento é uma foto tirada com o celular, passe-a antes pelo [Escanear documento](tool:scan-document) para endireitar a página e limpar o fundo.

## Depois: trabalhando com a planilha

Com os dados no Excel, você pode ordenar, filtrar, somar ou montar uma tabela dinâmica. Algumas ferramentas que podem ajudar em seguida:

- [Juntar Excel](tool:merge-excel), se você converteu vários extratos (um por mês) e quer todos os lançamentos num único arquivo, um embaixo do outro.
- [Excel para CSV](tool:excel-to-csv), se você precisa carregar os dados em outro sistema que pede CSV.
- [PDF para Word](conv:pdf-docx), se além da tabela você precisa do texto do documento para editar.

## Resumo

- O PDF não guarda tabelas: elas precisam ser reconstruídas a partir da posição do texto.
- O [PDF para Excel](tool:pdf-to-excel) faz isso no seu navegador, com pré-visualização e números de verdade.
- Confira a pré-visualização: células em duas linhas e colunas muito próximas podem precisar de um ajuste.
- Se os números saírem como texto, escolha você mesmo o separador decimal.
- Se o PDF for digitalizado, passe primeiro pelo OCR e confira os números com cuidado.
`;

export default body;
