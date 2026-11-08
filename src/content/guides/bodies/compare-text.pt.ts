const body = `
Um contrato volta “com alguns pequenos ajustes”, um colega manda a versão final do trabalho em grupo ou sai a nova redação de um regulamento. Ler as duas versões lado a lado e procurar as diferenças no olho é lento e pouco confiável: um número trocado ou um “não” acrescentado passam despercebidos com facilidade. Este guia explica como comparar dois textos e ver exatamente o que foi acrescentado, o que foi tirado e o que mudou, e o que fazer quando as versões vêm em PDF ou em Word.

## Como comparar dois textos passo a passo

1. Abra [Comparar textos](tool:compare-text).
2. Cole a versão anterior em **Texto original** e a nova em **Texto novo**. Se elas estiverem em arquivos de texto, use **Abrir arquivo** acima de cada caixa.
3. Em **Comparar por**, escolha **Linhas** ou **Palavras** (mais abaixo explicamos quando usar cada um).
4. Se quiser, marque **Não diferenciar maiúsculas de minúsculas** ou **Ignorar espaços a mais**.
5. Toque em **Comparar** e confira o resultado em **Diferenças**.

![Duas versões de um contrato comparadas por linhas: os valores, o prazo e uma cláusula nova aparecem marcados](shot:comparar-textos-lineas "Por linhas: em vermelho o que estava no texto original, em verde o que o texto novo traz.")

Acima do resultado aparece um resumo, por exemplo “3 linhas alteradas, 1 adicionada e nenhuma removida”, para você saber de relance quanto foi mexido. Se os dois textos coincidirem, aparece “Os textos são iguais.”.

A comparação é feita no seu navegador: os textos não são enviados a nenhum servidor. O resultado não se atualiza sozinho: se você corrigir algo em uma das caixas, toque em **Comparar** de novo.

## Como ler o resultado

A ferramenta marca as diferenças com duas cores e, nas palavras, também com tachado e sublinhado, para que se destaquem mesmo para quem não distingue bem as cores:

- **Vermelho** (as palavras também tachadas): o que estava no texto original e não está mais.
- **Verde** (as palavras também sublinhadas): o que aparece no texto novo.
- Sem marca: o que não mudou.

No modo **Linhas**, cada linha tem dois números: à esquerda, o número dela no texto original; à direita, no texto novo. As linhas com “−” e fundo vermelho são do original; as que têm “+” e fundo verde, do novo. Quando uma linha mudou, a ferramenta mostra a versão antiga e a nova e, dentro delas, destaca só as palavras que mudaram; uma linha acrescentada ou removida inteira aparece só com o fundo colorido. Na captura, na cláusula 2 estão marcados apenas “200” → “500” e “duas” → “três”.

O botão **Inverter** passa o texto original para a outra caixa e vice-versa. Serve se você colou na ordem errada; depois, toque em **Comparar** de novo.

## Por linhas ou por palavras?

**Linhas** é o modo clássico dos comparadores de código e o melhor quando o texto está organizado em linhas: listas, cláusulas numeradas, artigos de uma lei, código, dados ou legendas.

**Palavras** mostra o texto novo inteiro, como um parágrafo corrido, com as palavras tiradas e acrescentadas marcadas no lugar. Quebras de linha e espaços não contam como mudança. É o modo mais confortável para prosa: uma redação, um artigo, um trabalho escolar, uma carta. Também é o mais indicado quando o texto vem de um PDF, porque ali as linhas quebram onde terminava a linha na página, e se uma versão foi rediagramada, no modo por linhas pareceria que tudo mudou. Neste modo, o resumo conta palavras adicionadas e removidas.

![Um parágrafo comparado por palavras: as palavras tiradas aparecem tachadas e as acrescentadas, sublinhadas](shot:comparar-textos-palabras "Por palavras: o texto novo com as mudanças marcadas no lugar.")

## As duas opções para ignorar diferenças

- **Não diferenciar maiúsculas de minúsculas**: “Contrato” e “CONTRATO” contam como iguais. Útil se em uma versão os títulos foram para maiúsculas e você não quer que isso esconda as mudanças de conteúdo.
- **Ignorar espaços a mais**: no modo **Linhas**, não contam os espaços no começo e no fim de cada linha nem os espaços duplos no meio dela. É a opção para código reindentado ou para texto copiado de algum lugar que acrescenta espaços. No modo **Palavras** os espaços já não contam, então essa caixa não muda nada.

## Se as versões estão em PDF ou em Word

**Abrir arquivo** aceita só arquivos de texto: .txt, .md, .csv, .tsv, .json, .html, .xml, .srt, .vtt e .log, com até 2 milhões de caracteres, e detecta a codificação automaticamente. Ele não abre PDF nem Word diretamente, então primeiro é preciso extrair o texto:

- **PDF com texto selecionável** (gerado por um editor de texto ou por um sistema): passe por [PDF para texto](tool:pdf-to-text). Aceita vários PDFs de uma vez; baixe o .txt de cada versão e abra com **Abrir arquivo**. Se você marcar **Marcar o começo de cada página**, o texto inclui uma marca por página, o que ajuda a localizar em que folha está cada mudança.
- **PDF digitalizado** (as páginas são imagens): use [OCR de PDF digitalizado](tool:ocr-pdf), escolha o **Idioma do texto** e, em **Resultado**, **Só o texto (.txt)**. Processa até 100 páginas por PDF.
- **Foto de uma folha impressa**: [Imagem para texto (OCR)](tool:image-to-text) extrai o texto da imagem.
- **Word**: abra o documento, selecione tudo (Ctrl+A), copie e cole na caixa. Cada parágrafo do Word vira uma linha, então com parágrafos longos o modo **Palavras** fica mais legível.

Com texto reconhecido por OCR, lembre que o reconhecimento pode confundir algum caractere (“l” por “1”, uma vírgula por um ponto). Se aparecer uma mudança estranha, confira no documento original antes de considerá-la real.

Quando encontrar o que precisa corrigir em um PDF, você pode fazer isso com [Editar PDF](tool:edit-pdf); o guia [Como converter PDF em Word](guide:pdf-to-word) explica o que fazer se preferir editar no Word.

## Casos de uso reais

- **Um contrato que volta corrigido**: compare por **Linhas** ou por **Palavras** e preste atenção a valores, datas, prazos e palavras como “não”, “somente” ou “exceto”, que mudam o sentido com muito pouco. Antes de assinar, o guia [Como assinar um PDF](guide:sign-pdf) explica o passo seguinte.
- **Um trabalho escolar ou um TCC**: compare por **Palavras** a versão que você entregou com a corrigida para ver tudo o que o professor ou o colega mexeu.
- **Um texto legal ou um regulamento**: com artigos numerados, o modo **Linhas** mostra que artigos foram acrescentados, quais foram tirados e que palavras mudaram em cada um.
- **Código ou arquivos de configuração**: compare por **Linhas**, marque **Ignorar espaços a mais** se a indentação mudou e, se precisar compartilhar a mudança, toque em **Baixar .diff**. Esse arquivo está no formato unificado que o git e as ferramentas de revisão leem. Atenção: o .diff registra todas as mudanças, inclusive as de maiúsculas ou de espaços que você pediu para ignorar na tela.
- **Duas listas** (de convidados, de produtos): ordene antes com [Remover linhas duplicadas](tool:remove-duplicate-lines), com **A → Z** em **Ordenar**, e depois compare por linhas. Assim você vê quais itens faltam em uma ou na outra sem que a ordem diferente atrapalhe o resultado.

Se os textos quase não tiverem nada em comum, a comparação por linhas para e mostra um aviso: nesse caso, compare partes menores, por exemplo capítulo por capítulo.

## Outras ferramentas úteis

- [Contador de palavras e caracteres](tool:word-counter): para conferir se a versão nova ainda cabe no limite de palavras de um trabalho ou de um formulário.
- [Converter maiúsculas e minúsculas](tool:case-converter): para deixar os títulos todos em maiúsculas ou em minúsculas na versão final.

## Resumo

- Cole as duas versões em [Comparar textos](tool:compare-text) e toque em **Comparar**: em vermelho tachado o que saiu, em verde sublinhado o que entrou.
- **Linhas** para listas, cláusulas e código; **Palavras** para prosa e para texto tirado de um PDF.
- Para PDF ou Word, extraia o texto antes com PDF para texto, OCR de PDF digitalizado ou copiando e colando.
- Tudo acontece no seu navegador, sem enviar os textos.
`;

export default body;
