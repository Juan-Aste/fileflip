const body = `
Uma ficha de inscrição, um pedido de bolsa, uma declaração ou um cadastro de cliente: muita burocracia chega como um PDF que você precisa preencher e devolver. Imprimir, preencher à mão e escanear funciona, mas o resultado costuma ficar difícil de ler. Se o PDF for um formulário com campos, dá para preenchê-lo direto no computador ou no celular e devolvê-lo com as respostas digitadas. Este guia mostra como fazer isso, explica o que significa “achatar” o formulário e o que fazer quando o PDF não tem campos.

## Antes de começar: seu PDF tem campos?

Nem todo formulário em PDF é igual:

- **Formulário com campos** (também chamado de AcroForm): ao abri-lo num leitor de PDF, dá para clicar nas caixas e digitar. É o caso da maioria dos formulários que órgãos públicos, bancos e escolas disponibilizam para download.
- **Formulário “chapado”**: tem só linhas ou caixas desenhadas na página. É um papel escaneado ou um documento exportado sem campos. Não há nada para preencher: é preciso escrever por cima.
- **Formulário XFA**: um formato antigo da Adobe (LiveCycle) que só o Adobe Acrobat preenche direito. É raro, mas ainda aparece em alguns órgãos.

Não precisa descobrir isso antes: ao abrir o PDF, a ferramenta diz quantos campos encontrou, ou avisa se não há nenhum ou se é um formulário XFA.

## Como preencher um formulário PDF passo a passo

1. Abra [Preencher formulário PDF](tool:fill-pdf-form) e escolha o PDF, ou arraste-o para a caixa.
2. Espere a mensagem “Encontramos… campos”. Os campos aparecem organizados por página (**Página 1**, **Página 2**…), com a página do PDF ao lado.
3. Preencha cada campo. Ao selecionar um, a caixa dele fica destacada na prévia; você também pode tocar numa caixa da prévia para ir direto àquele campo.
4. Se quiser que as respostas fiquem fixas na página, marque **Achatar o formulário**. Se não, deixe desmarcado.
5. Toque em **Salvar PDF** e depois em **Baixar**.

![Ficha de inscrição com nome, data de nascimento, e-mail, turno e nível preenchidos, ao lado da prévia da página](shot:rellenar-formulario-campos "Cada campo do PDF aparece como um campo comum; a prévia destaca o que você está preenchendo.")

Tudo acontece no seu navegador: nem o PDF nem as suas respostas são enviados a nenhum servidor. O arquivo baixado mantém o nome original com “-filled” no final, ou “-flattened” se você o achatou.

## Que tipos de campo dá para preencher

A ferramenta reconhece os campos padrão de um formulário PDF e mostra cada um com o controle correspondente:

- **Caixas de texto**, de uma linha ou de várias (para comentários ou endereços). Se quem fez o formulário limitou o número de caracteres, aparece “Máximo de… caracteres” embaixo e não dá para digitar além disso.
- **Caixas de seleção**, como “Aceito os termos”.
- **Botões de opção**, quando é preciso escolher uma única alternativa (turno, estado civil, sim ou não). Se marcou uma por engano, **Limpar seleção** deixa em branco.
- **Listas suspensas** e **listas de seleção**. “— Nenhum —” deixa a lista vazia; nas listas que aceitam várias opções, cada uma aparece com sua própria caixa de seleção.

Os campos **somente leitura** aparecem, mas não podem ser alterados: mantêm o valor definido por quem fez o formulário.

O nome de cada campo é o texto de ajuda que o autor do formulário escreveu. Se ele não escreveu nenhum, a ferramenta usa o nome interno do campo, que às vezes é algo pouco claro como “Text1” ou “campo 7”. Nesse caso, use a prévia como guia: ao selecionar o campo, você vê em que parte da página ele está.

## Achatar ou deixar editável

Na hora de salvar, há duas opções:

- **Sem achatar**: o PDF continua sendo um formulário. Você pode abri-lo de novo (nesta ferramenta ou em qualquer leitor) para corrigir uma resposta, ou mandá-lo para outra pessoa preencher a parte dela.
- **Achatado**: o que você digitou passa a fazer parte do desenho da página. Fica igual em qualquer leitor e na impressão, e ninguém consegue mudar as respostas com um clique.

Achate o formulário quando ele estiver pronto para entregar. Antes, salve também uma cópia sem achatar: se depois encontrar um erro, você corrige nela em vez de começar do zero.

Um detalhe: as respostas são desenhadas com a fonte padrão do formulário, que só conhece o alfabeto latino. Acentos e cedilha não são problema, mas se um campo tiver caracteres chineses ou emojis, o PDF é salvo com as respostas sem achatar, e a ferramenta avisa quais campos são. Chrome, Firefox, Acrobat e Pré-Visualização mostram mesmo assim.

## Preencher um formulário PDF pelo celular

A ferramenta funciona no navegador do celular, sem instalar nenhum aplicativo:

- **Escolher o arquivo**: ao tocar na caixa, você pode abrir o PDF de Downloads, Arquivos ou Google Drive. Se recebeu pelo WhatsApp ou por e-mail, baixe-o primeiro.
- **Preencher**: em telas estreitas, a lista de campos vem primeiro e a prévia da página fica embaixo. Digite nos campos da lista, que é bem mais prático do que mirar nas caixas da página.
- **Salvar**: ao tocar em **Baixar**, o PDF vai para a pasta de downloads do celular, pronto para anexar ou compartilhar.

## Se aparecer que o PDF não tem campos

![Aviso de que o PDF não tem campos de formulário, com o link para abrir o Editar PDF](shot:rellenar-formulario-sin-campos "Se o PDF não tiver campos, a ferramenta avisa e leva você ao Editar PDF.")

É o que acontece com formulários escaneados ou feitos só com linhas. Nesse caso, use o [Editar PDF](tool:edit-pdf): toque no lugar da página onde quer escrever e adicione o texto por cima, em uma ou várias páginas. O guia [como editar um PDF de graça sem instalar nada](guide:edit-pdf) explica passo a passo.

Se o formulário for uma folha de papel que você tem em mãos, primeiro transforme-a em PDF com [Escanear documento](tool:scan-document) e depois preencha com o Editar PDF.

## Formulários XFA, com senha ou com campo de assinatura

- **XFA**: se o PDF for só XFA, a ferramenta avisa e oferece **Abrir Editar PDF** para você escrever sobre a página. Se o PDF também tiver a versão padrão dos campos, ela preenche essa e remove a parte XFA, para ninguém ver dados antigos no Acrobat.
- **Com senha de abertura**: não dá para ler o PDF enquanto a senha não for removida. Faça isso com [Remover senha de PDF](tool:unlock-pdf), que pede a senha, e depois abra o PDF desbloqueado. PDFs que só têm restrições de permissão, sem senha de abertura (muito comuns em formulários oficiais), abrem sem você precisar fazer nada.
- **Com campo de assinatura digital**: a ferramenta detecta o campo, mas não o preenche, porque uma assinatura digital exige um certificado. Se o que pedem é a sua assinatura de próprio punho, use [Assinar PDF](tool:sign-pdf) depois de preencher os dados.

## Assinar e enviar

A ordem recomendada é: preencher, achatar e assinar. Assim, as respostas e a assinatura ficam fixas na página. Para assinar sem imprimir, siga o guia [Como assinar um PDF sem imprimir](guide:sign-pdf).

Antes de enviar, abra o PDF baixado e confira se todas as respostas estão no lugar certo. Se ficar pesado demais para o e-mail, o [Comprimir PDF](tool:compress-pdf) reduz o tamanho; o guia [Como diminuir o tamanho de um PDF](guide:reduce-pdf-size) explica qual nível escolher.

## Resumo

- [Preencher formulário PDF](tool:fill-pdf-form) preenche os campos de texto, caixas de seleção, opções e listas de um PDF no seu navegador, sem enviá-lo.
- A prévia mostra onde fica cada campo na página.
- Achate o formulário quando estiver pronto e guarde também uma cópia editável.
- Se o PDF não tiver campos ou for XFA, escreva sobre a página com o Editar PDF.
- Se tiver senha, remova-a primeiro; para assinar, use o Assinar PDF depois de preencher.
`;

export default body;
