const body = `
Se um sistema de envio on-line, um tribunal ou a biblioteca de uma universidade já recusou o seu PDF com uma mensagem como “o arquivo deve estar no formato PDF/A”, este guia é para você. Ele explica o que é PDF/A, por que é exigido, qual versão escolher e como converter um PDF comum com o [PDF para PDF/A](tool:pdf-to-pdfa).

## O que é PDF/A

PDF/A é uma versão do PDF pensada para **arquivamento de longo prazo**. É uma norma internacional (ISO 19005) que define um subconjunto do PDF com uma garantia: o documento deve aparecer exatamente igual daqui a muitos anos, em qualquer programa, sem depender de nada externo.

Para conseguir isso, um arquivo PDF/A:

- **Incorpora todas as fontes** no arquivo, para que o texto apareça igual mesmo que o computador que o abre não tenha essas fontes.
- **Fixa as cores** com um perfil de cor, para que não mudem conforme a tela ou a impressora.
- **Guarda os metadados** (título, autor, datas) dentro do arquivo, num formato padronizado.
- **Não permite** nada que possa parar de funcionar ou mudar com o tempo: senhas e criptografia, conteúdo carregado da internet, JavaScript, áudio e vídeo.

Um PDF comum pode até cumprir quase tudo isso por acaso, mas um PDF/A garante e declara isso dentro do próprio arquivo.

## Quem exige e por quê

Ele é exigido por instituições que precisam **guardar documentos por anos** e não podem correr o risco de um arquivo deixar de abrir ou aparecer diferente:

- Órgãos públicos e sistemas de solicitações on-line.
- Tribunais e sistemas de processo eletrônico.
- Universidades, para depositar teses e dissertações nos seus repositórios.
- Arquivos, bibliotecas e alguns sistemas de nota fiscal eletrônica.

Cada instituição informa qual versão aceita. Se a exigência diz só “PDF/A”, a escolha mais segura costuma ser o PDF/A-2b.

## As versões: 1b, 2b, 3b (e o que significa a letra)

O número é a versão da norma:

| Versão | Baseada em | Para que serve |
| --- | --- | --- |
| PDF/A-1 | PDF 1.4 | A primeira. Para sistemas que só aceitam esta versão. Sem transparências: elas são achatadas. |
| PDF/A-2 | PDF 1.7 | A mais aceita hoje. Permite transparências, camadas e compressão moderna. |
| PDF/A-3 | PDF 1.7 | Como a 2, mas permite anexar qualquer arquivo dentro do PDF (usado, por exemplo, em notas fiscais eletrônicas que levam os seus dados em XML). |

A letra é o nível de conformidade:

- **b** (básico): garante que o documento **aparece** igual. É o nível que quase todos os procedimentos pedem.
- **a** (acessível): também exige que o documento tenha uma estrutura marcada (títulos, parágrafos, ordem de leitura), para que leitores de tela possam lê-lo. Para isso, o documento original precisa ter sido criado com essa estrutura.
- **u** (Unicode): além do nível b, garante que o texto possa ser extraído e pesquisado corretamente.

A nossa ferramenta gera PDF/A-1b, 2b e 3b, que cobrem o que a grande maioria dos procedimentos exige.

## Como converter um PDF em PDF/A

1. Abra o [PDF para PDF/A](tool:pdf-to-pdfa) e escolha um ou mais PDFs (até 5 de uma vez, de até 15 MB cada).
2. Escolha a **Versão do PDF/A**: se o procedimento não indicar outra, **PDF/A-2b**.
3. Clique em **Converter para PDF/A** e baixe o resultado.

![A ferramenta PDF para PDF/A com um documento escolhido e a versão 2b selecionada](shot:pdfa-opciones "O PDF/A-2b vem selecionado por padrão: é o mais aceito.")

A conversão é feita **no nosso servidor**, não no seu navegador, porque precisa converter fontes e cores com o LibreOffice. O arquivo viaja por uma conexão criptografada e é processado na memória, sem ser armazenado. Nos nossos testes, os arquivos gerados passam na validação do veraPDF, o validador de referência para PDF/A.

## O que pode mudar na conversão

O conteúdo e as páginas são mantidos, mas há detalhes que o formato não permite:

- **Senha**: um PDF/A não pode ser criptografado. Se o seu PDF tem senha, tire-a antes com o [Remover senha de PDF](tool:unlock-pdf).
- **Links e formulários interativos**: podem se perder. Se o PDF for um formulário, preencha-o antes com o [Preencher formulário PDF](tool:fill-pdf-form) e salve-o achatado.
- **Transparências no PDF/A-1b**: são achatadas. Na prática quase não se nota, mas, se o documento usa efeitos de transparência, o PDF/A-2b os mantém.
- **Assinaturas digitais com certificado**: converter o PDF modifica o arquivo, e uma assinatura digital anterior deixa de valer. Se você precisa assinar digitalmente, converta para PDF/A primeiro e assine depois.

## Como saber se um PDF já é PDF/A

Quando você abre um PDF/A no Adobe Acrobat Reader, uma barra no topo avisa que o arquivo declara estar em conformidade com o padrão PDF/A e que foi aberto somente para leitura. Outros leitores mostram essa informação nas propriedades do documento.

Atenção: essa barra significa que o arquivo **declara** ser PDF/A, não que ele realmente seja. Para conferir, a ferramenta de referência é o veraPDF, um validador gratuito e de código aberto que testa o arquivo contra a norma e lista as falhas que encontrar.

## Dicas para um envio que não seja recusado

- **Comprima antes, não depois**: se o procedimento tem limite de tamanho, reduza o PDF com o [Comprimir PDF](tool:compress-pdf) e depois converta para PDF/A. Se você comprimir um PDF/A com uma ferramenta que não leva isso em conta, ele pode deixar de cumprir a norma.
- **Junte antes de converter**: se você precisa enviar vários documentos como um só, combine-os com o [Juntar PDF](tool:merge-pdf) e converta o resultado.
- **Digitalizações**: se o documento for digitalizado, passe-o antes pelo [OCR](tool:ocr-pdf) para que o texto possa ser pesquisado, e depois converta.
- **Assinatura de próprio punho**: se você precisa assinar à mão, coloque a assinatura com o [Assinar PDF](tool:sign-pdf) antes de converter.

## Resumo

- PDF/A é um PDF para arquivamento: incorpora as fontes, fixa as cores e proíbe o que possa parar de funcionar.
- Órgãos públicos, tribunais, universidades e arquivos exigem esse formato.
- Se não indicarem a versão, use **PDF/A-2b**; **1b** só para sistemas antigos, **3b** se você precisa de anexos.
- O [PDF para PDF/A](tool:pdf-to-pdfa) converte no nosso servidor, sem armazenar o arquivo.
- Tire a senha, preencha os formulários, comprima e junte **antes** de converter.
`;

export default body;
