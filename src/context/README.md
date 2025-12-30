Theme Context

Purpose
- Provides application theme state ("dark" | "light") and a small side-effect that applies UI tokens (scrollbar colors, `dark` class for Tailwind) to the document root.

Location
- `src/context/ThemeContext.jsx`

APIs
- `ThemeProvider` — Wraps the app and makes `theme` and `setTheme` available via context.
- `useTheme()` — Hook to access `{ theme, setTheme }`.

Behavior
- Persists the chosen theme in `localStorage` (key `theme`).
- On mount or when `theme` changes, sets CSS custom properties on `:root`:
  - `--scrollbar-track`
  - `--scrollbar-thumb`
  - `--scrollbar-thumb-hover`
- Toggles the `dark` class on `<html>` so Tailwind `dark:` utilities work.

Extending theme tokens
- Primary token sources live in `src/constants/theme.js` (e.g., `PANEL_CLASSES` and `COLORS`).
- To add a new token:
  1. Add the token(s) to both `PANEL_CLASSES.dark` and `PANEL_CLASSES.light` (or in `COLORS`).
  2. Update `ThemeContext.jsx`'s `useEffect` to set the CSS variable(s) on `document.documentElement` using `root.style.setProperty('--your-token', value)`.
  3. Use the CSS variable in `index.css` (or a component's style) with `var(--your-token, <fallback>)`.

Testing
- When adding components or tests that read theme-dependent styles, wrap the test in `<ThemeProvider>` to ensure CSS variables and `dark` class are present.

Notes
- Keep `ThemeContext` focused on UI-level theme concerns only (colors, CSS variables, `dark` class). Application/data state should remain in `MolecularContext`.
