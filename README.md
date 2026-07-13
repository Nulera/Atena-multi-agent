# Atena

> Painel desktop local-first para orquestração de múltiplos agentes de IA.

## Stack

- **Tauri 2** + **React 19** + **TypeScript**
- **Tailwind CSS v4** + shadcn/ui style
- **SQLite** (rusqlite) no backend Rust
- **xterm.js** para terminal integrado

## Funcionalidades

- Workspaces com pasta local vinculada
- Agentes especializados com templates (Frontend, Backend, QA, etc.)
- Terminal integrado por agente com PTY real
- Sessões persistentes com logs salvos localmente
- Multi-painel redimensionável
- Git diff integrado
- Command Palette (Ctrl+K)
- Sistema de temas (5 temas estilo VSCode)
- Segurança: detecção de comandos destrutivos
- 100% local-first, sem backend externo

## Desenvolvimento

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```
