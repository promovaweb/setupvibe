# Ink (React/TypeScript) — Framework Guide

## Overview

Ink is a React renderer for the terminal. You write React components with JSX, and Ink renders them to the command line using Yoga for flexbox layout. It supports hooks, functional components, and the full React lifecycle.

**Best for:** Interactive CLIs, dev tools, onboarding flows, installers, quick dashboards. Best JavaScript/TypeScript TUI option available.

---

## Architecture

Ink follows the React component model:

```
render(<App />) → React tree → Yoga flexbox → terminal output
```

- **Components** — Functional React components returning JSX
- **Hooks** — `useInput`, `useApp`, `useFocus`, `useStdout` for terminal interaction
- **Box** — Flex container (like a `<div>` with `display: flex`)
- **Text** — Styled text output (powered by chalk)
- **render()** — Mounts the React tree to the terminal

### Core Interface

```tsx
import React, {useState} from 'react';
import {render, Box, Text, useApp, useInput} from 'ink';

const App = () => {
  const {exit} = useApp();
  const [count, setCount] = useState(0);

  useInput((input) => {
    if (input === 'q') exit();
    if (input === ' ') setCount(c => c + 1);
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Count: {count}</Text>
      <Text dimColor>Space: increment  q: quit</Text>
    </Box>
  );
};

render(<App />);
```

---

## Project Structure (Recommended)

```
myapp/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.tsx            // Entry point, render(<App />)
│   ├── App.tsx             // Root component, screen routing
│   ├── components/
│   │   ├── Sidebar.tsx     // Navigation sidebar
│   │   ├── StatusBar.tsx   // Footer with key hints
│   │   ├── Table.tsx       // Data table component
│   │   └── Input.tsx       // Enhanced input field
│   ├── screens/
│   │   ├── Dashboard.tsx   // Dashboard screen
│   │   ├── Records.tsx     // Records browser
│   │   └── Settings.tsx    // Settings screen
│   ├── hooks/
│   │   ├── useKeymap.ts    // Centralized keybinding hook
│   │   └── useData.ts      // Data fetching hook
│   ├── theme.ts            // Colors, spacing constants
│   └── types.ts            // Shared TypeScript types
```

---

## Styling

### Theme Definition

```tsx
// theme.ts
export const colors = {
  base: '252',        // Light gray
  muted: '243',       // Mid gray
  accent: '86',       // Cyan
  error: '203',       // Red
  success: '78',      // Green
  warning: '221',     // Yellow
} as const;

export const spacing = {
  xs: 1,
  sm: 2,
  md: 4,
  lg: 6,
} as const;
```

### Text Styling

```tsx
<Text color="86">Accent text</Text>
<Text bold>Bold text</Text>
<Text dimColor>Muted text</Text>
<Text color="203">Error text</Text>
<Text color="black" backgroundColor="white">Inverted</Text>
```

### Box Borders

```tsx
<Box borderStyle="round" borderColor="243" paddingX={2} paddingY={1}>
  <Text>Bordered content</Text>
</Box>

<Box borderStyle="single" borderColor="86">
  <Text>Active border</Text>
</Box>
```

Available `borderStyle` values: `"single"`, `"double"`, `"round"`, `"bold"`, `"singleDouble"`, `"doubleSingle"`, `"classic"`.

---

## Layout with Flexbox

Ink uses Yoga (CSS flexbox) for layout inside `<Box>`.

### Horizontal Layout

```tsx
<Box flexDirection="row">
  <Box width={20}>
    <Sidebar />
  </Box>
  <Box flexGrow={1}>
    <Content />
  </Box>
</Box>
```

### Vertical Layout

```tsx
<Box flexDirection="column" height="100%">
  <Header />
  <Box flexGrow={1}>
    <Body />
  </Box>
  <StatusBar />
</Box>
```

### Common Properties

