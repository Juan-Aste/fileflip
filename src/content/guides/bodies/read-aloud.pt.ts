const body = `
Fazer o computador ou o celular ler um texto em voz alta serve para muito mais do que parece: revisar algo que você escreveu e pegar erros que os olhos deixam passar, descansar a vista depois de um dia inteiro na frente da tela, ouvir um relatório enquanto cozinha ou caminha, treinar a pronúncia de outro idioma ou simplesmente ler com mais conforto se você tem dislexia ou baixa visão. Este guia mostra as opções que o seu sistema já tem e como fazer isso com a nossa ferramenta [Ler texto em voz alta](tool:text-to-speech), que também lê arquivos PDF e Word e fotos de documentos.

## Opção 1: o que o seu sistema já tem

Todo sistema operacional atual tem um recurso para ler textos em voz alta. Vale conhecê-los porque funcionam em qualquer programa:

- **Windows**: o navegador Edge tem o **Ler em voz alta** (no menu ou com Ctrl + Shift + U) para páginas da web e PDFs abertos nele. Para o sistema inteiro existe o **Narrador** (Ctrl + Windows + Enter), pensado para pessoas cegas, com muitos atalhos.
- **Mac**: em **Ajustes do Sistema → Acessibilidade → Conteúdo Falado**, ative **Falar seleção**. Depois, selecione qualquer texto e pressione Option + Esc.
- **iPhone e iPad**: em **Ajustes → Acessibilidade → Conteúdo Falado**, ative **Falar Seleção** (aparece a opção “Falar” quando você seleciona um texto) e **Falar Tela** (deslize dois dedos para baixo a partir do topo da tela).
- **Android**: em **Configurações → Acessibilidade**, ative o recurso **Selecionar para ouvir**. Os nomes podem variar um pouco conforme a marca do celular.
- **Microsoft Word**: na guia **Revisão**, o **Ler em Voz Alta** lê o documento a partir de onde está o cursor.

Esses recursos são práticos para ler um parágrafo, mas têm limites: nem todos leem arquivos que não estão abertos, não destacam a frase que está sendo lida ou não permitem salvar o áudio.

## Opção 2: Ler texto em voz alta, no navegador

O [Ler texto em voz alta](tool:text-to-speech) reúne numa só página o que costuma faltar:

- Lê **texto colado** ou **arquivos**: TXT, Markdown, HTML, PDF com texto, Word (DOCX), EPUB e também fotos ou digitalizações de uma página, cujo texto ele reconhece com OCR.
- **Destaca a frase** que está sendo lida, para você acompanhar com os olhos.
- Você pode **pausar**, voltar à frase anterior, pular para a próxima e escolher a **velocidade**, de 0,5× a 2×.
- Detecta o **idioma** do texto (português, inglês, espanhol, francês ou chinês) e escolhe uma voz nesse idioma.
- Com a **voz IA**, você pode **baixar a leitura em MP3**.

### Passo a passo

1. Abra o [Ler texto em voz alta](tool:text-to-speech).
2. Cole o texto na caixa, ou clique em **Abrir arquivo** e escolha um PDF, um Word, um EPUB ou uma foto.
3. Escolha o tipo de voz: **Vozes do dispositivo** ou **Voz IA**.
4. Confira o idioma, a voz e a velocidade.
5. Clique em **Reproduzir**. A barra de espaço pausa e continua.

![A ferramenta Ler texto em voz alta com um texto colado e a voz IA selecionada](shot:leer-en-voz-alta "Você pode ouvir com as vozes do seu aparelho ou com uma voz IA mais natural, que também permite baixar um MP3.")

O texto é extraído e lido no seu aparelho: o arquivo nunca é enviado a um servidor. São aceitos até 50.000 caracteres por leitura, cerca de 15 a 20 páginas de texto corrido; se o texto for maior, ele é cortado e você é avisado.

## Vozes do dispositivo ou voz IA

**Vozes do dispositivo**: são as que vêm com o seu sistema ou navegador. Começam a ler na hora e não baixam nada. A qualidade depende muito do aparelho: num Mac ou num iPhone costumam soar bem; em alguns aparelhos com Windows ou Android, mais robóticas. Se não houver nenhuma voz instalada para o seu idioma, a ferramenta avisa, e você pode instalar vozes nos ajustes do sistema.

Um detalhe de privacidade: algumas vozes do navegador, marcadas como **“online”** (como as do Google ou da Microsoft no Chrome e no Edge), enviam o texto para esse provedor gerar o áudio. Se o texto for privado, escolha uma voz que não esteja marcada como “online”.

**Voz IA**: um modelo de síntese de voz (Supertonic 3) que roda dentro do seu navegador. Soa mais natural, tem 10 vozes e permite **baixar um MP3**. Em troca:

- Na primeira vez, baixa cerca de 400 MB (depois fica guardado no navegador).
- Gera o áudio no processador do seu aparelho: num computador, leva mais ou menos o mesmo tempo que o áudio dura; num celular, bem mais.
- Está disponível em português, inglês, espanhol e francês. O chinês é lido com as vozes do dispositivo.

Se você vai ouvir algo uma vez, agora, as vozes do dispositivo bastam. Se quer um áudio para ouvir depois, no carro ou no celular sem internet, use a voz IA e baixe o MP3.

## Como ouvir um PDF

Abra o PDF com **Abrir arquivo**. Se o PDF tiver texto digital, ele é extraído na hora. Algumas dicas:

- **Cabeçalhos e números de página** que se repetem em todas as páginas aparecem no texto. Você pode apagá-los na caixa antes de reproduzir.
- Se o PDF for **digitalizado**, ele não tem texto e a ferramenta avisa. Passe-o antes pelo [OCR de PDF digitalizado](tool:ocr-pdf) e abra o PDF que ele devolve, ou tire uma foto da página e abra direto: a ferramenta reconhece texto em imagens.
- Um **livro EPUB** abre direto, a não ser que tenha proteção contra cópia (DRM), como muitos livros comprados em lojas.

## Usos que vale a pena experimentar

- **Revisar o que você escreveu**: ouvir o seu texto em velocidade normal revela palavras repetidas, frases longas demais e erros que os olhos deixam passar.
- **Estudar**: ouvir as anotações enquanto as acompanha com os olhos ajuda a fixar o conteúdo. Em 1,25× ou 1,5× você aproveita melhor o tempo.
- **Idiomas**: escolha a voz do idioma que você está aprendendo e diminua a velocidade para ouvir a pronúncia.
- **Acessibilidade**: para quem tem dislexia, baixa visão ou vista cansada, ler com a frase destacada torna os textos longos mais confortáveis.

## Se você for publicar o áudio

Você pode usar o MP3 gerado com a voz IA, mas a licença do modelo pede que você informe que se trata de uma voz gerada por IA e proíbe usá-la para se passar por outras pessoas, difamar, assediar ou enganar. O link para a licença completa fica ao lado do botão de download.

## O caminho inverso

Se você precisa do contrário, transformar em texto o que alguém disse numa gravação ou num áudio do WhatsApp, o guia [Como transcrever um áudio ou mensagem de voz para texto de graça](guide:transcribe-audio) explica como fazer isso com o [Transcrever áudio para texto](tool:audio-to-text), também no seu navegador.

## Resumo

- O seu sistema já lê em voz alta: Edge e Narrador no Windows, “Conteúdo Falado” no Mac e no iPhone, “Selecionar para ouvir” no Android.
- O [Ler texto em voz alta](tool:text-to-speech) lê texto, PDF, Word, EPUB e fotos, destaca a frase e permite escolher a velocidade, sem enviar o arquivo.
- As vozes do dispositivo começam na hora; a voz IA soa mais natural e permite baixar um MP3.
- Evite as vozes “online” se o texto for privado.
`;

export default body;
