# Log de Decisões (ADR)

Registro cronológico das decisões de implementação não triviais do
protótipo, no formato de *Architecture Decision Records* curtos. Cada
entrada: data, decisão, contexto e justificativa. Novas decisões são
adicionadas ao final.

---

## ADR-0001 — Scaffolding com electron-vite (2026-09-03)

**Decisão:** usar o electron-vite (template `react-ts`, via
`npm create @quick-start/electron`) como base do projeto, em vez de
Electron Forge ou configuração manual.

**Contexto:** a stack Electron + React + TypeScript já estava definida no
artigo do TCC; faltava escolher a ferramenta de build/estrutura.

**Justificativa:** o electron-vite gera a estrutura canônica de três
processos do Electron (main / preload / renderer) já integrada com React,
TypeScript e HMR, e traz o electron-builder configurado — o que sustenta
R3 (empacotar como executável) sem trabalho adicional. O Electron Forge é
a ferramenta oficial, mas seu template `vite-typescript` não inclui React,
exigindo configuração manual extra sem benefício para um protótipo
exploratório.

---

## ADR-0002 — Estado com React puro, sem biblioteca de estado (2026-09-03)

**Decisão:** o estado do editor vive em `useState` no componente
`SceneEditor`, que centraliza o objeto `Scene` e o distribui aos filhos
via props. Nenhuma biblioteca de estado (Redux, Zustand etc.).

**Contexto:** a etapa 1 tem uma única tela e um único objeto de estado
pequeno (fundo, personagem, posição, nome, texto).

**Justificativa:** uma biblioteca de estado adicionaria conceitos e
dependências sem resolver nenhum problema existente nesta escala — o
fluxo unidirecional do React (estado desce, eventos sobem) já garante a
sincronia entre painéis e preview, que é o comportamento central de R1.
**Decisão revisável:** quando o editor de ramificações (R4) introduzir
várias cenas e estado compartilhado entre telas, reavaliar (candidata:
Zustand, pela simplicidade).

---

## ADR-0003 — Modelo de dados `Scene` como unidade independente (2026-09-03)

**Decisão:** definir a cena como um objeto `Scene` plano
(`types.ts`): fundo, personagem, posição, nome de quem fala e texto —
referenciando assets por id, não por caminho de arquivo.

**Contexto:** o escritor nunca vê esse modelo como texto (R1); ele é
manipulado apenas pela interface. Mas o formato precisa já nascer
preparado para o R4.

**Justificativa:** uma cena autocontida e serializável é exatamente o que
um nó do futuro editor de grafo (R4) vai referenciar, e o que a futura
persistência vai salvar. Referenciar assets por id permite trocar a
origem da imagem (embutida, importada, futuramente arquivo do projeto)
sem mudar o modelo.

---

## ADR-0004 — Galeria genérica reutilizada + importação local de imagens (2026-09-03)

> **Nota (2026-09-03):** o mecanismo de importação foi atualizado pela
> ADR-0014 — de `URL.createObjectURL` (blob em memória, não persistível)
> para data URLs, o que tornou as imagens importadas salváveis no projeto
> e exportáveis no jogo. A galeria genérica e o princípio "100% local"
> permanecem.

**Decisão:** extrair a galeria de seleção de imagens para um componente
genérico (`AssetGallery`), usado tanto para fundos quanto para sprites, e
oferecer nele a importação de imagens do computador via
`<input type="file">` + `URL.createObjectURL`.

**Contexto:** os dois painéis de R1 têm interação idêntica (escolher
imagem por clique); o protótipo traz placeholders SVG, mas a proposta da
engine é o escritor usar a própria arte.

**Justificativa:** a reutilização evita duplicar a lógica de
seleção/importação e garante interação consistente entre os painéis. A
importação via `URL.createObjectURL` mantém o arquivo inteiramente na
máquina do escritor (sem upload — coerente com R3) e não exige IPC nem
acesso a disco nesta etapa. Limite aceito: imagens importadas vivem só em
memória até existir persistência.

