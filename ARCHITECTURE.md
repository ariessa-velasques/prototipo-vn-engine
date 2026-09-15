# Arquitetura do Protótipo

Este documento registra as decisões técnicas do protótipo e conecta cada
requisito (R1–R4) às partes do código que o implementam. O histórico
cronológico das decisões, com contexto e alternativas consideradas, está
em [DECISIONS.md](./DECISIONS.md).

## Visão geral

O protótipo segue a arquitetura padrão de três processos do Electron:

```
┌─────────────────────────────────────────────────────┐
│ Processo principal (src/main)                       │
│ Cria a janela nativa da aplicação. Node.js.         │
└───────────────┬─────────────────────────────────────┘
                │ preload (src/preload): ponte segura,
                │ com contextIsolation habilitado
┌───────────────┴─────────────────────────────────────┐
│ Renderer (src/renderer)                             │
│ A interface: aplicação React + TypeScript           │
│ empacotada pelo Vite. Toda a lógica do editor e do  │
│ modo de jogo vive aqui.                             │
└─────────────────────────────────────────────────────┘
```

O mesmo código-fonte gera **dois artefatos** (ver ADR-0010):

- **Ferramenta de autoria** (`npm run build`): o editor completo, com
  quatro modos navegáveis por abas — Editor de cena (R1), Ramificações
  (R4), Menu do jogo e Jogar (preview executável da história) — e as
  ações de arquivo Abrir/Salvar/Exportar no cabeçalho.
- **Jogo exportado** (`npm run build:game` + electron-builder): abre
  direto na experiência de jogo (menu inicial → player), com a história
  de `src/renderer/src/story/story.json` embutida. Como o modo de build é
  constante, o bundler **elimina o código do editor** do artefato do jogo
  (verificado: o bundle do jogo não contém nenhuma referência às telas de
  edição).

A comunicação renderer ↔ processo principal cobre duas
responsabilidades, ambas pela ponte segura do preload (`contextBridge`,
com `contextIsolation`) — o renderer nunca acessa o disco nem executa
processos: ele pede, o processo principal executa.

- **Persistência de projetos** (ADR-0014): `projeto:salvar` /
  `projeto:abrir` — diálogos nativos e leitura/escrita do arquivo
  `.vnproj` (JSON no formato `ProjectFile`: história + imagens
  importadas como data URLs, autocontido e 100% local).
- **Geração do executável do jogo** (ADR-0017): `jogo:exportar` —
  escolha da pasta de destino, gravação da história atual num arquivo
  temporário (apontado ao build pelo alias `@story` via `VN_STORY_PATH`,
  sem tocar o arquivo-fonte), build do renderer em modo `player` e
  empacotamento pelo electron-builder no alvo escolhido, com a saída
  transmitida em tempo real (`jogo:exportar-progresso`).

Todo o restante do editor e do jogo é autocontido no renderer.

## Dependências e por que cada uma foi escolhida

| Dependência | Papel | Justificativa |
| --- | --- | --- |
| **Electron** | Runtime desktop | Empacota a interface web como aplicação desktop nativa e multiplataforma, executável localmente sem servidor nem internet (R3). Alinhado à decisão registrada no artigo do TCC (`../tcc1.tex`, seção de decisões de arquitetura do protótipo). |
| **React** | Biblioteca de interface | Interfaces ricas com manipulação direta de elementos gráficos (galerias clicáveis, preview reativo, grafo interativo) são o caso de uso central de R1 e R4; o modelo declarativo (estado → tela) faz preview, grafo e jogo derivarem do mesmo estado. |
| **TypeScript** | Linguagem | Tipagem estática documenta o modelo de dados (`Story`, `Scene`, `DialogueEntry`, `ChoiceOption`, `ProjectFile`) e previne erros de integração entre editor, grafo e player. |
| **@xyflow/react (React Flow)** | Editor de grafo | Implementa o editor de nós do R4: nós arrastáveis, conexão por gesto, arestas rotuladas, zoom/pan. MIT, sem chamadas de rede, integrada ao modelo declarativo do React (ADR-0007). |
| **electron-vite** | Build e dev server | Integra Electron + Vite com os três processos pré-configurados e HMR; o mecanismo de *modes* do Vite viabiliza o build duplo editor/jogo (ADR-0001, ADR-0010). |
| **electron-builder** | Empacotamento | Gera executáveis autocontidos (Windows/Linux/macOS) a partir do build de jogo — a materialização do "exportar como executável" de R3. |
| **@electron-toolkit/utils / preload** | Utilitários Electron | Auxiliares do template (atalhos de janela, ponte de preload segura). Mantidos por serem pequenos e padrão do ecossistema electron-vite. |

