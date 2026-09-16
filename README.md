# Protótipo — Engine No-Code para Criação de Visual Novels

Protótipo exploratório desenvolvido como parte do TCC em Engenharia de
Software (Unipampa). O objetivo é demonstrar visualmente os quatro
requisitos derivados do mapeamento sistemático da literatura conduzido no
TCC1:

- **R1 — Edição visual direta:** o escritor monta uma cena escolhendo
  fundo, personagem e texto de diálogo por interface gráfica, sem nenhum
  campo de código ou script.
- **R2 — Controle autoral pelo escritor:** a ferramenta não gera texto nem
  narrativa automaticamente; todo conteúdo é digitado ou escolhido
  manualmente. Não há qualquer integração com IA generativa.
- **R3 — Execução desktop:** a aplicação roda localmente via Electron, sem
  servidor e sem internet; o jogo criado é exportável como executável
  independente, sem as telas de edição.
- **R4 — Edição visual de ramificações:** editor de grafo de nós em que
  cada cena é um nó e cada escolha de diálogo é uma conexão rotulada até a
  cena de destino.

A fundamentação dos requisitos está no artigo do TCC (`../tcc1.tex`,
seção "Desenvolvimento"). As decisões técnicas estão documentadas em
[ARCHITECTURE.md](./ARCHITECTURE.md) e o histórico de decisões em
[DECISIONS.md](./DECISIONS.md).

## Estado atual

Uma cena é um **palco fixo** (fundo + personagem) sobre o qual corre uma
**sequência ordenada de falas** (ADR-0012); a ramificação é uma escolha
ao final da sequência, e cenas podem se encadear automaticamente
(`nextSceneId`). A ferramenta de autoria tem quatro modos, navegáveis
pelas abas do topo:

1. **Editor de cena (R1):** galeria de fundos; elenco pelos três lugares
   do palco (esquerda/centro/direita — escolha o lugar, clique no
   personagem; até três em cena, fixos durante toda a cena); preview em
   tempo real no estilo visual novel clássico e, abaixo do palco, a
   sequência de diálogo: adicionar/editar/remover falas (quem fala,
   com que expressão, e o texto), converter
   a última fala numa escolha (pergunta + opções, cada uma apontando para
   uma cena existente ou criada na hora), definir a próxima cena ou criar
   uma com "+ Criar próxima cena". A fala selecionada aparece no palco.
   *Elenco múltiplo, expressões por fala e importação de imagens são
   adições posteriores ao requisito básico — ver seção
   "Funcionalidades adicionadas".* Importação de imagens do computador
   do escritor (salvas junto com o projeto). **Sprites de personagem**
   seguem a convenção de nome
   `personagem_expressao.png` (ex.: `maria_triste.png`): ao importar
   vários arquivos, as expressões do mesmo personagem são agrupadas
   sozinhas; sem "_" no nome, o arquivo vira um personagem de expressão
   única.
2. **Ramificações (R4):** grafo da história (React Flow). Aresta rotulada
   = opção de escolha; aresta tracejada = continuação automática
   (`nextSceneId`). "+ Nova cena" cria um nó; arrastar do conector de um
   nó até outro conecta cenas; duplo clique abre a cena no editor.
3. **Menu do jogo:** edita o título do jogo e o texto da tela "Sobre"
   (autoria, créditos), com preview ao vivo do menu (estrutura fixa:
   Jogar, Sobre, Sair — **adicional de demonstração, adicionado depois
   e fora do escopo formal R1–R4**, ADR-0011/0013).
4. **Jogar:** percorre a história em tela cheia — cada clique avança uma
   fala; a escolha mostra as opções como botões; sem escolha e sem
   próxima cena, fim.

No cabeçalho, **Abrir / Salvar** persistem o projeto num arquivo único
`.vnproj` (história + imagens importadas, como data URLs — autocontido e
100% local; **funcionalidade adicionada depois, fora de R1–R4**,
ADR-0014), **⤓ Gerar executável** (ao lado de "Jogar") produz o jogo
como aplicativo independente para Windows, Linux ou macOS (refinamento
posterior de R3, ADR-0017), e **Exportar .json** baixa o projeto no
mesmo formato embutido no jogo.

