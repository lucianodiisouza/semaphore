# Semaphore

Semáforo flutuante para agentes de IA. Mostra quando o agente está ocioso, pensando ou escrevendo arquivos, sem trocar de janela ou ler o terminal.

| Luz | Significado |
|-----|-------------|
| **Verde** | Pronto para nova tarefa (ocioso) |
| **Amarelo** | Pensando / executando ferramentas |
| **Vermelho** | Escrevendo ou editando arquivos |

O Semaphore fica na bandeja do sistema como um widget sempre visível. As ferramentas de IA enviam atualizações de atividade via **hooks**, e o Semaphore atualiza a luz.

---

## Download

Binários prontos para macOS (Apple Silicon e Intel), Linux e Windows:

**[Baixar último release](https://github.com/lucianodiisouza/semaphore/releases/latest)**

Cada release inclui o app Semaphore (`.dmg`, `.msi`, `.deb` ou `.AppImage`) e o CLI `semctl`, copiado para `~/.semaphore/bin/` na primeira execução.

> **macOS:** Se o sistema disser que o app está *danificado* ou não abrir após o download, veja [Gatekeeper no macOS](#gatekeeper-no-macos-app-danificado-ou-não-abre) abaixo. O app não está corrompido — o macOS bloqueia downloads não assinados por padrão.

---

## Início rápido

1. **Baixe** o release para seu sistema (ou [compile do código-fonte](#desenvolvimento))
2. **Abra o Semaphore**. Ele fica no tray com o widget flutuante
3. **Conclua o onboarding** (primeira abertura) ou abra **Configurações** e conecte suas ferramentas
4. **Use suas ferramentas de IA normalmente**. Os hooks atualizam a luz automaticamente

Pelo terminal:

```bash
semctl install --all
semctl doctor
```

---

## Usando o app

### Mover o widget

**Clique e arraste o corpo do semáforo** (a carcaça escura com as três luzes). Não arraste o espaço vazio ao redor.

Ao passar o mouse, uma dica mostra *"Clique e arraste aqui para mover"*.

### Configurações

- **Passe o mouse** no widget e clique no botão **⚙** (canto superior direito)
- **Clique com o botão direito** no ícone do tray → **Configurações**

Opções: tema, tamanho, idioma, modo furtivo, sempre no topo, sons, conexão de ferramentas, iniciar com o login e lançar junto com as ferramentas.

### Menu do tray

| Item | Ação |
|------|------|
| **Mostrar Semaphore** | Exibe o widget |
| **Ocultar janela** | Esconde o widget |
| **Configurações** | Abre as configurações |
| **Alternar modo furtivo** | Oculta da captura de tela |
| **Sempre no topo** | Mantém acima das outras janelas |
| **Horizontal** | Layout horizontal do semáforo |
| **Testar luzes** | Toca uma melodia curta e alterna verde, amarelo e vermelho |
| **Jogar Genius** | Jogo de memória: repita a sequência clicando nas luzes |
| **Sair** | Encerra o Semaphore |

Clique com o botão esquerdo no ícone do tray para mostrar/focar o widget.

---

## Ferramentas suportadas (v0.1)

| Ferramenta | Status | Instalação |
|------------|--------|------------|
| Cursor | Suportado | Configurações → Conectar, ou `semctl install cursor` |
| Claude Code | Suportado | Configurações → Conectar, ou `semctl install claude-code` |
| Codex CLI | Suportado (hooks Bash; edição de arquivo limitada) | Configurações → Conectar, ou `semctl install codex` |
| Gemini CLI | Suportado | Configurações → Conectar, ou `semctl install gemini-cli` |
| Copilot CLI | Melhor esforço (varia por versão) | Configurações → Conectar, ou `semctl install copilot-cli` |

```bash
semctl install --all
semctl uninstall --all
semctl doctor
```

Detalhes dos hooks por ferramenta: [adapters/README.md](adapters/README.md).

---

## CLI semctl

Após a instalação, o binário fica em `~/.semaphore/bin/semctl`.

```bash
semctl green | yellow | red          # definir estado
semctl status                        # consultar estado
semctl install <ferramenta>          # instalar hooks
semctl install --all
semctl uninstall --all
semctl doctor                        # diagnóstico
semctl launch                        # abrir o app
```

Variáveis de ambiente: `SEMAPHORE_SOCKET`, `SEMAPHORE_BIN`, `SEMAPHORE_SEMCTL`.

---

## Configuração

Arquivo: `~/.semaphore/config.json`

Principais campos: `idle_timeout_secs` (padrão 300), `theme` (`classic`, `minimal`, `neon`), `locale` (`en`, `pt-BR`), `window.size` (`small`, `medium`, `large`), `sounds.enabled`, `autostart`, `launch_with_tools`.

Sons personalizados: `~/.semaphore/sounds/` (máx. 512 KB).

---

## Como funciona

```
Eventos da ferramenta de IA → hooks → sem-hook → semctl → IPC → app Semaphore → UI
```

O estado é agregado por sessão: **vermelho > amarelo > verde**. Sessões inativas expiram após `idle_timeout_secs`.

Documentação completa em inglês: [README.md](README.md) (arquitetura, protocolo IPC, solução de problemas, contribuição).

---

## Solução de problemas

### Gatekeeper no macOS: app danificado ou não abre

Depois de baixar o `.dmg` pelo GitHub, o macOS pode mostrar **"Semaphore" está danificado e não pode ser aberto**. Isso é um aviso de quarentena do Gatekeeper, não um arquivo corrompido. Os releases ainda não são notarizados pela Apple.

Escolha um dos caminhos:

**Opção A — Remover a quarentena (recomendado)**

```bash
xattr -cr /Applications/Semaphore.app
```

Ajuste o caminho se você instalou o Semaphore em outro lugar.

**Opção B — Abrir pelo menu de contexto**

1. Não abra com duplo clique.
2. Clique com o botão direito em **Semaphore** → **Abrir**.
3. Confirme **Abrir** no diálogo.

**Opção C — Ajustes do Sistema**

1. Tente abrir o app uma vez (vai falhar).
2. Abra **Ajustes do Sistema → Privacidade e Segurança**.
3. Clique em **Abrir mesmo assim** na mensagem sobre o Semaphore.

Depois da primeira abertura bem-sucedida, normalmente não é preciso repetir esses passos.

Outros problemas (luz travada, hooks, `semctl doctor`): veja [Troubleshooting no README.md](README.md#troubleshooting).

---

## Desenvolvimento

Requisitos: Rust (stable), Node.js 20+, npm.

```bash
npm install
npm run tauri dev                  # app em modo dev
npm run tauri build                # bundle de release (inclui o plugin Stream Deck)
npm run build:stream-deck          # somente o plugin Stream Deck
cargo build -p semctl --release
cargo test
npm test
```

No Linux, instale dependências WebKit/GTK antes de compilar (veja [README.md](README.md#development)).

---

## Temas e idiomas

Temas: `classic`, `minimal`, `neon` em `src/themes/`.

Idiomas: inglês e português (Brasil). Para contribuir com traduções: [locales/CONTRIBUTING-i18n.md](locales/CONTRIBUTING-i18n.md).

---

## Stream Deck

O Semaphore pode exibir o semáforo diretamente em uma tecla do [Elgato Stream Deck](https://www.elgato.com/en/stream-deck). A tecla é atualizada automaticamente a cada 500 ms — sem precisar pressionar nenhum botão.

| Estado da tecla | Significado |
|-----------------|-------------|
| Círculo verde | Agente ocioso |
| Círculo amarelo | Agente pensando / executando ferramentas |
| Círculo vermelho | Agente escrevendo ou editando arquivos |
| Círculo cinza | App Semaphore não está em execução |

### Requisitos

- **App Stream Deck** v6.0 ou superior (Windows ou macOS; Linux não é suportado oficialmente pela Elgato)
- **Semaphore** em execução em segundo plano para que o socket IPC esteja ativo

### Instalar pelo onboarding

1. Abra o Semaphore pela primeira vez **ou** acesse **Configurações → Sobre → Refazer introdução**
2. Avance até a etapa **Stream Deck**
3. Marque **Instalar plugin do Stream Deck** (desmarcado por padrão) e clique em **Próximo**

O Semaphore copia o plugin para a pasta de plugins da Elgato. Na maioria dos casos o Stream Deck o reconhece sem reinicialização.

> A caixa de seleção só é habilitada quando o app Stream Deck é detectado no sistema. Se estiver cinza, instale o Stream Deck primeiro e refaça o onboarding.

### Instalação manual

1. Compile ou baixe um release do Semaphore (o bundle `.sdPlugin` está incluso em todo release)
2. Copie `com.semaphore.streamdeck.sdPlugin` para a pasta de plugins da Elgato:

| Plataforma | Pasta de plugins |
|------------|-----------------|
| **Windows** | `%APPDATA%\Elgato\StreamDeck\Plugins\` |
| **macOS** | `~/Library/Application Support/com.elgato.StreamDeck/Plugins/` |

3. Reinicie o app Stream Deck se ele estava aberto durante a cópia

### Como funciona

O plugin roda como um processo Node.js separado dentro do Stream Deck. A cada 500 ms ele abre uma conexão de curta duração com o socket IPC do Semaphore, envia `{"cmd":"status"}`, lê a resposta e chama `setImage()` em todas as teclas ativas com essa ação. Quando o Semaphore não está em execução, a tecla exibe um círculo cinza.

---

## Modo furtivo

Oculta o widget de muitas ferramentas de captura de tela. Funciona melhor no Windows; no macOS 15+ alguns apps ainda podem capturar. Ative em Configurações ou no menu do tray.

---

## Licença

MIT. Veja [LICENSE](LICENSE).
