import { createContext, type ServerBuild } from 'react-router'

// Set by server/index.ts in getLoadContext. The Express server reads this key
// from the loaded server build (see the re-export in entry.server.tsx) so it is
// the same instance the app's loaders use.
export const serverContext = createContext<{
	cspNonce: string
	serverBuild: Promise<ServerBuild>
}>()