| Prop | Type | Purpose |
|---|---|---|
| `flexDirection` | `"row" \| "column"` | Main axis direction |
| `flexGrow` | `number` | Grow to fill space |
| `flexShrink` | `number` | Shrink when space is tight |
| `alignItems` | `"flex-start" \| "center" \| "flex-end"` | Cross-axis alignment |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between"` | Main-axis alignment |
| `gap` | `number` | Gap between children |
| `padding`, `paddingX`, `paddingY` | `number` | Inner spacing |
| `margin`, `marginX`, `marginY` | `number` | Outer spacing |
| `width`, `height` | `number \| string` | Fixed or percentage dimensions |

---

## Keybindings

### useInput Hook

```tsx
import {useInput} from 'ink';

const MyComponent = () => {
  useInput((input, key) => {
    if (input === 'q') handleQuit();
    if (key.upArrow) moveUp();
    if (key.downArrow) moveDown();
    if (key.return) handleSelect();
    if (key.escape) handleBack();
    if (key.tab) handleTab();
  });
};
```

### Centralized Keymap Hook

```tsx
// hooks/useKeymap.ts
import {useInput} from 'ink';

type Action = 'up' | 'down' | 'select' | 'back' | 'quit' | 'help' | 'search';

export const useKeymap = (handlers: Partial<Record<Action, () => void>>) => {
  useInput((input, key) => {
    if (input === 'j' || key.downArrow) handlers.down?.();
    if (input === 'k' || key.upArrow) handlers.up?.();
    if (key.return) handlers.select?.();
    if (key.escape) handlers.back?.();
    if (input === 'q') handlers.quit?.();
    if (input === '?') handlers.help?.();
    if (input === '/') handlers.search?.();
  });
};
```

---

## Focus Management

```tsx
import {useFocus} from 'ink';

const Sidebar = () => {
  const {isFocused} = useFocus();

  return (
    <Box borderStyle={isFocused ? 'round' : undefined}
         borderColor={isFocused ? '86' : undefined}>
      <Text>{isFocused ? 'Active' : 'Inactive'}</Text>
    </Box>
  );
};
```

`useFocus` options: `{ autoFocus?: boolean, isActive?: boolean, id?: string }`.

---

## Responsive Sizing

```tsx
import {useStdout} from 'ink';
import {useState, useEffect} from 'react';

const App = () => {
  const {stdout} = useStdout();
  const [dimensions, setDimensions] = useState({
    width: stdout?.columns ?? 80,
    height: stdout?.rows ?? 24,
  });

  // Terminal resize not auto-handled — measure manually if needed
  const sidebarWidth = dimensions.width >= 60 ? 20 : 0;

  return (
    <Box flexDirection="row">
      {sidebarWidth > 0 && (
        <Box width={sidebarWidth}><Sidebar /></Box>
      )}
      <Box flexGrow={1}><Content /></Box>
    </Box>
  );
};
```

---

## Component Pattern

### List with Selection

```tsx
const ItemList: React.FC<{
  items: string[];
  selected: number;
  onSelect: (index: number) => void;
}> = ({items, selected, onSelect}) => (
  <Box flexDirection="column">
    {items.map((item, i) => (
      <Box key={i}>
        <Text color={i === selected ? '86' : undefined}>
          {i === selected ? '▸ ' : '  '}
          {item}
        </Text>
      </Box>
    ))}
  </Box>
);
```

### Status Bar

```tsx
const StatusBar: React.FC<{hints: string}> = ({hints}) => (
  <Box width="100%" paddingX={2}>
    <Text backgroundColor="236" color="252">{' '}</Text>
    <Text backgroundColor="236" color="78">● Connected</Text>
    <Text backgroundColor="236" color="252">  {hints}</Text>
  </Box>
);
```

---

## Async Operations

```tsx
import {useState, useEffect} from 'react';

const DataLoader: React.FC<{url: string}> = ({url}) => {
  const [data, setData] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, {signal: controller.signal})
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message));
    return () => controller.abort();
  }, [url]);

  if (error) return <Text color="203">Error: {error}</Text>;
  if (!data) return <Text dimColor>Loading...</Text>;
  return <Text>{data.length} items loaded</Text>;
};
```

---

## Multi-Screen Navigation

