const body = `
Um arquivo CSV parece uma planilha, abre no Excel e tem linhas e colunas. Mas ele não é um arquivo do Excel, e muitas das surpresas que ele traz (“ficou tudo numa coluna só”, “os nomes com acento aparecem com símbolos estranhos”, “sumiram os zeros à esquerda dos meus códigos”) vêm dessa diferença. Este guia explica o que é cada formato, quando usar um ou outro e como abrir um CSV sem estragar os dados.

## O que é um CSV e o que é um arquivo do Excel

Um **CSV** (do inglês *comma-separated values*, “valores separados por vírgula”) é um arquivo de texto puro. Cada linha é uma linha da tabela, e os valores de cada linha são separados por um caractere, normalmente uma vírgula. Se você abrir no Bloco de Notas, verá algo assim:

\`\`\`
Cliente,Cidade,Valor
Conceição,São Paulo,1250.50
Araújo,Florianópolis,980
\`\`\`

Um arquivo do **Excel** (XLSX, ou XLS nas versões antigas) é um formato muito mais rico: pode ter várias planilhas, fórmulas, formatos de número e de data, cores, largura de colunas, gráficos e filtros.

| | CSV | Excel (XLSX) |
| --- | --- | --- |
| Planilhas | Uma única tabela | Várias planilhas |
| Fórmulas | Não: só valores | Sim |
| Formatação (cores, larguras, negrito) | Não | Sim |
| Tipos de dados | Tudo é texto; quem interpreta é o programa que abre | Números, datas e textos são guardados como tais |
| Quem abre | Qualquer programa, banco de dados ou linguagem de programação | Excel, LibreOffice, Planilhas Google, Numbers |

## Quando usar cada um

Use **CSV** quando os dados vão para outro sistema: importar contatos, subir um catálogo numa loja virtual, carregar dados num banco de dados ou num sistema de contabilidade. Ele é o formato universal de troca justamente por ser simples.

Use **Excel** quando uma pessoa vai trabalhar com os dados: ler, calcular, filtrar, compartilhar um relatório. E sempre que o arquivo tiver várias planilhas, fórmulas ou formatação que você quer manter.

## Os três problemas típicos ao abrir um CSV no Excel

### 1. Tudo fica numa coluna só

O separador do CSV não é o que o seu Excel espera. Nos países em que a vírgula é o separador decimal, como o Brasil e a maior parte da Europa e da América Latina, o Excel usa por padrão o **ponto e vírgula** para separar os valores. Entregue a ele um CSV separado por vírgulas e ele coloca cada linha inteira na coluna A. O contrário também acontece: um CSV separado por ponto e vírgula aberto num Excel em inglês.

### 2. Os acentos aparecem errados

Se “Conceição” aparece como “ConceiÃ§Ã£o” ou “São Paulo” como “SÃ£o Paulo”, o problema é a codificação. A maioria dos sistemas atuais salva os CSVs em UTF-8, mas o Excel no Windows, se o arquivo não avisar, lê como se estivesse na codificação antiga do Windows, e cada letra acentuada vira dois símbolos. O mesmo vale para qualquer caractere fora do alfabeto inglês: ç, ã, ü, caracteres chineses e assim por diante.

A forma de avisar é uma marca invisível no começo do arquivo, chamada **BOM**. Com ela, o Excel mostra corretamente acentos, ç e outros alfabetos.

### 3. Zeros ou dígitos somem, ou os valores mudam

O Excel interpreta cada valor ao abrir um CSV, e às vezes erra:

- **Códigos com zeros à esquerda** (007, um CEP escrito sem hífen, como 01310100) perdem os zeros porque o Excel os trata como números.
- **Números longos**, como o de um cartão, de uma conta ou de um documento com mais de 15 dígitos, são arredondados ou aparecem em notação científica: o Excel só guarda 15 dígitos significativos.
- Alguns valores viram **datas** sem você pedir: um “1-2” pode acabar como 1º de fevereiro ou 2 de janeiro.

O mais grave é que, se depois você salvar o arquivo pelo Excel, essas mudanças ficam gravadas e o dado original se perde.

## Como abrir um CSV sem estragá-lo

### Opção 1: converter para Excel antes de abrir

O [CSV para Excel](tool:csv-to-excel) lê o CSV no seu navegador e gera um XLSX que o Excel abre corretamente:

- Detecta sozinho o separador (vírgula, ponto e vírgula, tabulação ou barra vertical) e a codificação, inclusive a codificação do Windows usada pelos CSVs salvos pelo Excel.
- Transforma os valores numéricos em números de verdade, inclusive os que têm vírgula decimal num CSV separado por ponto e vírgula.
- Mantém como texto os códigos com zeros à esquerda e os números com mais de 15 dígitos, para que não se percam.
- Deixa as datas como vieram, em texto, para que não sejam mal interpretadas.

É a opção mais segura se você recebeu o CSV de um banco, de uma loja virtual ou de um sistema de emissão de notas e só quer ver e trabalhar com os dados.

### Opção 2: importar pelo Excel

Nas versões atuais do Excel, em vez de abrir o CSV com dois cliques, vá até a guia **Dados** e use **De Texto/CSV** (fica no grupo para obter dados; o nome exato do caminho varia um pouco entre versões). Abre uma janela em que você escolhe a origem do arquivo (65001: Unicode UTF-8) e o delimitador, e vê uma prévia antes de carregar. Se uma coluna tiver códigos com zeros à esquerda, você pode marcá-la como texto na opção de transformar os dados.

### Opção 3: Planilhas Google ou LibreOffice

O Planilhas Google lê corretamente os CSVs em UTF-8 e permite escolher o separador ao importar. O LibreOffice Calc mostra uma janela com a codificação, o separador e o tipo de cada coluna antes de abrir o arquivo.

## Como salvar um CSV que abra direito no Excel

Se é você quem está criando o CSV para outra pessoa abrir no Excel, o [Excel para CSV](tool:excel-to-csv) deixa você escolher:

1. Escolha o arquivo do Excel. Se ele tiver várias planilhas, escolha qual converter, ou todas (um CSV por planilha).
2. Em **Separador do CSV**, escolha **Ponto e vírgula** se quem vai receber tem o Excel em português, como é comum no Brasil; **Vírgula** se a pessoa usa o Excel em inglês ou se o CSV vai para outro sistema.
3. Deixe marcado **UTF-8 com BOM**.
4. Clique em **Converter para CSV** e baixe o arquivo.

![Opções do Excel para CSV: planilha, separador e UTF-8 com BOM](shot:excel-csv-opciones "Com ponto e vírgula e o BOM, o CSV abre com dois cliques no Excel em português, cada valor na sua coluna e os acentos intactos.")

Os números saem com todas as casas decimais (não arredondados como aparecem na tela) e os códigos com zeros à esquerda são mantidos. A conversão acontece no seu navegador, sem enviar o arquivo.

Um detalhe: se o CSV vai para um sistema, e não para uma pessoa, confira o que esse sistema espera. Alguns programas não esperam o BOM e o tratam como parte do nome da primeira coluna; nesse caso, desmarque a opção.

## Outras conversões úteis

- [Excel para JSON](tool:excel-to-json) e [JSON para Excel](tool:json-to-excel), para dados que vão para uma aplicação web ou vêm dela.
- [Juntar Excel](tool:merge-excel), para combinar vários CSVs ou planilhas numa única pasta de trabalho.
- [PDF para Excel](tool:pdf-to-excel), se a tabela chegou em PDF. O guia [Como passar uma tabela de PDF para o Excel](guide:pdf-table-to-excel) explica como conferir o resultado.

## Resumo

- CSV é texto puro para trocar dados; Excel é uma planilha com abas, fórmulas e formatação.
- Se tudo cai numa coluna, o problema é o separador; se os acentos saem errados, é a codificação (falta o BOM).
- Abrir um CSV com dois cliques pode tirar zeros e arredondar números longos: converta antes com o [CSV para Excel](tool:csv-to-excel) ou importe pela guia **Dados**, com **De Texto/CSV**.
- Para criar um CSV que abra direito no Excel: o separador que combina com o Excel de quem recebe (no Brasil, ponto e vírgula) e UTF-8 com BOM.
`;

export default body;
