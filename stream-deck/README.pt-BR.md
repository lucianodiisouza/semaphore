# Semaphore para Stream Deck

Mostre o status do seu agente de IA nas teclas do Elgato Stream Deck — verde (ocioso), amarelo (pensando) ou vermelho (escrevendo arquivos).

> **Este plugin não funciona sozinho.** É necessário instalar e manter em execução o app gratuito [Semaphore](https://github.com/lucianodiisouza/semaphore). O plugin lê o estado do agente pelo Semaphore; ele **não** se conecta ao Cursor nem a outras ferramentas de IA diretamente.

---

## Requisitos

| Requisito | Detalhes |
|-----------|----------|
| **App Semaphore** | [Baixar último release](https://github.com/lucianodiisouza/semaphore/releases/latest) — deve estar rodando em segundo plano |
| **Software Stream Deck** | v6.9 ou superior (Windows ou macOS) |
| **Hooks das ferramentas de IA** | Seu agente (ex.: Cursor) deve estar conectado ao Semaphore |

O Stream Deck não é suportado oficialmente no Linux.

---

## Configuração rápida

### 1. Instalar o Semaphore

1. Baixe o Semaphore para seu sistema em [GitHub Releases](https://github.com/lucianodiisouza/semaphore/releases/latest).
2. Instale e abra o app. Ele fica na bandeja do sistema.

### 2. Conectar suas ferramentas de IA

Na primeira abertura, conclua o onboarding, **ou** abra **Configurações → Ferramentas** e conecte suas ferramentas (ex.: Cursor).

Pelo terminal (opcional):

```bash
semctl install --all
semctl doctor
```

### 3. Instalar este plugin

Se você instalou pelo **Marketplace da Elgato**, o plugin já está no Stream Deck — pule para o passo 4.

Caso contrário, instale pelo onboarding do Semaphore:

1. Abra **Configurações → Sobre → Refazer introdução**
2. Avance até a etapa **Stream Deck**
3. Marque **Instalar plugin do Stream Deck** e clique em **Próximo**

> A caixa só é habilitada quando o Stream Deck está instalado. Se estiver cinza, instale o Stream Deck primeiro e refaça o onboarding.

### 4. Adicionar ações ao Stream Deck

1. Abra o app Stream Deck.
2. Encontre a categoria **Semaphore** na lista de ações.
3. Arraste uma ação para uma tecla:

| Ação | Uso |
|------|-----|
| **Semaphore Light** | Uma tecla que muda de cor automaticamente |
| **Green Light** | Acende quando o agente está ocioso |
| **Yellow Light** | Acende quando o agente está pensando |
| **Red Light** | Acende quando o agente está escrevendo arquivos |

**Dica:** Coloque **Green**, **Yellow** e **Red Light** em três teclas lado a lado para montar um semáforo completo.

As teclas são atualizadas a cada **500 ms** — sem precisar apertar botões.

---

## Significado das cores

| Cor da tecla | Significado |
|--------------|-------------|
| **Verde** | Agente ocioso e pronto para nova tarefa |
| **Amarelo** | Agente pensando ou executando ferramentas |
| **Vermelho** | Agente escrevendo ou editando arquivos |
| **Cinza** | Semaphore não está em execução (ou não conectado) |

---

## Solução de problemas

### Teclas ficam cinzas

- **Semaphore não está rodando** — abra o app pela bandeja do sistema ou menu Iniciar.
- **Ferramentas de IA não conectadas** — abra **Configurações → Ferramentas** no Semaphore e conecte seu agente.
- **Stream Deck precisa reiniciar** — feche e abra o app Stream Deck após instalar o plugin.

### Teclas não mudam de cor

- Confirme que os hooks estão instalados (`semctl doctor` no terminal).
- Use seu agente normalmente — a luz atualiza quando o Semaphore recebe eventos de atividade.

### Plugin não aparece no Stream Deck

- Confirme que o Stream Deck está na **v6.9+**.
- Reinstale pelo onboarding do Semaphore (passo 3 acima) ou reinicie o Stream Deck.

---

## Como funciona

```
Agente de IA (Cursor, etc.)
        ↓ hooks
   App Semaphore (desktop)
        ↓ IPC (pipe/socket local)
   Plugin Stream Deck  →  imagens das teclas atualizadas
```

O plugin consulta o Semaphore a cada 500 ms. Com o Semaphore fechado, as teclas ficam cinzas.

---

## Links

- **App Semaphore e documentação:** [github.com/lucianodiisouza/semaphore](https://github.com/lucianodiisouza/semaphore)
- **Reportar problemas:** [GitHub Issues](https://github.com/lucianodiisouza/semaphore/issues)

---

## Licença

MIT — veja [LICENSE](../LICENSE) no repositório principal.