O estado usa React puro (`useState` no topo, fluxo unidirecional — ADR-0002)
e o estilo usa CSS puro (ADR-0005).

**Nenhuma dependência de IA generativa** (R2): não há SDKs de LLM,
chamadas de API externas ou qualquer mecanismo de geração de conteúdo —
verificado também após a adição do React Flow e do pipeline de build. A
CSP declarada em `src/renderer/index.html` bloqueia requisições a
qualquer origem externa, o que torna a propriedade verificável.

## Organização dos componentes

```
App (App.tsx) — escolhe a raiz pelo modo de build (ADR-0010)
│
├── EditorApp (ferramenta de autoria; dona do estado: Story + assets + modo)
│   ├── SceneEditor  ─ modo "Editor de cena" (R1)
│   │   ├── BackgroundPanel ── AssetGallery (galeria genérica + importar)
│   │   ├── CharacterPanel  (elenco da cena: três lugares do palco — ADR-0015;
│   │   │     galeria por PERSONAGEM, expressões agrupadas — ADR-0016)
│   │   ├── ScenePreview ── SceneStage (palco compartilhado)
│   │   └── DialogueEditor (sequência de falas + escolha + próxima cena — ADR-0012)
│   ├── BranchEditor ─ modo "Ramificações" (R4; React Flow)
│   ├── MenuEditor   ─ modo "Menu do jogo" (título + texto "Sobre"; preview do GameMenu)
│   ├── StoryPlayer  ─ modo "Jogar" (percorre a história)
│   └── ExportDialog ─ gerar executável: sistema operacional, destino, progresso (R3)
│
└── GameApp (jogo exportado; usado só no build --mode player)
    ├── GameMenu    (menu inicial — adicional de demonstração, fora de R1–R4)
    └── StoryPlayer ── SceneStage
```

Princípios:

- **Elenco fixo, expressão por fala (ADR-0016):** quem está em cena e
  onde é propriedade da CENA; qual expressão cada um mostra é propriedade
  do MOMENTO da fala. `characters.ts` concentra a convenção de nomes
  (`identidade_expressao`), o agrupamento por personagem e o resolvedor
  `resolveStageCharacters(scene, entryIndex, definitions)` — usado
  igualmente pelo preview e pelo jogo.
- **Cena como sequência (ADR-0012):** a cena é um palco fixo (fundo +
  até três personagens posicionados, ADR-0015) com uma sequência ordenada de falas (`dialogue`); a
  ramificação é uma entrada de escolha nessa sequência (por convenção, a
  última) e a continuação linear entre cenas é o `nextSceneId`.
- **Fluxo de dados unidirecional (ADR-0002):** `EditorApp` guarda o
  objeto `Story` (`types.ts`) e o distribui; os modos emitem eventos de
  mudança. O grafo do `BranchEditor` é **derivação pura** da Story: nós
  vêm das cenas, arestas vêm das opções de escolha e do `nextSceneId`
  (ADR-0012, herdando o princípio da ADR-0008) — editor de cena, grafo e
  jogo nunca divergem porque leem a mesma fonte.
- **Palco único (ADR-0009):** `SceneStage` renderiza a cena tanto no
  preview do editor quanto no jogo — fidelidade WYSIWYG sem duplicação.
- **Player desacoplado da edição (ADR-0009):** `StoryPlayer` recebe a
  `Story` pronta e apenas a percorre; é isso que permite empacotar o jogo
  sem o editor.

## Mapa requisitos → código

