export type Locale = "en" | "pt-BR";

export interface LocaleStrings {
  settings: {
    title: string;
    theme: string;
    language: string;
    size: string;
    sizeSmall: string;
    sizeMedium: string;
    sizeLarge: string;
    stealth: string;
    connect: string;
    cancel: string;
    save: string;
    stealthNote: string;
    sounds: string;
    soundsEnabled: string;
    soundsNote: string;
    soundGreen: string;
    soundYellow: string;
    soundRed: string;
    soundPreset: string;
    soundCustom: string;
    soundBrowse: string;
    soundPreview: string;
    soundCustomActive: string;
    soundImportFailed: string;
    soundTooLarge: string;
    soundTooLong: string;
  };
  tools: {
    cursor: string;
    claude: string;
    codex: string;
    gemini: string;
    copilot: string;
    all: string;
    connected: string;
    failed: string;
    installed: string;
    notInstalled: string;
    notConnected: string;
  };
  main: {
    dragHint: string;
    settingsHint: string;
  };
  about: {
    title: string;
    description: string;
    lights: string[];
    controlsTitle: string;
    controls: string[];
    trayTitle: string;
    trayMenu: string[];
  };
  onboarding: {
    title: string;
    welcomeTitle: string;
    welcomeBody: string;
    lightsTitle: string;
    toolsTitle: string;
    toolsBody: string;
    toolsEmpty: string;
    connectSelected: string;
    doneTitle: string;
    doneBody: string;
    next: string;
    back: string;
    skip: string;
    finish: string;
    connecting: string;
  };
}

