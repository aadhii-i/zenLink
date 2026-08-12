import { createContext } from 'react'

// Split into its own file (no components here) so React Fast Refresh can
// reliably hot-reload ThemeProvider.jsx and useTheme.js independently.
export const ThemeContext = createContext(undefined)
