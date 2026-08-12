import { createContext } from 'react'

// Split from AuthContext.jsx (the provider component) so React Fast Refresh
// can hot-reload correctly — same reasoning as context/theme-context.js.
export const AuthContext = createContext(undefined)