---

## ADR-0005 — Estilo com CSS puro (2026-09-03)

**Decisão:** estilizar com CSS puro em arquivos globais
(`assets/base.css` + `assets/main.css`), sem framework de UI nem
CSS-in-JS.

**Contexto:** a interface desta etapa é um layout único de editor com
identidade visual própria (tema escuro, palco 16:9, caixa de diálogo de
visual novel).

**Justificativa:** um framework de componentes (MUI, Chakra) imporia
estética e abstrações para uma tela que é, na essência, layout
customizado; CSS-in-JS adicionaria dependência sem ganho nesta escala. O
CSP restritivo do Electron também favorece estilos locais simples. Os
nomes de classe seguem os nomes dos componentes para manter
rastreabilidade.

---

## ADR-0006 — CSP restritiva com exceção para `blob:` em imagens (2026-09-03)

**Decisão:** manter a Content Security Policy do template (nenhuma origem
externa permitida) adicionando apenas `blob:` a `img-src`.

**Contexto:** a importação local de imagens (ADR-0004) produz URLs
`blob:`, que a CSP original bloqueava.

**Justificativa:** a CSP restritiva torna R3 (nada é carregado da
internet) uma propriedade verificável da aplicação, não só uma intenção;
`blob:` refere-se a dados já em memória local, não a rede, então a
exceção não enfraquece essa garantia.
---

## ADR-0007 — React Flow (@xyflow/react) para o editor de ramificações (2026-09-03)

**Decisão:** usar a biblioteca React Flow (pacote `@xyflow/react`) para o
grafo de nós do editor de ramificações (R4).

**Contexto:** R4 exige que o escritor crie e visualize o fluxo da
história graficamente: nós arrastáveis, conexões criadas por gesto de
arrastar, arestas rotuladas. Implementar isso à mão (SVG + cálculo de
curvas + drag + viewport com zoom/pan) é um projeto em si.

**Justificativa:** React Flow é a biblioteca de editores de grafo mais
consolidada do ecossistema React (MIT, sem chamadas de rede — coerente
com R2/R3), oferece exatamente o modelo conceitual do R4 (nós, arestas
rotuladas, handles de conexão) e permite manter o grafo como derivação
pura do estado (compatível com o ADR-0002). Alternativas consideradas:
implementação própria em SVG (custo alto sem ganho acadêmico) e
bibliotecas de diagramação genéricas como mxGraph/JointJS (mais pesadas
e menos integradas ao React).

---

## ADR-0008 — Choice como aresta + posição do nó dentro da Scene (2026-09-03)

> **Status: superada pela ADR-0012** (2026-09-03). O modelo de
> `Scene.choices` como array separado de arestas foi substituído pela
> sequência de diálogo com escolha embutida. Os princípios de "grafo como
> projeção pura do mesmo dado" e de `graphPosition` na cena permanecem
> válidos e foram herdados pela ADR-0012.

**Decisão:** modelar a escolha (`Choice { id, text, targetSceneId }`)
como dado da cena de origem — `Scene.choices` são as arestas de saída do
nó — e guardar a posição do nó no grafo (`Scene.graphPosition`) na
própria cena.

**Contexto:** o grafo precisa ser 100% derivável do objeto `Story`
(cenas + escolhas), sem estrutura paralela de "diagrama" para
sincronizar.

**Justificativa:** com escolhas dentro da cena, uma única fonte de
verdade alimenta o editor de cena (painel "Escolhas desta cena"), o
grafo (arestas) e o modo de jogo (botões) — impossível divergirem.
`graphPosition` é metadado de editor, não de narrativa, mas mantê-lo na
cena evita um segundo dicionário a persistir e sincronizar; o modo de
jogo simplesmente o ignora. Trade-off registrado conscientemente.

---

## ADR-0009 — Palco compartilhado (SceneStage) e player desacoplado (2026-09-03)

