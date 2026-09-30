# Platform Shell

The Platform Shell is the first runnable host for the completed FREEzzz Platform architecture.

It composes existing platform contracts without making modules depend on each other. The web entry is Vite-based and starts the Runtime, then exposes diagnostics for the core registry, module manager and capability registry.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The shell is a host/diagnostics surface, not a game. Games and other content are added as independent cores/modules through the existing contracts.