O **jogo exportado** abre no menu inicial e roda a história embutida no
executável — incluindo imagens importadas pelo escritor.

Ainda não implementado (etapas futuras): validação de fluxos
quebrados/cenas órfãs no grafo; automatizar a ponte entre "Exportar jogo"
e o build do executável; **entrada, saída e reposicionamento de
personagem no meio de uma cena** — hoje o elenco é fixo por cena por
decisão de modelo (ADR-0016), e a forma de expressar essas mudanças é
encadear outra cena com "próxima cena".

## Funcionalidades adicionadas além dos requisitos básicos

Os requisitos R1–R4 vêm do mapeamento sistemático do TCC1 e foram
implementados primeiro, na forma mínima descrita no artigo: uma cena com
fundo, **um** personagem e diálogo (R1); nenhuma geração automática (R2);
execução local e build do jogo como executável (R3); grafo de
ramificações (R4). As funcionalidades abaixo foram **adicionadas
depois**, ao longo do desenvolvimento do protótipo, e **não derivam de
nenhum requisito do mapeamento** — surgiram de necessidades práticas de
demonstração e de uso da ferramenta. Cada uma está registrada em uma ADR
própria em [DECISIONS.md](./DECISIONS.md), e nenhuma entra na tabela de
rastreabilidade requisito → código do
[ARCHITECTURE.md](./ARCHITECTURE.md) (ver ADR-0018).

| Funcionalidade | O que faz | Relação com R1–R4 | ADR |
| --- | --- | --- | --- |
| **Menu inicial do jogo + editor de menu** | O jogo exportado abre num menu (Jogar / Sobre / Sair); a aba "Menu do jogo" edita título e texto "Sobre". | Nenhuma — adicional de demonstração da experiência de jogo. | ADR-0011, ADR-0013 |
| **Importação de imagens do escritor** | Fundos e sprites importados do computador, além dos placeholders embutidos. | Extensão de R1 (o requisito fala apenas em *escolher* fundo e personagem). | ADR-0004, ADR-0014 |
| **Persistência de projetos (`.vnproj`)** | Abrir / Salvar no cabeçalho; arquivo único e autocontido (história + imagens importadas). | Nenhuma — o mapeamento não trata de salvar/abrir projetos. Respeita R3 por ser 100% local. | ADR-0014 |
| **Múltiplos personagens por cena** | Até três personagens no palco (esquerda / centro / direita). | Extensão de R1 (o requisito descreve *o* personagem, no singular). | ADR-0015 |
| **Expressões por fala** | Sprites `personagem_expressao` agrupados automaticamente; cada fala escolhe quem fala e com que expressão. | Extensão de R1. | ADR-0016 |
| **Geração do executável pela interface** | Botão "⤓ Gerar executável" com escolha de SO e pasta, sem linha de comando. | Refinamento de R3: o requisito básico (build do jogo como executável) já era atendido por `npm run build:game:*` (ADR-0010); a ação na interface foi adicionada depois. | ADR-0017 |
| **Exportar .json** | Baixa o projeto no formato embutido no jogo. | Ponte manual entre editor e build, anterior à ADR-0017; mantida como apoio. | ADR-0010 |

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org/) 20 ou superior (testado com
Node 24) e npm.

```bash
cd prototipo
npm install
npm run dev       # abre a ferramenta de autoria em modo de desenvolvimento
npm run dev:game  # abre o jogo (história de src/renderer/src/story/story.json)
```

Outros comandos:

```bash
npm run typecheck   # verificação de tipos TypeScript
npm run build       # typecheck + build de produção da ferramenta de autoria
npm run build:game  # typecheck + build de produção do jogo exportado
```

> Se o `npm install` avisar sobre *install scripts* bloqueados
> (`allow-scripts`), aprove-os com
> `npm approve-scripts electron esbuild electron-winstaller` e rode
> `npm rebuild electron esbuild` — o script de instalação do Electron é o
> que baixa o binário da aplicação.

## Exportar o jogo como executável (R3)