**Decisão:** extrair a renderização da cena para um componente puro
(`SceneStage`), usado tanto pelo preview do editor (`ScenePreview`)
quanto pelo modo de jogo (`StoryPlayer`); o `StoryPlayer` recebe a
`Story` pronta e não conhece nada da edição.

**Contexto:** o modo de jogo precisava nascer como base da exportação:
o executável distribuído não deve conter telas de edição.

**Justificativa:** o palco único garante fidelidade WYSIWYG (o que o
escritor vê no preview é exatamente o que o jogador vê) sem duplicação.
O player somente leitura, que apenas percorre o grafo (avanço por clique,
escolhas viram botões), é o mesmo componente no editor (aba "Jogar") e no
jogo exportado — testado onde é editado, distribuído sem o editor.

---

## ADR-0010 — Exportação por build dedicado (`--mode player`) com história embutida (2026-09-03)

**Decisão:** o executável do jogo é gerado por um build separado
(`electron-vite build --mode player`), no qual `App.tsx` monta o
`GameApp` (player + menu) em vez do editor, lendo a história de
`src/renderer/src/story/story.json`, embutida em tempo de build. Comandos:
`npm run build:game:win` (Windows) e `npm run build:game:linux` (Linux);
artefatos em `dist/`.

**Contexto:** R3 prevê exportar o jogo como executável independente, sem
expor as telas de edição. Sem persistência ainda (etapa futura), a ponte
entre editor e build é manual: o botão "Exportar história (.json)" no
editor de ramificações baixa o `story.json`, que o desenvolvedor coloca
em `src/renderer/src/story/` antes de rodar o build.

**Justificativa:** como `import.meta.env.MODE` é constante de build, o
bundler elimina o código do editor por *dead code elimination* — foi
verificado que o bundle do jogo não contém nenhuma referência às telas
de edição (React Flow incluso), tornando "não expõe o editor" uma
propriedade do artefato, não uma tela escondida. Limitações aceitas e
documentadas: (1) imagens importadas pelo escritor vivem em memória
(blob) e não entram na exportação — apenas assets embutidos, até existir
persistência; (2) gerar o `.exe` Windows a partir do Linux exige wine
(não instalado na máquina de desenvolvimento) — o mesmo comando funciona
nativamente numa máquina Windows; o pipeline foi validado ponta a ponta
com o executável Linux (AppImage).

---

## ADR-0011 — Menu inicial do jogo como adicional fora de R1–R4 (2026-09-03)