```tsx
type Screen = 'dashboard' | 'records' | 'settings';

const App = () => {
  const [screen, setScreen] = useState<Screen>('dashboard');

  return (
    <Box flexDirection="column">
      <Box flexGrow={1}>
        {screen === 'dashboard' && <Dashboard />}
        {screen === 'records' && <Records />}
        {screen === 'settings' && <Settings />}
      </Box>
    </Box>
  );
};
```

---

## Ink UI Components

The `@inkjs/ui` package provides ready-made interactive components:

```bash
npm install @inkjs/ui
```

| Component | Purpose |
|---|---|
| `TextInput` | Single-line text input with autocomplete |
| `Select` | Single-option picker |
| `MultiSelect` | Multi-option picker |
| `Confirm` | Yes/no confirmation |
| `Spinner` | Loading spinner with label |
| `ProgressBar` | Progress indicator (0–100) |
| `Badge` | Colored status badge |

---

## Full-Screen Apps

For full-screen TUIs (dashboards, monitors), use the `fullscreen-ink` package:

```bash
npm install fullscreen-ink
```

This provides automatic alternate screen buffer management and responsive resizing — similar to Bubble Tea's `WithAltScreen()`.

---

## Best Practices

1. **Use TypeScript** — Ink's types are excellent. Use `.tsx` and get full type safety.
2. **Use `useInput` for keys** — Don't drop down to raw stdin unless you need mouse support.
3. **Use `useFocus` for focusable regions** — Handles Tab cycling and visual focus state.
4. **Use `flexGrow` over fixed widths** — Let the layout adapt to terminal width.
5. **Extract theme constants** — Centralize colors and spacing; don't hardcode inline.
6. **Handle all states** — Empty, loading, error, populated. Use conditional rendering.
7. **Use `@inkjs/ui` components** — Don't reimplement TextInput, Select, Spinner.
8. **Use `useApp().exit()`** — Don't call `process.exit()` directly; let Ink clean up.
9. **Keep components small** — React composition, not monolithic components.
10. **Use `measureElement`** for dynamic sizing — Get actual rendered dimensions in `useEffect`.

---

## Common Mistakes

- Using `<div>` or HTML elements — Ink only provides `<Box>` and `<Text>`
- Forgetting `flexDirection="column"` — Box defaults to `row`, so vertical stacking needs explicit setting
- Using `process.exit()` — Breaks Ink cleanup; use `useApp().exit()` instead
- Ignoring terminal width — Content overflows look bad; use `flexWrap="wrap"` or truncate
- Not handling empty states — A blank screen when data hasn't loaded yet
- Over-styling — chalk/Text make color easy; restrain to 3–4 colors
- Blocking the render loop — Do async work in `useEffect`, not in the component body
- Hardcoding dimensions — Use `flexGrow` and percentages; terminals vary in size

---

## Dependencies

```bash
# Core (Node.js >= 18)
npm install react ink
# or: bun add react ink

# UI components (recommended)
npm install @inkjs/ui

# TypeScript
npm install -D typescript @types/react tsx

# Full-screen apps (optional)
npm install fullscreen-ink

# Development
npm install -D @biomejs/biome  # Linting and formatting
```

Nix ad-hoc shell:

```bash
nix shell nixpkgs#nodejs_22
```

- **Runtime**: `react` + `ink`. `string-width` (used by Ink for layout)
  is already in the tree — don't add another width helper.
- **Optional**: `@inkjs/ui` components, `fullscreen-ink` (alt screen +
  resize). Ink has no built-in mouse support; stay keyboard-first.
- **Dev**: `tsc --noEmit`, `biome check`, a test runner + `ink-testing-library`.

## Unicode Notes

- Ink measures display width via `string-width`; `Box` layout and
  truncation are width-aware.
- No BiDi/RTL — see `references/rtl-and-bidi.md`.

## Testing Notes

- `ink-testing-library` renders the app to a string and simulates stdin;
  pair with `strip-ansi` for layout assertions. Full guidance:
  `references/testing-tuis.md`.