Pela própria ferramenta (ADR-0017), sem linha de comando:

1. Clique em **⤓ Gerar executável**, ao lado da aba "Jogar".
2. Escolha o **sistema operacional** — Windows (`.exe`), Linux
   (`AppImage`) ou macOS (`.dmg`).
3. Clique em **"Escolher pasta e gerar"** e indique onde salvar. O
   progresso do build aparece no próprio diálogo; ao final, **"Abrir
   pasta"** mostra o arquivo gerado.

O executável é autocontido: roda em outro computador **sem a engine
instalada**, contém a história e as imagens do projeto e **não inclui as
telas de edição**.

**Requisitos e limites:**

- A geração roda a cadeia de build do projeto, então exige o editor
  executando a partir do código-fonte com as dependências instaladas
  (`npm install`). Um editor já empacotado detecta a situação e explica
  no diálogo em vez de falhar.
- Alvos cruzados dependem do ambiente: gerar `.exe` a partir do Linux
  exige **wine** instalado; gerar `.dmg` exige um computador **macOS**.
  Gerar para o sistema em que o editor está rodando sempre funciona.

Os mesmos artefatos também podem ser gerados por linha de comando:

```bash
npm run build:game:win     # Windows (.exe, instalador NSIS)
npm run build:game:linux   # Linux (AppImage)
```

Nesse caso os artefatos vão para `dist/`, e a história embutida é a de
`src/renderer/src/story/story.json` (ou a de `VN_STORY_PATH`, se
definida).

## Estrutura de pastas

```
prototipo/
├── README.md                  # este arquivo
├── ARCHITECTURE.md            # decisões técnicas e mapa requisitos → código
├── DECISIONS.md               # log de decisões (formato ADR)
├── package.json
├── electron.vite.config.ts    # configuração de build (electron-vite)
├── electron-builder.yml       # configuração de empacotamento (R3)
└── src/
    ├── main/                  # processo principal do Electron (janela nativa — R3)
    ├── preload/               # ponte segura entre main e renderer
    └── renderer/              # a interface (React)
        └── src/
            ├── App.tsx            # raiz: editor ou jogo, conforme o modo de build (R3)
            ├── EditorApp.tsx      # ferramenta de autoria: estado da Story + navegação
            ├── GameApp.tsx        # raiz do jogo exportado (menu + player)
            ├── types.ts           # modelo de dados (Story, Scene, DialogueEntry, CharacterDefinition)
            ├── characters.ts      # convenção nome_expressão, agrupamento e palco (R1)
            ├── assetCatalog.ts    # catálogo dos assets placeholder embutidos
            ├── story/story.json   # história embutida no jogo exportado
            ├── assets/            # CSS + imagens placeholder (SVG)
            │   ├── backgrounds/   # fundos de cena
            │   └── characters/    # sprites de personagem
            ├── components/
            │   ├── SceneEditor.tsx     # modo editor de cena (R1)
            │   ├── BackgroundPanel.tsx # galeria de fundos (R1)
            │   ├── CharacterPanel.tsx  # elenco da cena: lugares + personagens (R1; múltiplos personagens = adicional, ADR-0015)
            │   ├── AssetGallery.tsx    # galeria genérica reutilizada pelos painéis
            │   ├── DialogueEditor.tsx  # falas (quem fala + expressão), escolha, próxima cena (R1/R4)
            │   ├── ScenePreview.tsx    # moldura do preview no editor (R1)
            │   ├── SceneStage.tsx      # palco compartilhado editor/jogo
            │   ├── BranchEditor.tsx    # grafo de ramificações (R4)
            │   ├── MenuEditor.tsx      # editor do menu do jogo (adicional posterior, fora de R1-R4)
            │   └── ExportDialog.tsx    # gerar executável: SO + destino + progresso (R3)
            └── player/
                ├── StoryPlayer.tsx     # modo de jogo (percorre a história)
                └── GameMenu.tsx        # menu do jogo exportado (adicional posterior, fora de R1-R4)
```

Os pontos do código que materializam cada requisito estão comentados com o
número do requisito (ex.: `// R1: ...`, `// R4: ...`).
