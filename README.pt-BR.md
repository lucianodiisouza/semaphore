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

## Desenvolvimento

Requisitos: Rust (stable), Node.js 20+, npm.

```bash
npm install
npm run tauri dev          # app em modo dev
npm run tauri build        # bundle de release
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

## Modo furtivo

Oculta o widget de muitas ferramentas de captura de tela. Funciona melhor no Windows; no macOS 15+ alguns apps ainda podem capturar. Ative em Configurações ou no menu do tray.

---

## Licença

MIT. Veja [LICENSE](LICENSE).