**Decisão:** o jogo exportado abre num menu simples (título, "Novo
Jogo", "Sair") antes do modo de jogo, implementado em
`player/GameMenu.tsx`.

**Contexto:** demonstração da experiência de jogo exportado; nenhum
requisito do mapeamento sistemático pede menu.

**Justificativa:** melhora a demonstração sem custo relevante. Para não
comprometer a rastreabilidade requisito → código, o menu é explicitamente
marcado como adicional de demonstração e NÃO aparece na tabela de
rastreabilidade do ARCHITECTURE.md.

---

## ADR-0012 — Cena como sequência de falas; escolha como entrada da sequência (2026-09-03)

**Substitui a ADR-0008.**

**Decisão:** redesenhar o modelo de dados da cena. `Scene` deixa de ter
uma única fala (`speakerName`/`dialogueText`) e um array separado de
escolhas (`choices: Choice[]`), e passa a ter:

- `dialogue: DialogueEntry[]` — sequência ordenada percorrida com
  "avançar", sobre um palco fixo (fundo + personagem valem para a cena
  inteira). Uma entrada é `line` (speaker + text) ou `choice` (pergunta +
  `options`, cada opção com texto e cena de destino);
- `nextSceneId` — continuação linear automática quando a sequência
  termina sem escolha (ausente = fim da história).

Por convenção guiada pela UI (sem trava rígida), a entrada `choice` é a
última da sequência: depois dela o caminho já se decidiu.

**Contexto:** o modelo anterior (1 fala por cena) não reflete como uma
visual novel real funciona — uma cena tem dezenas de falas sob o mesmo
cenário. Com 1 fala por cena, o escritor seria forçado a criar uma "cena"
por linha de diálogo, explodindo o grafo em um nó por fala e destruindo a
utilidade do editor de ramificações (R4): o grafo mostraria estrutura de
texto, não estrutura de história.

**Justificativa da sequência:** a cena passa a corresponder à unidade
narrativa real (um lugar, um momento, uma conversa), e o nó do grafo
volta a ser significativo — ramos aparecem onde a história de fato
ramifica. A troca de fundo/personagem no meio de uma conversa continua
possível: é uma nova cena ligada por `nextSceneId` (continuação
automática, invisível para o jogador).

**Justificativa da escolha embutida na sequência:** no modelo antigo, a
escolha era um dado paralelo à fala, sem posição no tempo do diálogo —
não dava para dizer "a pergunta aparece DEPOIS destas falas". Como
entrada da sequência, a escolha ganha lugar na linha do tempo da conversa
(a pergunta/gancho é a própria entrada), e o par pergunta → opções fica
autocontido. O princípio da ADR-0008 é herdado: o grafo continua sendo
projeção pura do mesmo dado (arestas = opções da escolha + `nextSceneId`),
sem estrutura própria de diagrama.

**Migração:** sem compatibilidade com o formato antigo (protótipo, sem
dados de usuários); o exemplo "Depois da Aula" foi recriado no novo
modelo, com sequências de 1–4 falas por cena.

---

## ADR-0013 — Editor de menu: estrutura fixa, conteúdo do escritor (2026-09-03)

**Complementa a ADR-0011.**

**Decisão:** nova aba "Menu do jogo" no editor. A estrutura do menu
permanece fixa (Jogar, Sobre, Sair), mas o conteúdo é editável: o título
do jogo e o texto da tela "Sobre" (autoria, créditos) são campos da
`Story` (`title`, `about`), editados em `MenuEditor.tsx` com preview ao
vivo do próprio componente `GameMenu` e exibidos no jogo exportado.

**Contexto:** o menu era estático (ADR-0011); o escritor não tinha onde
declarar autoria no jogo distribuído.

**Justificativa:** coerência com R2 — até o conteúdo institucional do
jogo é texto do escritor, não texto gerado ou fixo da ferramenta. O menu
em si continua adicional de demonstração, fora da tabela de
rastreabilidade R1–R4; o preview reutiliza o componente real do jogo
(mesmo princípio WYSIWYG da ADR-0009).

---

## ADR-0014 — Persistência via IPC + arquivo de projeto autocontido (2026-09-03)

**Decisão:** salvar/abrir projetos em disco com um arquivo único
(`.vnproj`, JSON) no formato `ProjectFile { version, story,
importedBackgrounds, importedCharacters }`. O renderer nunca toca o
disco: os botões Abrir/Salvar do cabeçalho invocam, via preload
(`contextBridge`), os canais IPC `projeto:salvar` / `projeto:abrir`,
resolvidos no processo principal com os diálogos nativos de arquivo. As
imagens importadas passaram a ser lidas como **data URLs** (antes: blob
em memória, ADR-0004), viajando dentro do próprio arquivo de projeto. O
mesmo formato é usado pelo `story.json` embutido no jogo exportado — com
isso, imagens importadas agora também entram no executável, eliminando a
limitação registrada na ADR-0010.

**Contexto:** até aqui a história vivia só em memória; fechar a
ferramenta perdia o trabalho, e a ponte para a exportação dependia de um
download manual sem as imagens do escritor.

**Justificativa:** (1) IPC com `contextIsolation` é o padrão de segurança
do Electron — o renderer pede, o main executa; é também o primeiro uso
real do preload, reservado desde a etapa 1. (2) Arquivo único
autocontido (história + imagens em data URL) mantém o modelo mental de
"um projeto = um arquivo", simples para o público-alvo não-programador, e
continua 100% local (R3). (3) Unificar o formato do projeto salvo e do
projeto embutido no jogo elimina uma conversão e uma classe de
inconsistências. Trade-off aceito: data URLs em JSON crescem ~33% sobre o
binário e ficam inteiras na memória — adequado ao protótipo; uma versão
de produção reavaliaria (ex.: pasta de projeto com assets separados).

---

## ADR-0015 — Múltiplos personagens por cena via lugares fixos do palco (2026-09-03)

**Decisão:** a cena passa de um personagem único (`characterId` +
`characterPosition`) para três **lugares fixos** do palco —
`characters: { esquerda, centro, direita }`, cada um com um sprite ou
vazio. No painel de personagens, o escritor seleciona o lugar e clica no
sprite; um indicador mostra os lugares ocupados. `SceneStage` renderiza
até três sprites (mesma renderização no preview e no jogo, ADR-0009).

**Contexto:** cenas de visual novel comumente têm mais de um personagem
em quadro (diálogo entre dois personagens é o caso típico do gênero).

**Justificativa:** o modelo de lugares (slots) foi escolhido no lugar de
uma lista livre de personagens com coordenadas por três razões: (1) cobre
o layout canônico do gênero (esquerda/centro/direita) sem introduzir
posicionamento por coordenadas, que violaria o espírito de R1 (edição por
seleção, não por números); (2) impossibilita estados inválidos — dois
sprites no mesmo lugar não existem por construção (`Record` por posição);
(3) mantém a UI em um clique: escolher lugar, escolher personagem. O
falante da fala (campo `speaker`) continua independente dos sprites em
cena — narrador e vozes fora de quadro seguem possíveis.

---

## ADR-0016 — Personagem fixo por cena, expressão por fala; sprites agrupados por convenção de nome (2026-09-03)

**Decisão:** três mudanças ligadas entre si.

1. **Convenção de nomenclatura.** O nome do arquivo de sprite (sem
   extensão) é lido como `identidade_expressao` (`maria_triste.png` =
   personagem "maria", expressão "triste"). Sem "_", o nome inteiro é a
   identidade e a expressão é "padrão". Importar vários arquivos agrupa
   automaticamente as expressões sob o mesmo personagem. Os sprites
   embutidos seguem a mesma convenção — o mesmo código agrupa os dois
   casos, sem exceção interna.
2. **Elenco fixo por cena.** `Scene.characters` (os três lugares do
   palco) guarda IDENTIDADES de personagem, definidas no painel lateral e
   válidas para a cena inteira.
3. **Expressão por fala.** `DialogueLine.speaker` deixa de ser texto
   livre e vira `speakerId` (um personagem do elenco DESTA cena) +
   `expression` (uma das variantes carregadas para ele). No editor, o
   seletor de expressão aparece ao lado do de quem fala, populado pelo
   agrupamento; personagens com uma única imagem não exibem o seletor.

**Contexto:** o modelo anterior tinha um sprite fixo por lugar e o nome
do falante como texto livre — não havia como um personagem mudar de
expressão ao longo da conversa, que é o recurso expressivo mais básico do
gênero.

**Justificativa da separação "quem está em cena" × "como está agora":**
são duas perguntas de natureza diferente. Presença e posição são
propriedades da CENA (cenário montado); expressão é propriedade do
MOMENTO da fala. Amarrar cada uma ao seu nível certo elimina, por design,
a pergunta "esse personagem ainda está em cena nesta fala?" — a resposta
é sempre sim, porque o elenco não muda dentro da cena. Isso dispensa
qualquer estado extra de entrada/saída de personagem, qualquer linha do
tempo de presença e qualquer validação de consistência: a estrutura de
dados torna o estado inválido inexpressável. Entrada, saída e
reposicionamento no meio da cena ficam deliberadamente fora de escopo; a
forma de expressá-los no modelo atual é encadear outra cena com
`nextSceneId` (continuação automática, invisível para o jogador).

**Justificativa do speaker estruturado:** com texto livre, "Aiko" e
"aiko " eram falantes diferentes, e nada ligava a fala ao sprite em cena.
Como referência ao elenco, o nome exibido vem do personagem (consistente
em toda a história), a ferramenta sabe qual sprite trocar, e o escritor
escolhe numa lista curta em vez de redigitar. Narração continua possível
com `speakerId` vazio — sem etiqueta de nome, convenção do gênero.

**Justificativa da convenção de nome sobre um cadastro de personagens:**
um formulário de "cadastrar personagem → anexar expressões" seria mais
explícito, mas acrescentaria uma etapa burocrática antes de escrever. A
convenção aproveita algo que o escritor já faz naturalmente (nomear
arquivos) e mantém a promessa do R1: a ferramenta se configura pelo que
foi importado, não por formulários. Custo aceito e documentado: nomes
fora da convenção viram personagens de expressão única.

**Migração:** sem retrocompatibilidade (protótipo). A história de exemplo
foi reescrita com `speakerId`/`expression`, e os sprites embutidos
renomeados para a convenção (`aiko_neutra`, `aiko_feliz`, `aiko_triste`,
`bruno_neutro`, `sakura_neutra`) — a Aiko com três expressões demonstra o
recurso sem o escritor precisar importar nada. O formato de projeto foi
para `version: 2`.

---

## ADR-0017 — Geração do executável disparada pela própria ferramenta (2026-09-03)

**Estende a ADR-0010.**

**Decisão:** a exportação do jogo deixa de ser um procedimento manual de
linha de comando e passa a ser uma ação da interface: o botão
**"⤓ Gerar executável"**, ao lado de "Jogar", abre um diálogo onde o
escritor escolhe o **sistema operacional** (Windows `.exe`, Linux
`AppImage`, macOS `.dmg`) e a pasta de destino. O processo principal
grava o projeto atual num arquivo temporário, roda o build do renderer em
modo `player` e o electron-builder para o alvo escolhido, transmitindo a
saída em tempo real para o diálogo. O artefato final roda numa máquina
sem a engine instalada.

Para não tocar o arquivo-fonte do repositório, a história embutida passou
a ser resolvida pelo alias `@story` (`electron.vite.config.ts`), que
aponta para `VN_STORY_PATH` quando definido — a exportação define essa
variável para o temporário do projeto atual.

**Contexto:** até aqui o executável exigia exportar um `.json`,
substituir um arquivo dentro de `src/` e rodar dois comandos npm. Para o
público-alvo do trabalho — escritores não-programadores — isso reintroduz
exatamente a barreira que R1/R3 existem para remover: a última etapa do
fluxo ("entregar o jogo para alguém jogar") dependia de terminal.

**Justificativa:** distribuir a história é parte do trabalho autoral, não
uma tarefa de build. Colocar a ação ao lado de "Jogar" trata testar e
distribuir como a mesma família de gesto. A escolha explícita de sistema
operacional é necessária porque o artefato é específico de plataforma, e
apresentá-la como três opções nomeadas ("Windows / instalador .exe")
mantém a decisão no vocabulário do escritor, não no do empacotador.
Manter a orquestração no processo principal preserva o modelo de
segurança já adotado (ADR-0014): o renderer não executa processos nem
toca o disco — ele pede, o main executa.

**Limitações assumidas e comunicadas na interface:**
1. A geração roda a cadeia de build do próprio projeto, então só funciona
   com o editor executando a partir do código-fonte, com as dependências
   instaladas. Um editor já empacotado não consegue gerar jogos — o
   diálogo detecta e explica isso em vez de falhar no meio. A solução de
   produção (fora do escopo do protótipo) seria distribuir runtimes
   pré-compilados por plataforma junto do editor, como fazem engines
   consolidadas, copiando-os e injetando a história — sem invocar
   ferramentas de build.
2. Alvos cruzados dependem do ambiente: gerar `.exe` a partir de Linux
   exige wine; `.dmg` exige macOS. Quando o empacotador falha por esse
   motivo, a mensagem de erro diz o porquê em vez de mostrar o log cru.
