import type { ConversionContentMap } from "./types";

// Fatos que os textos devem respeitar (revisar se o motor mudar):
// - Documentos de escritório → PDF: LibreOffice (Gotenberg) no nosso servidor;
//   plano gratuito: até 15 MB por arquivo e 5 arquivos por vez.
// - PDF → Word: o texto é extraído com pdf.js e remontado em parágrafos e
//   títulos, uma página do Word por página do PDF, até 300 páginas; sem
//   imagens nem tabelas; um PDF digitalizado dá erro (é preciso passá-lo antes
//   pelo OCR de PDF digitalizado).

export const pt: ConversionContentMap = {
  "pdf>docx": {
    when: [
      "Converter um PDF em Word é útil quando você precisa reaproveitar ou corrigir o texto: atualizar um currículo que você só tem em PDF, citar parágrafos de um relatório, traduzir um documento ou refazer um contrato com alterações. Copiar e colar do leitor de PDF costuma quebrar as linhas em qualquer lugar; aqui o texto já chega unido em parágrafos.",
      "Se você só quer trocar uma palavra, adicionar uma assinatura ou ocultar um dado, não precisa passar pelo Word: é mais rápido usar o Editar PDF e manter o layout original intacto.",
    ],
    differences: [
      "Um PDF foi feito para aparecer igual em qualquer tela e impressora: cada letra tem uma posição fixa na página, e o arquivo não sabe o que é um parágrafo, uma tabela ou uma lista. Já um documento do Word guarda o texto como um fluxo que se reorganiza enquanto você digita.",
      "Por isso, converter de PDF para Word não é “abrir” o PDF, e sim reconstruir o documento: é preciso deduzir quais linhas formam um parágrafo e quais são títulos. Essa reconstrução funciona muito bem com documentos de texto corrido e pior com layouts complexos.",
    ],
    kept: [
      "Todo o texto selecionável, na ordem de leitura.",
      "Os parágrafos unidos (sem quebras no meio da frase) e os títulos marcados como títulos do Word.",
      "O tamanho aproximado da fonte e o tamanho de página do PDF.",
      "Uma quebra de página para cada página do PDF, para facilitar a comparação com o original.",
    ],
    lost: [
      "Imagens, logotipos e gráficos não são incluídos.",
      "Tabelas e colunas viram parágrafos soltos: o texto está lá, mas é preciso formatá-lo de novo.",
      "A fonte exata, as cores e os cabeçalhos ou rodapés repetidos podem mudar.",
    ],
    limits: [
      "Só funciona com PDFs que têm texto. Se o PDF for uma foto ou uma digitalização, não há letras para extrair e a conversão avisa do erro: passe-o primeiro pelo “OCR de PDF digitalizado”, que reconhece o texto, e depois converta para Word.",
      "São convertidas até 300 páginas por arquivo. No plano gratuito, cada arquivo pode ter até 15 MB. PDFs protegidos com senha de abertura precisam ser desbloqueados antes (com “Remover senha de PDF”, se você souber a senha).",
    ],
    steps: [
      "Escolha o PDF (ou arraste-o). Se quiser testar antes, abra o PDF e veja se consegue selecionar o texto com o mouse: se não der, é uma digitalização.",
      "Deixe Word como formato de saída e clique em Converter.",
      "Baixe o .docx e abra-o no Word, no LibreOffice ou no Google Docs.",
      "Revise as tabelas e as listas, que costumam precisar de um ajuste, e insira de novo as imagens de que precisar.",
    ],
    faq: [
      {
        q: "Por que meu PDF não é convertido para Word?",
        a: "Quase sempre é porque o PDF é uma digitalização ou uma foto: ele contém uma imagem da página, não letras. Passe-o pelo “OCR de PDF digitalizado” e converta o resultado. Também falha se o PDF estiver protegido com senha de abertura.",
      },
      {
        q: "O Word fica igual ao PDF?",
        a: "O texto, sim; o layout, nem tanto. Parágrafos e títulos ficam bons, mas tabelas, colunas e imagens não são reconstruídas. Para documentos de texto corrido (cartas, relatórios, contratos), dá para editar o resultado na hora.",
      },
      {
        q: "Posso editar um PDF sem convertê-lo para Word?",
        a: "Sim. Para pequenas alterações (adicionar texto ou uma assinatura, ocultar um dado ou preencher um formulário), use o Editar PDF: o layout original continua intacto e não é preciso converter.",
      },
      {
        q: "Meus documentos ficam armazenados?",
        a: "A conversão de PDF para Word é feita no nosso servidor porque exige mais processamento. O arquivo é enviado criptografado, não é usado para mais nada e é apagado em menos de 1 hora.",
      },
    ],
  },

  "docx>pdf": {
    when: [
      "Converter um Word em PDF é o passo de sempre antes de enviar um currículo, entregar um trabalho da faculdade, enviar um documento para um órgão ou processo, ou mandar um orçamento: o PDF aparece igual em qualquer computador ou celular, mesmo que a outra pessoa não tenha o Word ou use outra versão, e ninguém o altera sem querer.",
      "Também vale a pena quando um site só aceita PDF ou quando você quer imprimir em outro lugar sem que as margens se desloquem.",
    ],
    differences: [
      "Um .docx é um documento editável: o texto se reorganiza conforme as fontes instaladas, o tamanho da página e a versão do programa. Por isso, um mesmo Word pode aparecer diferente em dois computadores.",
      "O PDF fixa cada página exatamente como ela está no momento da conversão, com as fontes incorporadas. Em troca, deixa de ser prático de editar: se depois for preciso mudar algo, o melhor é corrigir o Word e converter de novo.",
    ],
    kept: [
      "O texto com seus estilos, tabelas, imagens, listas, cabeçalhos e rodapés.",
      "Os números de página e as quebras de página do documento.",
      "Os links, que continuam funcionando no PDF.",
      "O tamanho do papel e as margens configurados no Word.",
    ],
    lost: [
      "Os comentários e o controle de alterações não são impressos como na exibição de revisão do Word: aceite ou rejeite as alterações antes de converter para ter certeza do resultado.",
      "Se o documento usar uma fonte pouco comum que não está no servidor, ela é substituída por outra de medidas parecidas, e alguma linha pode mudar de lugar.",
      "Macros e campos que se atualizam sozinhos não são executados: o PDF mostra o último valor salvo.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito, você pode converter até 5 arquivos por vez, de até 15 MB cada.",
      "Documentos protegidos com senha de abertura não podem ser convertidos: remova a senha no Word antes de enviá-lo.",
    ],
    steps: [
      "Salve as últimas alterações no Word e, se usou o controle de alterações, aceite-as ou rejeite-as.",
      "Escolha o arquivo .docx (ou vários) e deixe PDF como formato de saída.",
      "Clique em Converter e baixe o PDF.",
      "Abra-o e confira as quebras de página antes de enviá-lo, principalmente se você usou fontes especiais.",
    ],
    faq: [
      {
        q: "Por que o PDF está com uma fonte diferente da do meu Word?",
        a: "Porque essa fonte não está instalada no servidor e foi substituída por uma parecida. As fontes comuns (como Arial, Times New Roman ou Calibri) têm equivalentes com as mesmas medidas. Se você precisar de uma fonte exata, outra opção é exportar para PDF no seu próprio Word.",
      },
      {
        q: "Dá para editar o PDF de novo?",
        a: "Para pequenas alterações, sim, com o Editar PDF. Para mudanças maiores, é melhor editar o Word original e converter de novo; passar o PDF para Word outra vez perde imagens e tabelas.",
      },
      {
        q: "Posso deixar o PDF mais leve?",
        a: "Sim. Se o documento tiver muitas fotos, passe o PDF pelo Comprimir PDF: ele reduz as imagens e costuma diminuir bastante o tamanho sem que o texto perca qualidade.",
      },
      {
        q: "O que acontece com meu documento depois da conversão?",
        a: "Ele é convertido no nosso servidor por conexão criptografada, não é usado para mais nada e é apagado em menos de 1 hora.",
      },
    ],
  },

  "doc>pdf": {
    when: [
      "Os arquivos .doc são documentos do Word 97 a 2003. Eles ainda aparecem em arquivos antigos de empresas, escolas e escritórios: modelos de contrato, ofícios, formulários que circulam há anos. Convertê-los em PDF é a forma mais simples de compartilhá-los ou arquivá-los sem depender de que a outra pessoa tenha um programa que os abra direito.",
      "Se você ainda vai continuar editando, é melhor abri-lo no Word ou no LibreOffice e salvá-lo como .docx; para enviar ou imprimir, o PDF basta.",
    ],
    differences: [
      "O .doc é um formato binário antigo, anterior ao .docx (que é XML compactado). Os programas atuais o abrem, mas cada um interpreta alguns detalhes do seu jeito, e por isso um .doc antigo pode aparecer um pouco diferente em cada computador.",
      "Ao convertê-lo em PDF, essa aparência fica fixa: o que você vê no PDF é o que qualquer pessoa verá ao abri-lo, em qualquer dispositivo.",
    ],
    kept: [
      "O texto, os estilos, as tabelas, as imagens e os cabeçalhos e rodapés.",
      "A numeração de páginas e o tamanho do papel do documento.",
      "Os acentos e os caracteres especiais.",
    ],
    lost: [
      "Elementos da época, como WordArt, objetos incorporados de outros programas ou desenhos feitos com as ferramentas antigas, podem aparecer diferentes ou como uma imagem estática.",
      "As fontes que não estão no servidor são substituídas por outras de medidas parecidas.",
      "As macros não são executadas.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice, que lê muito bem o formato .doc. No plano gratuito: até 5 arquivos por vez, de até 15 MB cada.",
      "Arquivos .doc protegidos com senha não podem ser convertidos.",
    ],
    steps: [
      "Escolha o arquivo .doc (ou vários de uma vez, por exemplo uma pasta de modelos antigos).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe os PDFs (com vários arquivos, você pode baixar todos juntos em um ZIP).",
    ],
    faq: [
      {
        q: ".doc e .docx são a mesma coisa?",
        a: "Não. O .doc é o formato do Word até 2003, e o .docx é o do Word 2007 em diante. Os dois são convertidos em PDF igualmente bem; o .docx costuma dar um resultado mais fiel em layouts complicados.",
      },
      {
        q: "Meu .doc antigo ficou estranho no PDF. O que eu faço?",
        a: "Se ele tiver WordArt ou objetos incorporados, abra-o no Word ou no LibreOffice, salve como .docx e converta esse arquivo. Confira também se ele não usa fontes muito incomuns.",
      },
      {
        q: "Meus arquivos ficam armazenados?",
        a: "Eles são convertidos no nosso servidor por conexão criptografada e apagados em menos de 1 hora. Não são usados para mais nada.",
      },
    ],
  },

  "xlsx>pdf": {
    when: [
      "Converter um Excel em PDF serve para mandar uma planilha que a outra pessoa só precisa ler: um orçamento, uma tabela de preços, uma escala de horários, um relatório de despesas ou um demonstrativo de pagamento. O PDF não pode ser alterado sem querer, abre em qualquer celular e é impresso igual em qualquer lugar.",
      "Se a outra pessoa precisar trabalhar com os dados (filtrar, somar, copiar), mande o Excel ou um CSV: no PDF os números aparecem, mas já não são uma tabela em que dá para fazer cálculos.",
    ],
    differences: [
      "Uma planilha do Excel não tem páginas: é uma grade que pode ser muito mais larga e comprida do que uma folha de papel, com fórmulas que são recalculadas. O PDF, por outro lado, é organizado em páginas fixas.",
      "Por isso, na conversão, a planilha é dividida em páginas conforme a configuração de impressão salva no arquivo: orientação, área de impressão, margens e a opção de ajustar a uma página de largura. O que você vê na visualização de impressão do Excel é o mais próximo do resultado.",
    ],
    kept: [
      "Os valores como aparecem nas células (o resultado das fórmulas, não a fórmula).",
      "A formatação: bordas, cores de preenchimento, negrito, formatos de número e de data.",
      "Os gráficos e as imagens inseridas.",
      "Todas as abas com conteúdo, uma depois da outra.",
    ],
    lost: [
      "Fórmulas, filtros e tabelas dinâmicas deixam de funcionar: fica uma foto dos valores.",
      "Se a planilha for mais larga do que a página e não estiver configurada para se ajustar, as colunas da direita vão para páginas separadas.",
      "Abas ocultas, comentários e macros não são incluídos.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito, até 5 arquivos por vez, de até 15 MB cada. Planilhas enormes (dezenas de milhares de linhas) podem demorar ou gerar centenas de páginas.",
      "Arquivos protegidos com senha de abertura não podem ser convertidos.",
    ],
    steps: [
      "No Excel, confira a visualização de impressão: escolha paisagem se a tabela for larga e “Ajustar Todas as Colunas em Uma Página” para que ela não seja cortada. Salve o arquivo.",
      "Escolha o .xlsx e deixe PDF como formato de saída.",
      "Clique em Converter e baixe o PDF.",
      "Se alguma coluna foi parar em outra página, ajuste a configuração de impressão no Excel e converta de novo.",
    ],
    faq: [
      {
        q: "Por que minha tabela ficou cortada em várias páginas?",
        a: "Porque a planilha é mais larga do que a folha. No Excel, em Layout da Página, escolha a orientação paisagem e ajuste para 1 página de largura, salve e converta de novo.",
      },
      {
        q: "Posso converter só uma aba?",
        a: "Todas as abas com conteúdo são convertidas. Se você quiser só uma, salve uma cópia do arquivo com essa aba ou escolha depois as páginas que interessam com o Dividir PDF.",
      },
      {
        q: "E se eu precisar do caminho inverso, de PDF para Excel?",
        a: "Use o PDF para Excel: ele detecta as tabelas de um PDF com texto e as passa para células. Funciona melhor com tabelas simples e alinhadas.",
      },
      {
        q: "Minhas planilhas ficam armazenadas?",
        a: "Elas são convertidas no nosso servidor por conexão criptografada e apagadas em menos de 1 hora.",
      },
    ],
  },

  "xls>pdf": {
    when: [
      "O .xls é o formato do Excel até a versão 2003. Muitas empresas ainda têm planilhas históricas, sistemas contábeis antigos que exportam .xls ou modelos que passam de mão em mão há anos. Convertê-las em PDF permite arquivá-las ou enviá-las sem se preocupar com compatibilidade.",
      "Se você ainda vai atualizar os dados, salve a planilha como .xlsx no Excel ou no LibreOffice; para ler, imprimir ou anexar a um documento para um órgão ou processo, o PDF basta.",
    ],
    differences: [
      "O .xls é um formato binário com os limites da sua época: até 65.536 linhas e 256 colunas por aba. O .xlsx moderno tem muito mais capacidade e é mais fácil de ler para os programas atuais.",
      "O PDF não tem fórmulas nem células: é a planilha impressa em páginas, com a configuração de impressão que estiver salva no arquivo.",
    ],
    kept: [
      "Os valores visíveis das células, com seus formatos de número, data e moeda.",
      "Bordas, cores, fontes e gráficos.",
      "Todas as abas com conteúdo.",
    ],
    lost: [
      "As fórmulas e as macros (muito comuns em planilhas antigas) não são executadas: fica o último valor salvo.",
      "As colunas que não cabem na largura da página vão para páginas separadas se a planilha não estiver configurada para se ajustar.",
      "Abas ocultas e comentários não são incluídos.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito: até 5 arquivos por vez e 15 MB por arquivo.",
      "Arquivos com senha de abertura não podem ser convertidos.",
    ],
    steps: [
      "Se puder, abra a planilha e confira a configuração de impressão (orientação e ajuste à página). Se você não tiver o Excel, converta direto e veja o resultado.",
      "Escolha o .xls (ou vários) e deixe PDF como formato de saída.",
      "Clique em Converter e baixe o PDF.",
    ],
    faq: [
      {
        q: "Os valores calculados saem certos se a planilha tiver macros?",
        a: "Sai o último valor que ficou salvo no arquivo. As macros não são executadas durante a conversão; então, se a planilha precisar ser recalculada com uma macro, faça isso no Excel antes de converter.",
      },
      {
        q: "Posso passar o .xls para um formato moderno?",
        a: "Sim: abra-o no Excel ou no LibreOffice Calc e use Salvar como .xlsx. Se você só precisar dos dados, também pode exportá-los para CSV com o Excel para CSV.",
      },
      {
        q: "Meus arquivos ficam armazenados?",
        a: "Eles são convertidos no nosso servidor por conexão criptografada e apagados em menos de 1 hora.",
      },
    ],
  },

  "pptx>pdf": {
    when: [
      "Converter um PowerPoint em PDF é a forma mais segura de compartilhar uma apresentação: para mandar os slides depois de uma aula ou reunião, publicá-los em uma sala de aula virtual ou apresentar em um computador de outra pessoa sem surpresas com fontes ou versões.",
      "O PDF é mais leve do que muitas apresentações, abre em qualquer celular e não deixa ninguém alterar o conteúdo sem querer.",
    ],
    differences: [
      "Uma apresentação .pptx tem slides com animações, transições, vídeos e anotações do orador, e é exibida no modo de apresentação. O PDF é um documento estático: uma página por slide, exatamente como cada um fica no final.",
      "Para apresentar ao vivo com animações, continue usando o PowerPoint; para distribuir ou arquivar, o PDF é mais prático.",
    ],
    kept: [
      "Uma página por slide, com seu design, fundos, imagens, gráficos e tabelas.",
      "O texto, que continua selecionável e pesquisável.",
      "Os links para sites.",
    ],
    lost: [
      "Animações e transições: cada slide aparece no estado final.",
      "Vídeos e áudios incorporados: fica a imagem de capa, e eles não são reproduzidos.",
      "As anotações do orador não são incluídas.",
      "Fontes pouco comuns que não estão no servidor são substituídas por outras parecidas, e alguma caixa de texto pode ficar um pouco diferente.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito, até 15 MB por arquivo e 5 arquivos por vez: se a sua apresentação for maior por causa dos vídeos, remova-os ou compacte-os antes.",
      "Apresentações com senha de abertura não podem ser convertidas.",
    ],
    steps: [
      "Se a apresentação tiver vídeos pesados, remova-os de uma cópia: no PDF eles não vão ser reproduzidos.",
      "Escolha o .pptx e deixe PDF como formato de saída.",
      "Clique em Converter e baixe o PDF.",
      "Revise os slides com fontes especiais; se algo saiu do lugar, experimente uma fonte comum.",
    ],
    faq: [
      {
        q: "As anotações do orador são incluídas?",
        a: "Não: o PDF tem só os slides, um por página. Se você precisar distribuir as anotações, no PowerPoint dá para imprimir o modo de exibição Anotações em PDF.",
      },
      {
        q: "As animações se perdem?",
        a: "Sim. Cada slide fica como aparece no final, com todos os elementos visíveis. Se uma animação escondia algo, isso também vai aparecer.",
      },
      {
        q: "Meu PowerPoint tem mais de 15 MB. O que eu faço?",
        a: "Quase sempre é por causa dos vídeos ou de fotos muito grandes. Remova os vídeos de uma cópia ou, no PowerPoint, use Compactar Imagens; depois converta. Se o PDF também ficar pesado, passe-o pelo Comprimir PDF.",
      },
      {
        q: "Minhas apresentações ficam armazenadas?",
        a: "Elas são convertidas no nosso servidor por conexão criptografada e apagadas em menos de 1 hora.",
      },
    ],
  },

  "ppt>pdf": {
    when: [
      "O .ppt é o formato do PowerPoint até 2003. Ele aparece em apresentações de cursos e treinamentos antigos que ainda circulam por aí. Convertê-las em PDF permite vê-las em qualquer dispositivo, inclusive em celulares que não abrem .ppt, e arquivá-las sem depender de um programa.",
    ],
    differences: [
      "O .ppt é um formato binário antigo; os programas atuais o abrem, mas às vezes com pequenas diferenças no layout, nas fontes ou nos efeitos. O .pptx o substituiu em 2007.",
      "O PDF deixa cada slide fixo como uma página: não há animações nem modo de apresentação, mas ele aparece igual em qualquer lugar.",
    ],
    kept: [
      "Uma página por slide, com textos, imagens, fundos e tabelas.",
      "O texto selecionável.",
    ],
    lost: [
      "Animações, transições, sons e vídeos.",
      "As anotações do orador.",
      "Efeitos e WordArt da época podem aparecer um pouco diferentes; as fontes que não estão no servidor são substituídas por outras parecidas.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito, até 15 MB por arquivo e 5 arquivos por vez.",
      "Arquivos com senha de abertura não podem ser convertidos.",
    ],
    steps: [
      "Escolha o arquivo .ppt (ou vários).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF e confira se os slides com efeitos ficaram bons.",
    ],
    faq: [
      {
        q: "Posso passar um .ppt para .pptx?",
        a: "Sim, abrindo-o no PowerPoint ou no LibreOffice Impress e salvando como .pptx. Para compartilhar, o PDF costuma ser suficiente.",
      },
      {
        q: "Por que um slide ficou diferente no PDF?",
        a: "Arquivos .ppt antigos às vezes usam efeitos ou fontes que hoje são desenhados de outro jeito. Se for importante, abra-o no PowerPoint, troque esse elemento e converta de novo.",
      },
      {
        q: "Meus arquivos ficam armazenados?",
        a: "Eles são convertidos no nosso servidor por conexão criptografada e apagados em menos de 1 hora.",
      },
    ],
  },

  "odt>pdf": {
    when: [
      "O .odt é o formato de texto do LibreOffice e do OpenOffice, usado por muitas equipes da administração pública e da educação. Convertê-lo em PDF é útil para enviar o documento a alguém que usa o Word ou a um site que só aceita PDF.",
    ],
    differences: [
      "O ODT (OpenDocument) é um formato aberto e padronizado para documentos editáveis, como o .docx do Word. O Word consegue abri-lo, mas nem sempre o exibe igual ao LibreOffice. Já o PDF aparece igual em qualquer lugar.",
      "Como a nossa conversão usa justamente o LibreOffice, o ODT é o formato que melhor se converte: o resultado é igual a exportar para PDF no LibreOffice Writer.",
    ],
    kept: [
      "Texto, estilos, tabelas, imagens, notas de rodapé, cabeçalhos e rodapés.",
      "Sumários e numeração de páginas.",
      "Os links.",
    ],
    lost: [
      "Os comentários e as alterações registradas não são impressos como na exibição de revisão: aceite-os ou rejeite-os antes.",
      "As fontes que não estão no servidor são substituídas por outras parecidas.",
    ],
    limits: [
      "A conversão é feita no nosso servidor. No plano gratuito, até 15 MB por arquivo e 5 arquivos por vez.",
      "Documentos com senha não podem ser convertidos.",
    ],
    steps: [
      "Escolha o arquivo .odt (ou vários).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF.",
    ],
    faq: [
      {
        q: "Qual é a diferença em relação a exportar para PDF no LibreOffice?",
        a: "Nenhuma no resultado: usamos o mesmo motor. Esta página é útil quando você não tem o LibreOffice à mão, por exemplo em um celular ou no computador de outra pessoa.",
      },
      {
        q: "Posso converter planilhas ou apresentações do LibreOffice?",
        a: "Sim, os arquivos .ods (planilhas) e .odp (apresentações) também são convertidos em PDF.",
      },
      {
        q: "Meus documentos ficam armazenados?",
        a: "Eles são convertidos no nosso servidor por conexão criptografada e apagados em menos de 1 hora.",
      },
    ],
  },

  "rtf>pdf": {
    when: [
      "O RTF (formato de texto rico) aparece em documentos gerados por sistemas de gestão, programas médicos ou contábeis, e em arquivos salvos com o WordPad ou o TextEdit. Convertê-lo em PDF é a forma de enviá-lo ou arquivá-lo com uma aparência fixa.",
    ],
    differences: [
      "O RTF é um formato de texto com formatação básica (negrito, itálico, fontes, tabelas simples e imagens) que quase qualquer editor de texto consegue abrir. É muito compatível, mas cada programa o interpreta de um jeito um pouco diferente.",
      "O PDF congela essa formatação em páginas, com as fontes incorporadas.",
    ],
    kept: [
      "Texto com negrito, itálico, sublinhado, tamanhos e cores.",
      "Tabelas simples, imagens e alinhamento de parágrafos.",
      "Margens e tamanho da página, se o arquivo os definir.",
    ],
    lost: [
      "Elementos que alguns programas adicionam ao RTF do seu próprio jeito (campos especiais, objetos incorporados) podem não aparecer.",
      "As fontes que não estão no servidor são substituídas por outras parecidas.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito, até 15 MB por arquivo e 5 arquivos por vez.",
    ],
    steps: [
      "Escolha o arquivo .rtf (ou vários).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF.",
    ],
    faq: [
      {
        q: "Dá para abrir o RTF no Word?",
        a: "Sim, o Word, o LibreOffice e o Google Docs abrem esse formato. Convertê-lo em PDF é útil quando você quer que ele apareça sempre igual ou quando um sistema só aceita PDF.",
      },
      {
        q: "Um sistema gera muitos RTFs para mim. Posso converter todos juntos?",
        a: "Sim, escolha vários de uma vez (até 5 por lote no plano gratuito) e baixe-os juntos em um ZIP.",
      },
      {
        q: "Meus arquivos ficam armazenados?",
        a: "Eles são convertidos no nosso servidor por conexão criptografada e apagados em menos de 1 hora.",
      },
    ],
  },

  "txt>pdf": {
    when: [
      "Converter um TXT em PDF serve para entregar anotações, registros, listas ou código como um documento pronto para imprimir ou anexar, com páginas numeradas pelo leitor de PDF e uma aparência que não depende do programa usado para abri-lo.",
    ],
    differences: [
      "Um .txt tem só caracteres e quebras de linha: não guarda fontes, tamanhos nem margens, e cada programa o exibe do seu jeito. O PDF o coloca em páginas com fonte e margens fixas.",
    ],
    kept: [
      "Todo o texto, com suas quebras de linha e linhas em branco.",
      "Os caracteres acentuados e os de outros alfabetos, se o arquivo estiver salvo em UTF-8.",
    ],
    lost: [
      "Não há formatação para manter: o PDF usa uma fonte padrão, e as linhas muito longas são quebradas para caber na largura da página.",
      "As tabulações podem ficar alinhadas de um jeito diferente do seu editor.",
    ],
    limits: [
      "A conversão é feita no nosso servidor com o LibreOffice. No plano gratuito, até 15 MB por arquivo (é muito texto) e 5 arquivos por vez.",
      "Se aparecerem caracteres estranhos no lugar dos acentos, o arquivo não está em UTF-8: abra-o no seu editor, salve com a codificação UTF-8 e converta de novo.",
    ],
    steps: [
      "Escolha o arquivo .txt (ou vários).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF e confira se os acentos aparecem corretamente.",
    ],
    faq: [
      {
        q: "Posso escolher a fonte ou o tamanho da letra?",
        a: "Não nesta conversão. Se você quiser formatar o texto (títulos, negrito, listas), escreva-o em Markdown e use o Markdown para PDF, ou cole-o em um editor de texto.",
      },
      {
        q: "Por que aparecem símbolos estranhos no lugar dos acentos?",
        a: "Porque o arquivo está salvo em uma codificação antiga. Abra-o no Bloco de Notas ou em outro editor, salve como UTF-8 e converta de novo.",
      },
      {
        q: "Meus arquivos ficam armazenados?",
        a: "Eles são convertidos no nosso servidor por conexão criptografada e apagados em menos de 1 hora.",
      },
    ],
  },

  // Fotos e imagens ↔ PDF (19.2b2). Fatos: tudo no navegador; HEIC com libheif
  // (WASM, ~2 MB, baixado na primeira vez), imagem principal, rotação aplicada;
  // ao converter, a imagem é decodificada e codificada de novo, então os
  // metadados (data, GPS, câmera) não passam para o arquivo novo; transparência
  // → fundo branco no JPG; qualidade ajustável (82 por padrão) e tamanho;
  // imagem → PDF: uma página do tamanho da imagem, JPG e PNG sem recompressão;
  // PDF → imagem: 72/150/300 DPI (150 por padrão), uma imagem por página, ZIP
  // se houver várias; PDF com senha: é preciso removê-la antes. Limite por
  // arquivo conforme a memória do dispositivo (100 MB na maioria; menos em
  // celulares com pouca memória).
  "heic>jpg": {
    when: [
      "O iPhone salva as fotos em HEIC há anos. No próprio iPhone e no Mac elas abrem sem problemas, mas muitos formulários na internet, sistemas de órgãos públicos, programas antigos do Windows e alguns apps de Android não as aceitam. Convertê-las para JPG é o jeito mais seguro de garantir que qualquer pessoa ou site consiga abri-las.",
      "Se você só vai guardar as fotos ou vê-las em aparelhos da Apple, não precisa convertê-las: o HEIC ocupa menos espaço com a mesma qualidade.",
    ],
    differences: [
      "O HEIC usa um codec de vídeo moderno (HEVC) para comprimir fotos: com a mesma qualidade visual, ocupa mais ou menos metade do espaço de um JPG. O JPG é de 1992 e é bem menos eficiente, mas abre em absolutamente tudo: navegadores, celulares, impressoras, redes sociais e sistemas de gestão.",
      "Um HEIC também pode guardar coisas que o JPG não tem, como várias imagens no mesmo arquivo ou a profundidade do modo Retrato.",
    ],
    kept: [
      "A foto principal com a resolução completa.",
      "A orientação: uma foto na vertical continua na vertical.",
      "As cores, com uma perda de qualidade imperceptível na qualidade padrão.",
    ],
    lost: [
      "Os metadados (data, localização GPS, modelo da câmera) não passam para o JPG, o que também protege a sua privacidade se você for compartilhar a foto.",
      "As Live Photos viram foto estática; os dados de profundidade do modo Retrato não são mantidos.",
      "O JPG fica maior que o HEIC original, em geral entre 1,5 e 2 vezes.",
    ],
    limits: [
      "A conversão é feita no seu navegador: as fotos não são enviadas para nenhum servidor. Na primeira vez, o decodificador de HEIC (cerca de 2 MB) é baixado e depois fica guardado na memória do navegador.",
      "Você pode converter muitas fotos de uma vez. Em celulares com pouca memória, fotos muito grandes podem demorar mais; se uma falhar, converta-a sozinha.",
    ],
    steps: [
      "Passe as fotos do iPhone para o computador (ou abra-as no próprio celular) e selecione todas juntas.",
      "Deixe JPG como formato de saída. Se quiser arquivos menores, baixe a qualidade para 70–80 ou reduza o tamanho.",
      "Clique em Converter.",
      "Baixe as fotos uma por uma ou todas juntas em um ZIP.",
    ],
    faq: [
      {
        q: "A foto perde qualidade ao passar de HEIC para JPG?",
        a: "Um pouco, porque o JPG também comprime com perda, mas na qualidade padrão isso não se nota a olho nu. Se você for imprimir a foto ou editá-la bastante, aumente a qualidade para 90 ou mais, ou converta para PNG.",
      },
      {
        q: "Como faço para o iPhone tirar as fotos direto em JPG?",
        a: "Em Ajustes → Câmera → Formatos, escolha “Mais Compatível”. As fotos novas serão salvas em JPG e vão ocupar mais espaço; as que você já tem em HEIC podem ser convertidas aqui.",
      },
      {
        q: "A localização da foto é mantida?",
        a: "Não: o JPG novo não leva a data, o GPS nem os dados da câmera. Isso é útil para compartilhar fotos sem revelar onde foram tiradas.",
      },
      {
        q: "Minhas fotos são enviadas para a internet?",
        a: "Não. O HEIC é decodificado e convertido no seu próprio navegador; nenhum servidor recebe as fotos.",
      },
    ],
  },

  "heic>png": {
    when: [
      "Converter HEIC em PNG vale a pena quando você vai editar a foto: recortá-la várias vezes, colocar textos, usá-la em um design ou em uma apresentação. O PNG não perde qualidade a cada vez que é salvo, então é um ponto de partida melhor que um JPG para trabalhar a imagem.",
      "Já para mandar fotos por mensagem ou enviá-las em um formulário, o JPG é a melhor opção: fica bem menor.",
    ],
    differences: [
      "O HEIC é um formato com compressão muito eficiente, pensado para guardar fotos ocupando pouco espaço. O PNG é um formato sem perda: guarda cada pixel exatamente, em troca de arquivos muito maiores, principalmente com fotos.",
      "O PNG também aceita transparência, o que é útil se depois você for recortar a pessoa ou o objeto da foto.",
    ],
    kept: [
      "A foto principal na resolução completa, pixel por pixel, exatamente como sai da decodificação do HEIC.",
      "A orientação da foto.",
      "A qualidade: o PNG não acrescenta compressão com perda.",
    ],
    lost: [
      "O arquivo cresce muito: uma foto de 2 MB em HEIC pode passar de 15 MB em PNG.",
      "Os metadados (data, localização, câmera) não são copiados.",
      "As Live Photos viram foto estática.",
    ],
    limits: [
      "Tudo é feito no seu navegador, sem enviar as fotos. Na primeira vez, o decodificador de HEIC (cerca de 2 MB) é baixado.",
      "Como os PNGs de fotos são pesados, em celulares com pouca memória é melhor converter poucas fotos por vez.",
    ],
    steps: [
      "Escolha as fotos HEIC.",
      "Escolha PNG como formato de saída. Se não precisar da resolução completa, reduza o tamanho para o arquivo ficar menor.",
      "Clique em Converter e baixe os PNGs (ou o ZIP).",
    ],
    faq: [
      {
        q: "PNG ou JPG para as fotos do meu iPhone?",
        a: "JPG para compartilhar e guardar (fica bem menor); PNG se você for editar a foto ou precisar que ela não perca nada de qualidade no caminho.",
      },
      {
        q: "Por que o PNG fica tão maior que o HEIC?",
        a: "Porque o PNG não descarta informação: guarda cada pixel do jeito que é. Em desenhos ou capturas de tela isso gera arquivos pequenos, mas em fotos com muitos detalhes os arquivos crescem muito.",
      },
      {
        q: "Posso remover o fundo depois?",
        a: "Sim. Com o PNG, use o Remover fundo de imagem: o resultado mantém a transparência.",
      },
    ],
  },

  "heic>pdf": {
    when: [
      "HEIC para PDF serve quando você fotografou um documento com o iPhone (um RG, um recibo, uma receita médica, um comprovante) e precisa enviá-lo para um site que só aceita PDF.",
      "Se forem várias fotos que formam um só documento, use o Imagens para PDF para juntá-las em um único arquivo, com as páginas na ordem que você escolher. E se quiser que a foto pareça uma digitalização, experimente o Escanear documento.",
    ],
    differences: [
      "Um HEIC é uma foto; um PDF é um documento feito de páginas. Na conversão, a foto é colocada em uma página do mesmo tamanho da imagem, então ela aparece igual, mas agora pode ser anexada onde pedem um PDF.",
    ],
    kept: [
      "A foto inteira, sem margens nem cortes.",
      "A orientação correta.",
      "Boa qualidade: a foto é convertida em um JPG de alta qualidade antes de entrar no PDF.",
    ],
    lost: [
      "O texto da foto não pode ser selecionado nem pesquisado: o PDF contém uma imagem. Para poder pesquisá-lo, passe o arquivo depois pelo “OCR de PDF digitalizado”.",
      "Os metadados da foto não passam para o PDF.",
    ],
    limits: [
      "A conversão é feita no seu navegador: as fotos dos seus documentos não são enviadas para nenhum servidor.",
      "Cada foto vira um PDF próprio, de uma página. Para juntar várias, use o Imagens para PDF.",
    ],
    steps: [
      "Escolha a foto HEIC (ou várias, se quiser um PDF por foto).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF. Se ele for grande demais para o site onde você vai enviá-lo, use o Comprimir PDF.",
    ],
    faq: [
      {
        q: "Como junto várias fotos em um só PDF?",
        a: "Com o Imagens para PDF: você escolhe todas as fotos (HEIC também), coloca na ordem e sai um único PDF com uma página por foto.",
      },
      {
        q: "O site pede um PDF de menos de 1 ou 2 MB. O que eu faço?",
        a: "Passe o PDF pelo Comprimir PDF ou, antes de converter, reduza o tamanho da foto com o Redimensionar imagem. Para um documento, 1.500 a 2.000 pixels no lado maior costumam bastar para que ele fique legível.",
      },
      {
        q: "As fotos dos meus documentos são enviadas para algum lugar?",
        a: "Não. Elas são convertidas no seu navegador e não saem do seu dispositivo.",
      },
    ],
  },

  "webp>jpg": {
    when: [
      "Muitos sites usam imagens em WEBP, então quando você salva uma foto pelo navegador ela costuma ficar com essa extensão. Convertê-la para JPG vale a pena quando um programa de edição antigo, um app, um formulário ou uma impressora não a reconhece.",
      "Se a imagem tiver partes transparentes (um logotipo, um ícone), converta para PNG em vez de JPG, porque o JPG não aceita transparência.",
    ],
    differences: [
      "O WEBP é um formato do Google pensado para a web: com a mesma qualidade, ocupa de 25% a 35% menos que um JPG, além de aceitar transparência e animação. O JPG é mais antigo e menos eficiente, mas é aceito por qualquer programa e aparelho.",
    ],
    kept: [
      "A resolução da imagem.",
      "As cores, com uma perda de qualidade imperceptível na qualidade padrão.",
    ],
    lost: [
      "A transparência: as partes transparentes ficam brancas.",
      "Se o WEBP for animado, só o primeiro quadro é convertido.",
      "O JPG costuma ficar um pouco maior que o WEBP original.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens, e você pode converter muitas de uma vez.",
    ],
    steps: [
      "Escolha os arquivos WEBP (ou arraste-os).",
      "Deixe JPG como formato de saída e, se quiser, ajuste a qualidade ou o tamanho.",
      "Clique em Converter e baixe as imagens (ou o ZIP).",
    ],
    faq: [
      {
        q: "Por que as imagens que eu salvo da internet são WEBP?",
        a: "Porque os sites as disponibilizam nesse formato para carregarem mais rápido. O navegador salva o arquivo do jeito que o recebeu.",
      },
      {
        q: "O que acontece com o fundo transparente?",
        a: "O JPG não aceita transparência, então essas áreas ficam brancas. Se quiser mantê-la, converta o WEBP para PNG.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },

  "webp>png": {
    when: [
      "WEBP para PNG é a conversão certa quando a imagem tem transparência (logotipos, ícones, figurinhas, recortes) e você precisa abri-la em um programa que não lê WEBP, ou quando vai editá-la e não quer perder qualidade a cada vez que salvar.",
    ],
    differences: [
      "Os dois formatos aceitam transparência. O WEBP comprime mais (com ou sem perda) e é ideal para publicar na web; o PNG é sem perda e abre em qualquer editor de imagens, editor de texto ou programa de design.",
      "Uma regra prática: para publicar em um site, WEBP; para editar, imprimir ou inserir em um documento do Word ou em uma apresentação, PNG.",
    ],
    kept: [
      "A transparência, com as bordas suaves.",
      "A resolução e as cores exatamente como aparecem no WEBP.",
    ],
    lost: [
      "Se o WEBP for animado, só o primeiro quadro é convertido.",
      "O PNG costuma ficar bem maior, principalmente se a imagem for uma foto.",
    ],
    limits: ["A conversão é feita no seu navegador, sem enviar as imagens."],
    steps: [
      "Escolha os arquivos WEBP.",
      "Deixe PNG como formato de saída.",
      "Clique em Converter e baixe os PNGs (ou o ZIP).",
    ],
    faq: [
      {
        q: "A imagem perde qualidade ao passar de WEBP para PNG?",
        a: "Não há nenhuma perda adicional: o PNG guarda exatamente os pixels do WEBP. Se o WEBP já tinha perdido qualidade ao ser comprimido, isso não volta.",
      },
      {
        q: "Por que o PNG fica tão grande?",
        a: "Porque ele não descarta informação. Se o arquivo ficar grande demais e você não precisar de transparência, converta para JPG.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu dispositivo.",
      },
    ],
  },

  "avif>jpg": {
    when: [
      "O AVIF está cada vez mais comum em sites e em alguns celulares e câmeras novos. Convertê-lo para JPG resolve quando um programa, uma rede social, um app de mensagens antigo ou um sistema de órgão público ainda não o aceita.",
    ],
    differences: [
      "O AVIF é um formato moderno baseado no codec de vídeo AV1: com a mesma qualidade, ocupa bem menos que um JPG e até menos que um WEBP, e aceita transparência e maior profundidade de cor. O JPG é muito mais antigo, mas é compatível com tudo.",
    ],
    kept: [
      "A resolução da imagem.",
      "As cores, com uma perda imperceptível na qualidade padrão.",
    ],
    lost: [
      "A transparência: fica branca.",
      "As imagens AVIF com alto alcance dinâmico (HDR) aparecem com o alcance normal de um JPG.",
      "O JPG fica maior que o AVIF, às vezes o dobro ou mais.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens. Se o seu navegador não conseguir decodificar AVIF sozinho, é usado um decodificador incluído na página.",
    ],
    steps: [
      "Escolha os arquivos AVIF.",
      "Deixe JPG como formato de saída e ajuste a qualidade, se quiser.",
      "Clique em Converter e baixe as imagens (ou o ZIP).",
    ],
    faq: [
      {
        q: "Quais programas não abrem AVIF?",
        a: "Os navegadores atuais abrem, mas muitos programas de edição, visualizadores de fotos de versões antigas do Windows e sistemas de envio de arquivos ainda não. Por isso o JPG continua sendo a opção segura para compartilhar.",
      },
      {
        q: "AVIF para JPG ou para PNG?",
        a: "JPG se for uma foto e você quiser um arquivo leve; PNG se a imagem tiver transparência ou se você for editá-la.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },

  "avif>png": {
    when: [
      "AVIF para PNG vale a pena quando a imagem tem transparência ou quando você vai editá-la em um programa que ainda não lê AVIF, como muitos editores e programas de design para desktop.",
      "Também serve para guardar uma cópia de trabalho de uma imagem baixada da web: a partir do PNG, você pode recortar, retocar e exportar de novo quantas vezes quiser, sem somar perda de qualidade a cada etapa.",
    ],
    differences: [
      "O AVIF comprime de forma muito eficiente e é pensado para publicar; o PNG guarda a imagem sem perda e é o formato universal para trabalhar com imagens com transparência.",
    ],
    kept: [
      "A transparência.",
      "A resolução e as cores exatamente como aparecem na tela.",
    ],
    lost: [
      "Se o AVIF for HDR ou tiver mais de 8 bits por canal, o PNG é salvo com o alcance e a profundidade normais (8 bits).",
      "Se o AVIF for animado, só o primeiro quadro é convertido.",
      "O arquivo fica bem maior.",
    ],
    limits: ["A conversão é feita no seu navegador, sem enviar as imagens."],
    steps: [
      "Escolha os arquivos AVIF.",
      "Deixe PNG como formato de saída.",
      "Clique em Converter e baixe os PNGs (ou o ZIP).",
    ],
    faq: [
      {
        q: "O fundo transparente é mantido?",
        a: "Sim, o PNG mantém a transparência do AVIF, incluindo as bordas suaves.",
      },
      {
        q: "Por que o PNG fica muito maior que o AVIF?",
        a: "O AVIF é um dos formatos que mais comprimem; o PNG não descarta nada. É normal o PNG ficar várias vezes maior.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu dispositivo.",
      },
    ],
  },

  "jpg>pdf": {
    when: [
      "JPG para PDF serve para enviar a foto de um documento, de um comprovante ou de um desenho para um lugar que só aceita PDF: portais de serviços públicos, ambientes virtuais de aprendizagem, formulários de emprego ou do plano de saúde.",
      "Se você tiver várias fotos que formam um só documento (por exemplo, a frente e o verso do RG), use o Imagens para PDF para juntá-las em um único arquivo.",
    ],
    differences: [
      "Um JPG é uma imagem avulsa; um PDF é um documento com páginas que aparece igual em qualquer lugar e que os sistemas de serviços online aceitam como documento.",
    ],
    kept: [
      "A foto com a qualidade original: o JPG é colocado dentro do PDF sem ser comprimido de novo.",
      "A orientação (se a foto tiver a rotação salva nos dados EXIF, ela é aplicada).",
      "Uma página do tamanho exato da imagem, sem bordas brancas.",
    ],
    lost: [
      "O texto da foto não pode ser selecionado nem pesquisado. Para isso, passe o PDF pelo “OCR de PDF digitalizado”.",
      "Os dados EXIF da foto não aparecem no PDF.",
    ],
    limits: [
      "A conversão é feita no seu navegador: as fotos dos seus documentos não são enviadas.",
      "Cada JPG gera um PDF próprio, de uma página. Para escolher o tamanho A4 ou Carta, definir margens ou juntar várias imagens, use o Imagens para PDF.",
    ],
    steps: [
      "Escolha a foto (ou várias, se quiser um PDF por foto).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF. Se ele ficar grande demais, passe-o pelo Comprimir PDF.",
    ],
    faq: [
      {
        q: "Como coloco várias fotos em um só PDF?",
        a: "Use o Imagens para PDF: você escolhe todas as imagens, arrasta para colocá-las na ordem e sai um único PDF.",
      },
      {
        q: "O PDF fica do tamanho de uma folha A4?",
        a: "Nesta conversão, a página fica do tamanho da foto. Se você precisar de A4 ou Carta com margens (para imprimir), use o Imagens para PDF e escolha o tamanho da página.",
      },
      {
        q: "A foto perde qualidade?",
        a: "Não. O JPG é guardado dentro do PDF do jeito que é, sem ser comprimido de novo.",
      },
    ],
  },

  "png>pdf": {
    when: [
      "PNG para PDF é útil para entregar capturas de tela, diagramas, plantas, infográficos ou documentos digitalizados em PNG em um formato de documento que qualquer pessoa consegue abrir e imprimir.",
    ],
    differences: [
      "O PNG é uma imagem sem perda, ideal para capturas de tela e gráficos com texto nítido. O PDF a envolve em uma página de documento, sem alterar os pixels.",
    ],
    kept: [
      "A imagem sem perda de qualidade: o PNG é guardado dentro do PDF do jeito que é.",
      "O texto e as linhas nítidas das capturas de tela e dos diagramas.",
      "A transparência (o PDF mostra o que está por baixo, que em uma página nova é branco).",
    ],
    lost: [
      "O texto da imagem não pode ser selecionado. Para isso, passe o PDF pelo “OCR de PDF digitalizado”.",
      "Uma foto em PNG gera um PDF pesado; se for uma foto, converta-a antes para JPG ou comprima o PDF.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens.",
      "Cada PNG gera um PDF próprio, de uma página, do tamanho da imagem. Para juntar várias ou escolher A4, use o Imagens para PDF.",
    ],
    steps: [
      "Escolha o PNG (ou vários).",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF.",
    ],
    faq: [
      {
        q: "A captura de tela fica borrada no PDF?",
        a: "Não: o PNG entra no PDF sem recompressão. Se ela parecer pequena na impressão, é porque a página tem o tamanho da imagem; use o Imagens para PDF com tamanho A4 para que ela se ajuste à folha.",
      },
      {
        q: "Posso juntar várias capturas de tela em um PDF?",
        a: "Sim, com o Imagens para PDF.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "pdf>jpg": {
    when: [
      "PDF para JPG serve para publicar uma página de um PDF nas redes sociais, inseri-la como imagem em uma apresentação ou em um documento, mandá-la pelo WhatsApp para que apareça sem precisar abrir nada, ou enviar um comprovante para um site que só aceita imagens.",
    ],
    differences: [
      "Um PDF pode ter texto, vetores e imagens, e fica nítido em qualquer zoom. Um JPG é uma foto da página em uma resolução fixa: mais fácil de compartilhar e ver em qualquer lugar, mas sem texto selecionável nem zoom infinito.",
    ],
    kept: [
      "A aparência de cada página: texto, imagens, cores e layout, exatamente como aparecem em um leitor de PDF.",
      "Todas as páginas: uma imagem por página.",
    ],
    lost: [
      "O texto deixa de ser selecionável e os links param de funcionar.",
      "A nitidez infinita: a imagem tem a resolução que você escolher (72, 150 ou 300 DPI).",
      "As partes transparentes do PDF ficam brancas.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar o PDF.",
      "Com várias páginas, você recebe um ZIP com uma imagem por página. Se o PDF tiver senha de abertura, remova-a antes com o “Remover senha de PDF”.",
    ],
    steps: [
      "Escolha o PDF.",
      "Deixe JPG como formato de saída e escolha a resolução: 150 DPI para tela, 300 DPI se você for imprimir ou precisar ler letras pequenas.",
      "Clique em Converter.",
      "Baixe a imagem ou o ZIP com todas as páginas.",
    ],
    faq: [
      {
        q: "Qual resolução eu escolho?",
        a: "150 DPI basta para ver na tela ou mandar por mensagem. 300 DPI gera imagens maiores e mais nítidas, para imprimir ou para documentos com letras pequenas. 72 DPI gera arquivos bem leves.",
      },
      {
        q: "Posso converter só uma página?",
        a: "Todas as páginas são convertidas. Se você quiser só uma, separe-a antes com o Extrair páginas de um PDF e converta esse arquivo.",
      },
      {
        q: "JPG ou PNG?",
        a: "JPG para páginas com fotos e para os arquivos ficarem leves; PNG para páginas com texto, tabelas ou gráficos, porque as letras ficam mais limpas.",
      },
      {
        q: "E se eu quiser as fotos que estão dentro do PDF?",
        a: "Use o Extrair imagens de um PDF: ele tira as imagens originais, sem a página em volta.",
      },
    ],
  },

  "pdf>png": {
    when: [
      "PDF para PNG vale a pena quando a página tem texto, tabelas, gráficos ou plantas e você vai usá-la como imagem em uma apresentação, um documento, uma wiki ou um site: o PNG mantém as letras e as linhas limpas, sem o “ruído” que o JPG acrescenta em volta das bordas.",
    ],
    differences: [
      "O PDF é um documento de páginas com texto e vetores; o PNG é uma imagem sem perda. Na conversão, cada página é desenhada como imagem na resolução que você escolher.",
    ],
    kept: [
      "A aparência exata de cada página, sem perda de qualidade no que é desenhado.",
      "As letras e as linhas nítidas.",
      "Todas as páginas, uma imagem por página.",
    ],
    lost: [
      "O texto não pode ser selecionado e os links não funcionam.",
      "Páginas com muitas fotos geram PNGs pesados; nesse caso, é melhor usar JPG.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar o PDF.",
      "Com várias páginas, você recebe um ZIP. PDFs com senha de abertura precisam ser desbloqueados antes.",
    ],
    steps: [
      "Escolha o PDF.",
      "Deixe PNG como formato de saída e escolha a resolução (300 DPI para que as letras pequenas fiquem legíveis).",
      "Clique em Converter e baixe a imagem ou o ZIP.",
    ],
    faq: [
      {
        q: "Por que o texto fica melhor em PNG do que em JPG?",
        a: "Porque o JPG comprime com perda e deixa pequenas manchas em volta das bordas bem marcadas, como as das letras. O PNG guarda essas bordas exatamente.",
      },
      {
        q: "O PNG tem fundo transparente?",
        a: "Não: cada página é desenhada sobre fundo branco, como aparece em um leitor de PDF.",
      },
      {
        q: "Meu PDF é enviado?",
        a: "Não, ele é convertido no seu navegador.",
      },
    ],
  },

  // Formatos de imagem comuns, ícones e SVG (19.2b3). Fatos: tudo no navegador;
  // qualidade 82 por padrão em JPG/WEBP/AVIF; ao recodificar, os metadados não
  // passam; transparência → branco no JPG; GIF animado → primeiro quadro; TIFF
  // de várias páginas → só a primeira (TIFF → PDF também); ICO de saída: 16, 32,
  // 48, 64, 128 e 256 px (só os que não ultrapassam a imagem), quadrado
  // centralizado com preenchimento transparente; ICO → PNG: o navegador
  // decodifica o ícone (normalmente pega a imagem maior); SVG: desenhado pelo
  // navegador no tamanho de width/height/viewBox (1024 px se não tiver),
  // ampliá-lo não perde nitidez, não carrega imagens nem fontes externas;
  // SVG → PDF: o SVG é desenhado como imagem PNG dentro do PDF (não fica vetorial).
  "jpg>png": {
    when: [
      "Passar um JPG para PNG vale a pena quando você vai editar a imagem várias vezes (cortar, adicionar texto, retocar) e não quer que cada salvamento acrescente mais perda, ou quando um sistema pede PNG explicitamente, como algumas plataformas de design ou lojas virtuais.",
      "Se o que você quer é um fundo transparente, converter para PNG não basta: o JPG não tem transparência para conservar. Para isso, use o Remover fundo de imagem, que entrega um PNG com o fundo recortado.",
    ],
    differences: [
      "O JPG comprime com perda: descarta detalhes que o olho quase não percebe para que as fotos fiquem leves. O PNG comprime sem perda: guarda cada pixel exatamente e aceita transparência, mas com fotos gera arquivos bem mais pesados.",
      "Converter de JPG para PNG não recupera a qualidade que o JPG já perdeu; só evita perder mais a partir daí.",
    ],
    kept: [
      "A imagem exatamente como aparece no JPG, pixel por pixel.",
      "A resolução e as cores.",
      "A orientação da foto.",
    ],
    lost: [
      "Nada da imagem se perde, mas o arquivo costuma ficar de 3 a 10 vezes maior.",
      "Os metadados EXIF (data, câmera, GPS) não passam para o PNG.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens, e aceita lotes com download em ZIP.",
    ],
    steps: [
      "Escolha os JPGs (ou arraste-os).",
      "Deixe PNG como formato de saída; se você não precisa do tamanho original, reduza a largura para que fiquem mais leves.",
      "Clique em Converter e baixe os PNGs ou o ZIP.",
    ],
    faq: [
      {
        q: "A qualidade melhora ao passar de JPG para PNG?",
        a: "Não. O PNG guarda exatamente o que havia no JPG, incluindo os defeitos de compressão. O que você ganha é que as próximas edições não acrescentam perda.",
      },
      {
        q: "O PNG vai ter fundo transparente?",
        a: "Não, porque o JPG não tem transparência. Para recortar o fundo, use o Remover fundo de imagem.",
      },
      {
        q: "Por que o PNG fica tão mais pesado?",
        a: "Porque ele não descarta informação. Em fotos isso aparece muito; em capturas de tela ou gráficos simples, a diferença é menor.",
      },
    ],
  },

  "png>jpg": {
    when: [
      "PNG para JPG é o jeito mais simples de reduzir fotos e capturas de tela pesadas: para mandar por e-mail, enviar para um formulário com limite de tamanho ou publicar em um site. Uma foto salva como PNG pode cair para um décimo do tamanho em JPG sem diferença visível.",
      "Não vale a pena se a imagem tiver transparência (um logo, um ícone) ou muito texto fino: nesses casos, é melhor deixá-la em PNG ou passá-la para WEBP.",
    ],
    differences: [
      "O PNG guarda cada pixel exatamente e aceita transparência; é ideal para gráficos, capturas de tela e logos. O JPG descarta detalhes imperceptíveis para ficar leve e funciona muito bem com fotos, mas não tem transparência e deixa pequenas manchas em volta de bordas nítidas, como as das letras.",
    ],
    kept: [
      "A resolução e a aparência geral da imagem.",
      "As cores, com uma perda que não aparece na qualidade padrão (82).",
    ],
    lost: [
      "A transparência: as áreas transparentes ficam brancas.",
      "Um pouco de nitidez em bordas bem marcadas, como textos pequenos ou linhas finas.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens. Você pode ajustar a qualidade e o tamanho e converter várias de uma vez.",
    ],
    steps: [
      "Escolha os PNGs.",
      "Deixe JPG como formato de saída. Com qualidade 75–85, as fotos ficam iguais e bem mais leves; para capturas de tela com texto, suba para 90.",
      "Clique em Converter e baixe as imagens ou o ZIP.",
    ],
    faq: [
      {
        q: "Qual qualidade eu escolho?",
        a: "Para fotos, entre 75 e 85 é um bom equilíbrio. Para capturas de tela com texto, 90 ou mais, ou simplesmente deixe em PNG.",
      },
      {
        q: "O que acontece com o fundo transparente?",
        a: "O JPG não aceita transparência, então o fundo fica branco. Se você precisa mantê-lo e ainda deixar o arquivo mais leve, converta para WEBP.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "jpg>webp": {
    when: [
      "JPG para WEBP é a conversão típica para um site carregar mais rápido: com a mesma qualidade visual, as fotos ficam cerca de 25% a 35% mais leves, o que melhora o tempo de carregamento e as métricas do Google. Também serve para economizar espaço em lojas virtuais, blogs e catálogos.",
      "Para mandar fotos por mensagem, imprimi-las ou enviá-las para sistemas antigos, é melhor ficar com o JPG: alguns programas ainda não abrem WEBP.",
    ],
    differences: [
      "O WEBP é mais moderno e comprime melhor que o JPG; além disso, aceita transparência e animação. Todos os navegadores atuais o exibem, mas nem todo programa de computador ou sistema de upload de arquivos o aceita.",
    ],
    kept: ["A resolução e a aparência da foto.", "A orientação."],
    lost: [
      "O WEBP também comprime com perda: com qualidade muito baixa, aparecem manchas. Na qualidade padrão (82), não dá para distingui-lo do JPG.",
      "Os metadados EXIF não passam para o WEBP.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as fotos, em lotes e com download em ZIP.",
    ],
    steps: [
      "Escolha os JPGs.",
      "Deixe WEBP como formato de saída. Se forem para um site, reduza também a largura ao tamanho máximo em que são exibidas (por exemplo, 1.600 px).",
      "Clique em Converter e baixe os WEBPs ou o ZIP.",
    ],
    faq: [
      {
        q: "Quanto um WEBP fica mais leve?",
        a: "Depende da foto, mas com a mesma qualidade visual costuma ficar cerca de 25% a 35% mais leve que o JPG. Reduzir também o tamanho em pixels é o que mais economiza.",
      },
      {
        q: "O WordPress e as lojas virtuais aceitam WEBP?",
        a: "A maioria das plataformas atuais aceita. Se alguma não aceitar, envie o JPG.",
      },
      {
        q: "WEBP ou AVIF para o meu site?",
        a: "O AVIF comprime ainda mais, mas demora mais para ser gerado. O WEBP é a opção mais compatível e rápida; o AVIF vale a pena se você quer o menor tamanho possível.",
      },
    ],
  },

  "png>webp": {
    when: [
      "PNG para WEBP serve para deixar as imagens de um site mais leves sem perder a transparência: logos, ícones, produtos recortados, capturas de tela e ilustrações. É uma das conversões que mais economizam peso em uma página.",
    ],
    differences: [
      "O PNG é sem perda e fica muito pesado com imagens grandes ou fotos. O WEBP também aceita transparência, mas comprime com perda (com qualidade ajustável), e o resultado costuma ter uma fração do tamanho do PNG.",
    ],
    kept: [
      "A transparência, com bordas suaves.",
      "A resolução e a aparência da imagem.",
    ],
    lost: [
      "Com qualidade baixa, podem aparecer manchas em volta de textos e linhas finas. Para gráficos com muito texto, use uma qualidade alta (90 ou mais).",
      "Os metadados do PNG não passam para o WEBP.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens. A qualidade vale igualmente para todo o lote.",
    ],
    steps: [
      "Escolha os PNGs.",
      "Deixe WEBP como formato de saída e ajuste a qualidade: 82 para fotos e produtos, 90 ou mais para gráficos com texto.",
      "Clique em Converter e baixe os WEBPs ou o ZIP.",
    ],
    faq: [
      {
        q: "O fundo transparente é mantido?",
        a: "Sim, o WEBP aceita transparência e a conserva.",
      },
      {
        q: "Quanto eu economizo?",
        a: "Em fotos e produtos salvos como PNG, o WEBP costuma ficar muitas vezes mais leve. Em ícones pequenos ou gráficos muito simples, a diferença é menor.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "jpg>avif": {
    when: [
      "JPG para AVIF vale a pena quando você quer o menor tamanho possível para as fotos de um site, uma loja ou uma galeria: o AVIF costuma alcançar a mesma qualidade visual com bem menos peso que o JPG e o WEBP.",
      "Não use para compartilhar por mensagem ou enviar para sistemas que não o conhecem: muitos programas ainda não abrem AVIF.",
    ],
    differences: [
      "O AVIF usa o codec de vídeo AV1 para comprimir imagens. É mais eficiente que o JPG e o WEBP, aceita transparência e HDR, e os navegadores atuais o exibem. Em troca, criar um AVIF exige mais processamento do que criar um JPG.",
    ],
    kept: ["A resolução e a aparência da foto.", "A orientação."],
    lost: [
      "O AVIF comprime com perda; com qualidade muito baixa, a imagem fica “lavada” em áreas de textura fina. Na qualidade padrão, isso não aparece.",
      "Os metadados EXIF não passam para o AVIF.",
    ],
    limits: [
      "A conversão é feita no seu navegador, com um codificador incluído na página. É mais lenta do que para JPG ou WEBP: alguns segundos por foto grande, mais no celular.",
    ],
    steps: [
      "Escolha os JPGs.",
      "Deixe AVIF como formato de saída e, se forem para a web, reduza a largura ao tamanho em que são exibidas.",
      "Clique em Converter e aguarde: cada foto demora um pouco mais do que com outros formatos.",
      "Baixe os AVIFs ou o ZIP.",
    ],
    faq: [
      {
        q: "Por que demora mais do que converter para WEBP?",
        a: "Porque codificar AVIF exige muito mais cálculo. Esse esforço é justamente o que permite que o arquivo fique mais leve.",
      },
      {
        q: "Todos os navegadores exibem AVIF?",
        a: "As versões atuais do Chrome, Edge, Firefox e Safari, sim. Se o seu público usa aparelhos muito antigos, ofereça também um JPG ou WEBP de reserva.",
      },
      {
        q: "Minhas fotos são enviadas?",
        a: "Não, o AVIF é gerado no seu navegador.",
      },
    ],
  },

  "gif>png": {
    when: [
      "GIF para PNG serve para tirar uma imagem estática de um GIF (por exemplo, um logo antigo, um ícone ou um quadro de uma animação) e poder editá-la ou usá-la em documentos sem o limite de 256 cores do GIF.",
    ],
    differences: [
      "O GIF aceita animação, mas só 256 cores por quadro e transparência do tipo tudo ou nada. O PNG é uma imagem estática com milhões de cores e transparência com bordas suaves. Para gráficos e logos, o PNG é o substituto moderno do GIF estático.",
    ],
    kept: ["As cores exatas do GIF e a sua transparência.", "A resolução."],
    lost: [
      "A animação: se o GIF for animado, só o primeiro quadro é convertido.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar os arquivos. O resultado é sempre uma imagem estática, mesmo que o GIF seja animado.",
    ],
    steps: [
      "Escolha os GIFs.",
      "Deixe PNG como formato de saída.",
      "Clique em Converter e baixe os PNGs.",
    ],
    faq: [
      {
        q: "O que acontece com a animação?",
        a: "Só o primeiro quadro é convertido: o PNG é uma imagem estática.",
      },
      {
        q: "A transparência é mantida?",
        a: "Sim. As áreas transparentes do GIF continuam transparentes no PNG.",
      },
      {
        q: "A qualidade melhora?",
        a: "Não: o PNG guarda exatamente as cores que o GIF tinha. O que você ganha é poder editá-lo sem o limite de 256 cores.",
      },
    ],
  },

  "gif>jpg": {
    when: [
      "GIF para JPG é útil quando um site ou formulário não aceita GIF e você precisa enviar a imagem mesmo assim, ou para guardar o primeiro quadro de um GIF como foto estática.",
    ],
    differences: [
      "O GIF é um formato com no máximo 256 cores, animação e transparência simples. O JPG é uma imagem estática com milhões de cores e compressão com perda, aceita em todo lugar, mas sem transparência.",
    ],
    kept: [
      "A resolução do primeiro quadro.",
      "As cores: um GIF tem no máximo 256, e o JPG as reproduz sem problema.",
    ],
    lost: [
      "A animação: só fica o primeiro quadro.",
      "A transparência, que vira branco.",
      "Um pouco de nitidez nas bordas de desenhos e textos, por causa da compressão do JPG.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar os arquivos. Se o GIF for um desenho ou logo com transparência, converta-o para PNG em vez de JPG.",
    ],
    steps: [
      "Escolha os GIFs.",
      "Deixe JPG como formato de saída; para desenhos com bordas nítidas, suba a qualidade para 90.",
      "Clique em Converter e baixe os JPGs.",
    ],
    faq: [
      {
        q: "Posso escolher qual quadro do GIF é convertido?",
        a: "Não, sempre é usado o primeiro quadro.",
      },
      {
        q: "JPG ou PNG para um GIF?",
        a: "PNG para logos, desenhos ou imagens com transparência; JPG só se o site exigir ou se o GIF for uma foto.",
      },
      {
        q: "Meus arquivos são enviados?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },

  "bmp>jpg": {
    when: [
      "Arquivos BMP aparecem em capturas de tela de programas antigos do Windows, scanners, máquinas industriais e equipamentos médicos. Eles são enormes porque não têm compressão. Passá-los para JPG deixa os arquivos prontos para mandar por e-mail ou enviar para qualquer lugar, com uma fração do tamanho.",
    ],
    differences: [
      "O BMP guarda a imagem sem compressão (ou com uma compressão mínima): uma foto de 12 megapixels pode ocupar mais de 30 MB. O JPG comprime com perda e deixa essa mesma foto com poucos MB, compatível com tudo.",
    ],
    kept: [
      "A resolução e a aparência da imagem.",
      "As cores, com uma perda que não aparece na qualidade padrão.",
    ],
    lost: [
      "Um pouco de nitidez em textos e linhas finas por causa da compressão; para capturas de tela com texto, é melhor usar PNG.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens, em lotes.",
    ],
    steps: [
      "Escolha os BMPs.",
      "Deixe JPG como formato de saída e ajuste a qualidade, se quiser.",
      "Clique em Converter e baixe os JPGs ou o ZIP.",
    ],
    faq: [
      {
        q: "Quanto fica mais leve?",
        a: "Muito: um BMP sem compressão costuma cair para menos de um décimo do tamanho em JPG.",
      },
      {
        q: "BMP para JPG ou para PNG?",
        a: "JPG para fotos; PNG para capturas de tela, plantas ou imagens com texto, porque não perde nada e também reduz bastante o tamanho do BMP.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "bmp>png": {
    when: [
      "BMP para PNG é ideal para capturas de tela, diagramas e imagens de scanners ou de equipamentos técnicos que salvam em BMP: o PNG fica muito mais leve e mantém a imagem exatamente igual, sem a perda do JPG.",
    ],
    differences: [
      "Os dois formatos guardam cada pixel exatamente, mas o BMP quase não comprime e o PNG comprime (sem perda). O resultado é a mesma imagem em um arquivo várias vezes menor e compatível com a web, documentos e programas de design.",
    ],
    kept: ["A imagem exata, pixel por pixel.", "A resolução e as cores."],
    lost: ["Nada da imagem. Só mudam o formato e o tamanho do arquivo."],
    limits: [
      "A conversão é feita no seu navegador, sem enviar os arquivos, em lotes.",
    ],
    steps: [
      "Escolha os BMPs.",
      "Deixe PNG como formato de saída.",
      "Clique em Converter e baixe os PNGs ou o ZIP.",
    ],
    faq: [
      {
        q: "Perde qualidade?",
        a: "Não. O PNG comprime sem perda, então a imagem é idêntica.",
      },
      {
        q: "Por que o BMP era tão pesado?",
        a: "Porque ele guarda cada pixel sem compressão. O PNG aproveita as áreas repetidas para guardar a mesma coisa em menos espaço.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "tiff>jpg": {
    when: [
      "Arquivos TIFF vêm de scanners, câmeras profissionais, gráficas e acervos de fotos. São excelentes para arquivar ou imprimir, mas são pesados e quase nenhum navegador ou rede social os exibe. Passá-los para JPG deixa os arquivos prontos para compartilhar ou publicar.",
    ],
    differences: [
      "O TIFF é um formato profissional de arquivamento: costuma guardar a imagem sem perda, com muita resolução e, às vezes, várias páginas em um mesmo arquivo. O JPG comprime com perda para ficar leve e abre em qualquer aparelho.",
    ],
    kept: [
      "A resolução da imagem.",
      "As cores, com uma perda que não aparece na qualidade padrão.",
    ],
    lost: [
      "Se o TIFF tiver várias páginas (por exemplo, um fax ou uma digitalização de várias folhas), só a primeira é convertida.",
      "A transparência e as camadas, se houver.",
      "Os metadados do arquivo.",
    ],
    limits: [
      "A conversão é feita no seu navegador. Só o Safari lê TIFF por conta própria; nos outros navegadores, é usado um decodificador incluído na página. Alguns TIFFs pouco comuns (por exemplo, com 16 bits por canal ou compressões incomuns) podem não abrir.",
    ],
    steps: [
      "Escolha os TIFFs.",
      "Deixe JPG como formato de saída; se as imagens forem enormes, reduza a largura para compartilhá-las.",
      "Clique em Converter e baixe os JPGs ou o ZIP.",
    ],
    faq: [
      {
        q: "Meu TIFF tem várias páginas. Todas são convertidas?",
        a: "Não, só a primeira. Se você precisa de todas, o melhor é digitalizar de novo cada página separadamente ou salvar o documento como PDF pelo programa do scanner.",
      },
      {
        q: "Perde qualidade?",
        a: "Um pouco, por causa da compressão do JPG, mas na qualidade padrão isso não aparece na tela. Para imprimir, suba a qualidade para 90–95.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "tiff>pdf": {
    when: [
      "TIFF para PDF serve para entregar uma digitalização ou uma imagem de arquivo como documento: para anexar a uma solicitação ou processo, mandar por e-mail ou guardar junto com outros PDFs.",
    ],
    differences: [
      "O TIFF é um formato de imagem profissional muito usado por scanners; o PDF é o formato universal para documentos. Na conversão, a imagem é colocada em uma página do mesmo tamanho, sem margens.",
    ],
    kept: [
      "A imagem da primeira página, com a sua resolução.",
      "Uma qualidade alta: a imagem é guardada como JPG de qualidade 92 dentro do PDF.",
    ],
    lost: [
      "Só a primeira página de um TIFF de várias páginas é convertida.",
      "O texto da imagem não pode ser pesquisado nem selecionado; para isso, passe o PDF pelo “OCR de PDF digitalizado”.",
      "A transparência, se houver.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar os arquivos. Alguns TIFFs pouco comuns podem não abrir. Para juntar várias imagens em um PDF, use o Imagens para PDF.",
    ],
    steps: [
      "Escolha o TIFF.",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF e, se ele estiver pesado, passe-o pelo Comprimir PDF.",
    ],
    faq: [
      {
        q: "Todas as páginas do TIFF são convertidas?",
        a: "Não, só a primeira. Para documentos de várias folhas, digitalize direto para PDF ou junte as páginas como imagens com o Imagens para PDF.",
      },
      {
        q: "O PDF fica com texto pesquisável?",
        a: "Não, ele contém uma imagem. Use o “OCR de PDF digitalizado” para adicionar texto reconhecido.",
      },
      {
        q: "Meus arquivos são enviados?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },

  "png>ico": {
    when: [
      "PNG para ICO é o que você precisa para criar o favicon de um site (o ícone da aba do navegador) ou um ícone de programa ou atalho no Windows. Se você tem o logo em PNG com fundo transparente, esse é o melhor ponto de partida.",
    ],
    differences: [
      "Um PNG é uma imagem só. Um ICO é um contêiner com várias versões do mesmo ícone em tamanhos diferentes, para que o Windows e os navegadores usem a mais adequada em cada lugar (aba, barra de tarefas, área de trabalho).",
    ],
    kept: [
      "A transparência do PNG.",
      "O desenho completo, centralizado em um quadrado se a imagem não for quadrada.",
      "Tamanhos de 16, 32, 48, 64, 128 e 256 px no mesmo arquivo (só os que não ultrapassam o tamanho da sua imagem).",
    ],
    lost: [
      "Nos tamanhos pequenos (16 e 32 px), os detalhes finos e os textos ficam ilegíveis: é uma limitação do tamanho, não do formato. Um ícone simples funciona melhor.",
      "Se a imagem não for quadrada, ficam bordas transparentes nas laterais ou em cima e embaixo.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar as imagens. Para obter também os PNGs do favicon (como o apple-touch-icon) e o código HTML, use o “Gerador de favicon”.",
    ],
    steps: [
      "Prepare um PNG quadrado de pelo menos 256 × 256 px, de preferência com fundo transparente.",
      "Escolha-o e deixe ICO como formato de saída.",
      "Clique em Converter e baixe o .ico.",
      "Para um site, envie-o para a raiz com o nome favicon.ico.",
    ],
    faq: [
      {
        q: "De que tamanho de imagem eu preciso?",
        a: "O ideal é 256 × 256 px ou mais, quadrada. Com uma imagem menor, o ICO só inclui os tamanhos que não a ultrapassam.",
      },
      {
        q: "A transparência é mantida?",
        a: "Sim, cada tamanho é guardado como PNG de 32 bits dentro do ICO.",
      },
      {
        q: "Funciona como ícone do Windows?",
        a: "Sim. O formato (com imagens PNG dentro) é compatível com o Windows Vista em diante e com todos os navegadores atuais.",
      },
    ],
  },

  "jpg>ico": {
    when: [
      "JPG para ICO serve para fazer um favicon ou um ícone do Windows a partir de uma foto ou de um logo que você só tem em JPG, por exemplo uma foto de perfil ou o logo que mandaram para você por mensagem.",
      "Se você tem o logo em PNG com fundo transparente, use esse: o resultado fica muito melhor em abas escuras.",
    ],
    differences: [
      "O JPG é uma foto sem transparência; o ICO é um contêiner de ícones com vários tamanhos. Na conversão, a imagem é reduzida para cada tamanho padrão e guardada dentro do ICO.",
    ],
    kept: [
      "A imagem completa, centralizada em um quadrado.",
      "Tamanhos de 16 a 256 px no mesmo arquivo.",
    ],
    lost: [
      "O JPG não tem transparência, então o fundo da foto fica como está; se a imagem não for quadrada, as bordas adicionadas ficam transparentes.",
      "Em 16 e 32 px, uma foto fica reduzida a pouquíssimos pixels e perde detalhes. Recorte antes a parte importante (um rosto, a inicial do logo).",
    ],
    limits: ["A conversão é feita no seu navegador, sem enviar as imagens."],
    steps: [
      "Se precisar, corte a imagem em um quadrado com o Cortar imagem, deixando só o que importa.",
      "Escolha o JPG e deixe ICO como formato de saída.",
      "Clique em Converter e baixe o .ico.",
    ],
    faq: [
      {
        q: "Posso remover o fundo antes?",
        a: "Sim. Passe o JPG pelo Remover fundo de imagem, baixe o PNG e converta-o para ICO: o ícone vai ficar com fundo transparente.",
      },
      {
        q: "Por que meu ícone fica borrado na aba?",
        a: "Porque em 16 px quase não há espaço para detalhes. Um desenho simples ou uma letra grande ficam muito melhores do que uma foto.",
      },
      {
        q: "Minhas imagens são enviadas?",
        a: "Não, tudo é processado no seu navegador.",
      },
    ],
  },

  "ico>png": {
    when: [
      "ICO para PNG serve para tirar a imagem de um favicon ou de um ícone do Windows e usá-la em outro lugar: em uma apresentação, um documento, um design ou para criar um ícone novo a partir do antigo.",
    ],
    differences: [
      "Um ICO contém uma ou várias versões de um ícone em tamanhos diferentes. Um PNG é uma imagem só, que qualquer programa abre e edita.",
    ],
    kept: ["A transparência do ícone.", "As cores exatas."],
    lost: [
      "Você obtém uma imagem só: o navegador escolhe uma das versões do ícone (normalmente a maior). As outras não são exportadas.",
      "Um ícone que só tem 16 ou 32 px não ganha detalhes: se você ampliá-lo depois, ele vai ficar pixelado.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar os arquivos. ICOs muito antigos com formatos de cor pouco comuns podem não abrir em todos os navegadores.",
    ],
    steps: [
      "Escolha o arquivo .ico.",
      "Deixe PNG como formato de saída.",
      "Clique em Converter e baixe o PNG.",
    ],
    faq: [
      {
        q: "Qual vai ser o tamanho do PNG?",
        a: "O da versão do ícone que o navegador usar, normalmente a maior que o arquivo contém (até 256 × 256 px).",
      },
      {
        q: "Posso ampliá-lo?",
        a: "Pode, com o Redimensionar imagem, mas um ícone de poucos pixels vai ficar pixelado ou borrado ao ser ampliado.",
      },
      {
        q: "Meus arquivos são enviados?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },

  "svg>png": {
    when: [
      "SVG para PNG é necessário quando você tem um logo ou uma ilustração vetorial e precisa usá-los onde SVG não é aceito: redes sociais, apresentações, documentos do Word, apps de mensagens ou plataformas que pedem uma imagem comum.",
    ],
    differences: [
      "Um SVG é um desenho descrito com formas e textos, por isso fica nítido em qualquer tamanho. Um PNG é uma imagem de pixels com tamanho fixo. Na conversão, o SVG é “desenhado” no tamanho que você escolher, e a partir daí esse é o máximo de nitidez dele.",
    ],
    kept: [
      "A transparência do fundo.",
      "As formas, cores e degradês, exatamente como o navegador os desenha.",
      "Nitidez total no tamanho escolhido: você pode pedir um PNG grande sem que ele fique borrado.",
    ],
    lost: [
      "A escalabilidade: o PNG não pode mais ser ampliado sem perder nitidez.",
      "As imagens ou fontes que o SVG carrega da internet não são incluídas; os textos com fontes não instaladas usam uma fonte do sistema.",
      "As animações e o código do SVG.",
    ],
    limits: [
      "A conversão é feita no seu navegador. O tamanho vem da largura, da altura ou do viewBox do SVG; se ele não tiver nenhum, é usado 1.024 px. Se o texto do logo aparecer com outra fonte, converta-o em contornos no seu programa de design antes de exportar.",
    ],
    steps: [
      "Escolha o SVG.",
      "Deixe PNG como formato de saída e escolha o tamanho: por exemplo, 1.000 px de largura para redes sociais ou o dobro do tamanho em que ele vai ser exibido.",
      "Clique em Converter e baixe o PNG.",
    ],
    faq: [
      {
        q: "Qual tamanho de PNG eu escolho?",
        a: "O que você precisar: como o SVG é vetorial, ampliá-lo não perde qualidade. Para telas de alta densidade, escolha o dobro do tamanho em que ele vai ser visto.",
      },
      {
        q: "O texto do logo sai com outra fonte. Por quê?",
        a: "Porque o SVG usa uma fonte que não está incorporada ao arquivo nem instalada no seu aparelho. No seu programa de design, converta o texto em contornos (curvas) e exporte o SVG de novo.",
      },
      {
        q: "O fundo transparente é mantido?",
        a: "Sim, o PNG conserva a transparência.",
      },
    ],
  },

  "svg>jpg": {
    when: [
      "SVG para JPG serve quando um site ou sistema só aceita JPG e você tem um logo, um gráfico ou uma ilustração em SVG: formulários, perfis, plataformas de anúncios ou impressões rápidas.",
      "Se o destino aceitar PNG, essa é a melhor opção: conserva a transparência e as bordas ficam mais limpas.",
    ],
    differences: [
      "O SVG é um desenho vetorial que fica nítido em qualquer tamanho; o JPG é uma imagem de pixels comprimida com perda, pensada para fotos e sem transparência.",
    ],
    kept: [
      "As formas e cores, exatamente como o navegador as desenha.",
      "A nitidez no tamanho que você escolher.",
    ],
    lost: [
      "A transparência: o fundo fica branco.",
      "Um pouco de nitidez em bordas e textos por causa da compressão do JPG; suba a qualidade para 90 em logos.",
      "As imagens ou fontes externas que o SVG carregue, e as animações dele.",
    ],
    limits: [
      "A conversão é feita no seu navegador. O tamanho vem da largura, da altura ou do viewBox do SVG (1.024 px se ele não tiver nenhum).",
    ],
    steps: [
      "Escolha o SVG.",
      "Deixe JPG como formato de saída, suba a qualidade para 90 e escolha o tamanho em pixels.",
      "Clique em Converter e baixe o JPG.",
    ],
    faq: [
      {
        q: "Posso escolher a cor de fundo em vez do branco?",
        a: "Nesta conversão, o fundo transparente fica branco. Se você precisa de outra cor, mude-a no próprio SVG (com um editor de design) antes de converter, ou converta para PNG se o destino aceitar.",
      },
      {
        q: "JPG ou PNG para um logo?",
        a: "PNG quase sempre: conserva a transparência e as bordas nítidas. JPG só se for exigido.",
      },
      {
        q: "Meus arquivos são enviados?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },

  "svg>pdf": {
    when: [
      "SVG para PDF é útil para mandar um gráfico, uma planta ou uma ilustração como documento, para anexá-lo a um relatório ou para que alguém sem programas de design consiga abri-lo e imprimi-lo.",
    ],
    differences: [
      "O SVG é um formato vetorial para a web; o PDF é um formato de documento que também pode ter vetores. Nesta conversão, porém, o SVG é desenhado como imagem (PNG) dentro de uma página do mesmo tamanho.",
    ],
    kept: [
      "A aparência do desenho, com as suas cores e formas, no tamanho do SVG.",
      "A transparência, que no PDF aparece sobre fundo branco.",
    ],
    lost: [
      "O PDF não fica vetorial: se você ampliar muito ou imprimir em grande formato, os pixels aparecem. Se você precisa de um PDF vetorial (para uma gráfica, por exemplo), exporte-o pelo seu programa de design.",
      "O texto do SVG não pode ser selecionado no PDF.",
      "As imagens e fontes externas do SVG.",
    ],
    limits: [
      "A conversão é feita no seu navegador, sem enviar os arquivos. A página tem o tamanho do SVG (1.024 px se ele não definir um); para mais resolução, converta antes para PNG em um tamanho grande e passe esse PNG para PDF.",
    ],
    steps: [
      "Escolha o SVG.",
      "Deixe PDF como formato de saída e clique em Converter.",
      "Baixe o PDF e confira-o com o zoom no tamanho em que ele vai ser usado.",
    ],
    faq: [
      {
        q: "O PDF conserva os vetores?",
        a: "Não: o desenho é guardado como imagem dentro do PDF. Para documentos na tela ou impressão comum, isso basta; para gráfica, exporte um PDF vetorial pelo programa de design.",
      },
      {
        q: "Como consigo mais resolução?",
        a: "Converta o SVG para PNG escolhendo um tamanho grande (por exemplo, 3.000 px) e depois passe esse PNG para PDF.",
      },
      {
        q: "Meus arquivos são enviados?",
        a: "Não, a conversão é feita no seu navegador.",
      },
    ],
  },
};
