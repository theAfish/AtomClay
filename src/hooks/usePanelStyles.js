import { PANEL_CLASSES } from '../constants/theme';

// Returns a merged panel styles object for the given theme.
// Falls back to the `dark` theme defaults and overlays the chosen theme.
export default function usePanelStyles(theme) {
    const base = PANEL_CLASSES[theme] || PANEL_CLASSES.dark || {};
    const defaults = PANEL_CLASSES.dark || {};
    return { ...defaults, ...base };
}