| Requisito | Onde está implementado |
| --- | --- |
| **R1 — Edição visual direta** | Modo "Editor de cena": `src/renderer/src/components/SceneEditor.tsx` (layout), com seleção de fundo em `BackgroundPanel.tsx` (sobre `AssetGallery.tsx`), elenco por lugar do palco em `CharacterPanel.tsx` (ADR-0015) com os sprites agrupados por personagem em `characters.ts` (convenção `identidade_expressao`, ADR-0016), a sequência de falas em `DialogueEditor.tsx` (falante e expressão escolhidos em seletores; texto por formulário) e o resultado em tempo real em `ScenePreview.tsx`/`SceneStage.tsx` (a fala selecionada define o texto e a expressão exibidos). Não existe nenhum campo de código ou script na interface. |
| **R2 — Controle autoral** | Propriedade transversal, verificável por ausência: os únicos pontos de entrada de texto narrativo são `DialogueEditor.tsx` (falas, pergunta e opções de escolha; falante e expressão são seleção, não geração), o título da cena (`SceneEditor.tsx`) e o título/texto "Sobre" do jogo (`MenuEditor.tsx`) — todos digitação manual. Não há dependência nem chamada de IA no projeto (ver tabela de dependências); a CSP (`src/renderer/index.html`) bloqueia qualquer origem externa. |
| **R3 — Execução desktop** | `src/main/index.ts` cria a janela nativa (mesmo processo principal para editor e jogo). Exportação como executável **pela própria interface**: `components/ExportDialog.tsx` (escolha do sistema operacional e da pasta, progresso ao vivo) sobre o IPC `jogo:exportar` em `src/main/index.ts`, que roda o build dedicado do jogo (`App.tsx` + `GameApp.tsx` + história pelo alias `@story` em `electron.vite.config.ts`) e o electron-builder — ADR-0017. Verificado: o artefato roda noutra máquina sem a engine, carregando de `file://` dentro do próprio `app.asar`, e não contém as telas de edição (ADR-0010). O modo "Jogar" do editor e o jogo exportado usam o mesmo `player/StoryPlayer.tsx`. Persistência local de projetos (`.vnproj`) via IPC + diálogos nativos (`src/main/index.ts`, `src/preload/index.ts` — ADR-0014); importação de imagens 100% local como data URLs (`AssetGallery.tsx`). |
| **R4 — Edição visual de ramificações** | Modelo de dados em `types.ts` (`DialogueChoice` com `ChoiceOption[]`, `Scene.nextSceneId`, `Scene.graphPosition` — ADR-0012). Criação/edição da escolha e das opções (com destino escolhido ou criado na hora) em `DialogueEditor.tsx`. Modo "Ramificações": `BranchEditor.tsx` (grafo React Flow — cada `Scene` é um nó; aresta rotulada por opção de escolha, aresta tracejada para `nextSceneId`; conectar por arrasto, duplo clique abre a cena). No jogo, a escolha vira botões em `player/StoryPlayer.tsx`. |

*(O menu inicial do jogo — `player/GameMenu.tsx` — e seu editor —
`components/MenuEditor.tsx` — são adicionais de demonstração e
deliberadamente não constam na tabela: não derivam de nenhum requisito do
mapeamento sistemático; ver ADR-0011 e ADR-0013.)*

## Limites conhecidos desta etapa

- A geração do executável roda a cadeia de build do projeto, então exige
  o editor executando a partir do código-fonte com as dependências
  instaladas; um editor já empacotado detecta e informa (ADR-0017). A
  solução de produção seria distribuir runtimes pré-compilados por
  plataforma junto do editor.
- Alvos cruzados dependem do ambiente: gerar `.exe` a partir de Linux
  exige wine; `.dmg` exige macOS. Gerar para o sistema em que o editor
  roda sempre funciona. O pipeline foi validado ponta a ponta pela
  interface, com o executável Linux (AppImage) rodando fora do projeto.
- Sem validação de fluxos quebrados/cenas órfãs no grafo (fora do escopo
  desta etapa); no jogo, um destino inexistente encerra a história.
- Entrada, saída e reposicionamento de personagem no meio de uma cena
  estão fora de escopo por decisão de modelo (ADR-0016): o elenco é fixo
  por cena, e a forma de expressar essas mudanças é encadear outra cena
  com `nextSceneId`.