export const locales: Record<Locale, LocaleStrings> = {
  en: {
    settings: {
      title: "Settings",
      theme: "Theme",
      language: "Language",
      size: "Size",
      sizeSmall: "Small",
      sizeMedium: "Medium",
      sizeLarge: "Large",
      stealth: "Stealth mode (hide from screen share)",
      connect: "Connect tools",
      cancel: "Cancel",
      save: "Save",
      stealthNote:
        "Stealth works best on Windows. On macOS 15+ some capture tools may still record the window.",
      sounds: "Notification sounds",
      soundsEnabled: "Play a sound when the light changes",
      soundsNote: "Custom files must be under 512 KB and 3 seconds. Built-in sounds are short tones.",
      soundGreen: "Green (ready)",
      soundYellow: "Yellow (thinking)",
      soundRed: "Red (writing)",
      soundPreset: "Sound",
      soundCustom: "Custom file…",
      soundBrowse: "Browse…",
      soundPreview: "Preview",
      soundCustomActive: "Using custom file",
      soundImportFailed: "Could not import audio file. Check format and size.",
      soundTooLarge: "File is too large (max 512 KB).",
      soundTooLong: "Audio is too long (max 3 seconds).",
    },
    tools: {
      cursor: "Cursor",
      claude: "Claude Code",
      codex: "Codex CLI",
      gemini: "Gemini CLI",
      copilot: "Copilot CLI",
      all: "Connect all",
      connected: "Connected",
      failed: "Install failed",
      installed: "Installed",
      notInstalled: "Not found",
      notConnected: "Not connected",
    },
    main: {
      dragHint: "Drag to move · Double-click for settings",
      settingsHint: "Double-click to open settings",
    },
    about: {
      title: "About Semaphore",
      description:
        "Floating traffic light for AI coding agents. See at a glance when your agent is idle, thinking, or writing files.",
      lights: [
        "Green — ready for a new task",
        "Yellow — thinking / running tools",
        "Red — writing or editing files",
      ],
      controlsTitle: "Controls",
      controls: [
        "Drag the traffic light body to move the widget",
        "Double-click the traffic light to open Settings",
        "Left-click the tray icon to show the widget",
      ],
      trayTitle: "Tray menu (right-click tray icon)",
      trayMenu: [
        "Show Semaphore — show the floating widget",
        "Hide Window — hide the widget",
        "Settings — open this window",
        "Toggle Stealth — hide from screen capture",
        "Always on Top — keep the widget above other windows",
        "Horizontal — lay out the traffic light side by side",
        "Quit — exit Semaphore",
      ],
    },
    onboarding: {
      title: "Welcome to Semaphore",
      welcomeTitle: "Your AI agent traffic light",
      welcomeBody:
        "Semaphore floats on your desktop and shows what your AI coding tools are doing — without switching windows.",
      lightsTitle: "The three lights",
      toolsTitle: "Connect your tools",
      toolsBody: "We found these AI tools on your system. Select the ones you want to connect:",
      toolsEmpty: "No AI tools detected. You can connect them later in Settings.",
      connectSelected: "Connect selected",
      doneTitle: "You're all set!",
      doneBody:
        "Drag the semaphore to move it. Double-click to open settings. Use the tray icon for quick access.",
      next: "Next",
      back: "Back",
      skip: "Skip",
      finish: "Get started",
      connecting: "Connecting…",
    },
  },
  "pt-BR": {
    settings: {
      title: "Configurações",
      theme: "Tema",
      language: "Idioma",
      size: "Tamanho",
      sizeSmall: "Pequeno",
      sizeMedium: "Médio",
      sizeLarge: "Grande",
      stealth: "Modo stealth (ocultar no compartilhamento de tela)",
      connect: "Conectar ferramentas",
      cancel: "Cancelar",
      save: "Salvar",
      stealthNote:
        "Stealth funciona melhor no Windows. No macOS 15+ algumas ferramentas ainda podem capturar a janela.",
      sounds: "Sons de notificação",
      soundsEnabled: "Tocar um som quando a luz mudar",
      soundsNote: "Arquivos personalizados devem ter até 512 KB e 3 segundos. Sons integrados são tons curtos.",
      soundGreen: "Verde (pronto)",
      soundYellow: "Amarelo (pensando)",
      soundRed: "Vermelho (escrevendo)",
      soundPreset: "Som",
      soundCustom: "Arquivo personalizado…",
      soundBrowse: "Procurar…",
      soundPreview: "Ouvir",
      soundCustomActive: "Usando arquivo personalizado",
      soundImportFailed: "Não foi possível importar o áudio. Verifique formato e tamanho.",
      soundTooLarge: "Arquivo muito grande (máx. 512 KB).",
      soundTooLong: "Áudio muito longo (máx. 3 segundos).",
    },
    tools: {
      cursor: "Cursor",
      claude: "Claude Code",
      codex: "Codex CLI",
      gemini: "Gemini CLI",
      copilot: "Copilot CLI",
      all: "Conectar todas",
      connected: "Conectado",
      failed: "Falha na instalação",
      installed: "Instalado",
      notInstalled: "Não encontrado",
      notConnected: "Não conectado",
    },
    main: {
      dragHint: "Arraste para mover · Duplo clique para configs",
      settingsHint: "Duplo clique para abrir configurações",
    },
    about: {
      title: "Sobre o Semaphore",
      description:
        "Semáforo flutuante para agentes de IA. Veja de relance quando seu agente está ocioso, pensando ou editando arquivos.",
      lights: [
        "Verde — pronto para uma nova tarefa",
        "Amarelo — pensando / executando ferramentas",
        "Vermelho — escrevendo ou editando arquivos",
      ],
      controlsTitle: "Controles",
      controls: [
        "Arraste o corpo do semáforo para mover o widget",
        "Duplo clique no semáforo para abrir Configurações",
        "Clique esquerdo no ícone da bandeja para mostrar o widget",
      ],
      trayTitle: "Menu da bandeja (clique direito no ícone)",
      trayMenu: [
        "Show Semaphore — mostra o widget flutuante",
        "Hide Window — oculta o widget",
        "Settings — abre esta janela",
        "Toggle Stealth — oculta da captura de tela",
        "Always on Top — mantém o widget acima das outras janelas",
        "Horizontal — exibe o semáforo na horizontal",
        "Quit — encerra o Semaphore",
      ],
    },
    onboarding: {
      title: "Bem-vindo ao Semaphore",
      welcomeTitle: "Seu semáforo de agentes de IA",
      welcomeBody:
        "O Semaphore fica flutuando na sua área de trabalho e mostra o que suas ferramentas de IA estão fazendo — sem trocar de janela.",
      lightsTitle: "As três luzes",
      toolsTitle: "Conecte suas ferramentas",
      toolsBody: "Encontramos estas ferramentas de IA no seu sistema. Selecione as que deseja conectar:",
      toolsEmpty: "Nenhuma ferramenta de IA detectada. Você pode conectar depois em Configurações.",
      connectSelected: "Conectar selecionadas",
      doneTitle: "Tudo pronto!",
      doneBody:
        "Arraste o semáforo para mover. Duplo clique para abrir configurações. Use o ícone da bandeja para acesso rápido.",
      next: "Próximo",
      back: "Voltar",
      skip: "Pular",
      finish: "Começar",
      connecting: "Conectando…",
    },
  },
};

export function t(locale: Locale): LocaleStrings {
  return locales[locale] ?? locales.en;
}
