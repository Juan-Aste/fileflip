const body = `
Alguém te manda um PDF e você precisa mudar alguma coisa: corrigir uma data, colocar seu nome numa linha, marcar um parágrafo, inserir um logotipo ou cobrir um número de telefone antes de encaminhar. Muitos programas que prometem “editar PDF” pedem instalação, cadastro ou pagamento para baixar o resultado. Este guia mostra como fazer isso de graça no navegador, no computador ou no celular, e principalmente o que dá e o que não dá para mudar num PDF, para você não perder tempo procurando uma função que nenhum editor on-line faz direito.

## O que dá para editar num PDF (e o que não dá)

Um PDF não é um documento do Word. Ele não guarda parágrafos que se reorganizam enquanto você digita, e sim letras desenhadas em posições fixas da página. Por isso existem dois tipos de edição bem diferentes:

- **Acrescentar coisas por cima da página**: texto novo, destaques, setas, retângulos, uma imagem ou um retângulo branco que cubra algo. É o que o [Editar PDF](tool:edit-pdf) faz, e é o que você precisa na maioria das vezes.
- **Mudar o texto que já está no PDF**: reescrever uma frase e o resto do parágrafo se ajustar sozinho. Nossa ferramenta **não faz isso**. Para isso é preciso converter o PDF em Word, editar lá e salvar de novo como PDF; mais abaixo explicamos como e quando vale a pena.

Com o Editar PDF você pode:

- Escrever **texto** em qualquer lugar, em várias linhas, com Helvetica (normal ou negrito), Times ou Courier, de 4 a 144 pontos e na cor que quiser.
- **Destacar** frases com uma cor translúcida que deixa ler o texto de baixo.
- **Desenhar** à mão livre e traçar **retângulos**, **linhas** e **setas**, com espessura de 1 a 20 pontos.
- Inserir uma **imagem** PNG ou JPG de até 10 MB, como um logotipo, um carimbo ou sua assinatura salva como imagem.
- **Cobrir** partes da página com um retângulo branco.

Tudo acontece no seu navegador: o PDF e o que você acrescenta não saem do seu dispositivo.

## Como editar um PDF passo a passo

1. Abra o [Editar PDF](tool:edit-pdf) e arraste o PDF para a área indicada, ou toque nela para escolher o arquivo.
2. Escolha a página nas miniaturas e use **Aproximar** para trabalhar com precisão.
3. Na barra de ferramentas, escolha o que quer acrescentar: **Texto**, **Destacar**, **Desenhar**, **Retângulo**, **Linha**, **Seta**, **Cobrir** ou **Imagem**.
4. Para escrever, escolha a **Fonte**, o **Tamanho (pt)** e a **Cor**, toque na página onde vai o texto e digite na caixa **Texto** que aparece acima.
5. Para corrigir algo, escolha **Selecionar**, toque no elemento e arraste; **Apagar** o remove, e **Desfazer** e **Refazer** percorrem suas alterações.
6. Toque em **Salvar PDF** e depois em **Baixar**.

![O editor com um aviso em PDF: uma data destacada, uma seta vermelha e o horário corrigido](shot:editar-pdf-texto "O horário antigo ficou coberto por um retângulo branco e o novo foi escrito por cima. Acima da página ficam a fonte, o tamanho e o texto do elemento selecionado.")

Alguns detalhes que economizam tempo:

- Em imagens, destaques e retângulos brancos, o **quadradinho do canto** muda o tamanho. O texto não tem esse quadradinho: ele aumenta ou diminui pelo **Tamanho (pt)**.
- Cada ferramenta lembra a própria cor: o texto começa em preto, o destaque em amarelo e as formas em vermelho. Em **Outra cor** você escolhe qualquer tom.
- Dá para editar várias páginas antes de salvar: as miniaturas das páginas alteradas ganham um ponto.
- No celular, funciona com o dedo. No computador, Ctrl+Z desfaz e Ctrl+Y refaz (Cmd no Mac).

## Corrigir um texto que já está no PDF

É o que mais se procura: trocar uma data, um valor, um nome escrito errado. Como o texto original não pode ser reescrito, o truque é **cobrir e escrever por cima**:

1. Escolha **Cobrir** e arraste sobre a palavra ou o número que quer trocar.
2. Escolha **Texto** e toque exatamente onde o texto antigo começava.
3. Digite o novo, com fonte e tamanho parecidos com os do original.

Para não dar na vista: a **Helvetica** se parece com a Arial e com a maioria das letras sem serifa; a **Times**, com as letras serifadas dos documentos mais formais. Em quase todo documento, o texto comum tem entre 10 e 12 pontos. Com o zoom em 200% ou 300%, fica fácil acertar a posição.

Esse truque funciona bem para palavras soltas, números e linhas curtas. Se você precisa reescrever parágrafos inteiros, o texto novo não vai caber no espaço do antigo. Nesse caso, converta o PDF com [PDF para Word](conv:pdf-docx), edite como qualquer documento e converta de volta com [Word para PDF](conv:docx-pdf). Lembre que essa conversão é feita no nosso servidor e que o Word gerado é um documento limpo, não uma cópia exata do layout: o guia [Como converter PDF em Word](guide:pdf-to-word) explica o que se mantém e o que muda.

## Cobrir não é apagar: cuidado com dados pessoais

Este ponto é importante se você vai compartilhar o PDF. Um retângulo branco **só esconde da vista**: o texto de baixo continua no arquivo, e qualquer pessoa pode selecioná-lo, copiá-lo ou encontrá-lo com a busca do leitor de PDF. O editor avisa assim que você usa **Cobrir**.

Se o que você está cobrindo não pode chegar a ninguém (um CPF, uma conta bancária, um endereço), faça assim:

1. Com **Selecionar**, toque no retângulo branco.
2. Marque **Ocultar de verdade (transforma esta página em imagem)**.
3. Salve o PDF.

![Um retângulo branco selecionado, com a opção Ocultar de verdade marcada](shot:editar-pdf-tapar "Com “Ocultar de verdade” marcado, a página é salva como imagem e o que foi coberto some do arquivo.")

Ao salvar, essa página é substituída por uma imagem de alta qualidade dela mesma: o que estava embaixo do retângulo some do arquivo. Em troca, o texto dessa página não pode mais ser selecionado nem pesquisado, e o PDF costuma ficar mais pesado. As outras páginas continuam como estavam; por isso, marque a opção só nas páginas que precisam.

## O que saber antes de salvar

- **O que você acrescenta fica fixo.** É desenhado na própria página, não como um comentário: aparece igual em qualquer leitor e na impressão, mas depois não pode mais ser movido nem apagado, nem se você abrir o PDF de novo no Editar PDF. Revise tudo antes de tocar em **Salvar PDF** e guarde o original.
- **Se recarregar a página antes de salvar, você perde as alterações.** O editor não guarda nada em lugar nenhum.
- **Acentos e outros alfabetos.** Letras acentuadas, o ç e o ã são escritos com a fonte escolhida. Texto em alfabetos que essas fontes não têm, como o chinês, e emojis entram como imagem, com as fontes do seu dispositivo: aparecem certinho, mas não podem ser selecionados.
- **PDFs digitalizados.** Dá para escrever, destacar e cobrir como em qualquer PDF. Se você também quer que o texto possa ser pesquisado e copiado, passe o arquivo antes pelo [OCR de PDF digitalizado](tool:ocr-pdf).

## Outras edições: qual ferramenta usar

Às vezes “editar um PDF” quer dizer outra coisa. Para esses casos há ferramentas mais diretas:

- **Preencher um formulário com campos** (caixas de texto, caixas de seleção, listas): o [Preencher formulário PDF](tool:fill-pdf-form) encontra os campos e deixa você completá-los; o guia [Como preencher um formulário PDF](guide:fill-pdf-form) explica o passo a passo. Se o formulário é só um desenho com linhas, use o Editar PDF.
- **Assinar**: o [Assinar PDF](tool:sign-pdf) coloca sua assinatura desenhada ou uma foto dela; veja [Como assinar um PDF sem imprimir](guide:sign-pdf).
- **Reordenar, girar ou tirar páginas**: [Organizar páginas de PDF](tool:organize-pdf), [Girar PDF](tool:rotate-pdf) ou [Excluir páginas de um PDF](tool:delete-pdf-pages).
- **Acrescentar páginas de outro PDF**: [Juntar PDF](tool:merge-pdf).
- **Pôr o mesmo texto em todas as páginas**: o Editar PDF trabalha página por página. Para um RASCUNHO ou CONFIDENCIAL em todas, use [Adicionar marca d’água a um PDF](tool:pdf-watermark); para numerá-las, [Numerar páginas de um PDF](tool:pdf-page-numbers).
- **Proteger o resultado**: o [Proteger PDF com senha](tool:protect-pdf) coloca uma senha para abrir o arquivo.

## Resumo

- O [Editar PDF](tool:edit-pdf) acrescenta texto, destaques, desenhos, formas, imagens e retângulos brancos, de graça e sem enviar o arquivo.
- Ele não muda o texto original: para corrigir uma palavra, cubra e escreva por cima; para reescrever parágrafos, converta o PDF em Word.
- Cobrir com branco não apaga: se o dado é pessoal, marque “Ocultar de verdade”.
- O que você acrescenta fica fixo ao salvar: revise antes e guarde o original.
- Para formulários, assinaturas, páginas, marcas d’água ou senhas, use a ferramenta específica.
`;

export default body;
