import type { AdventureMap } from './types';

// Runtime map registry for procedurally-generated dungeon floors. The engine
// resolves a map id from here first, then the static ADVENTURE_MAPS. AdventurePage
// registers generated floors here before loading them.
export const RUNTIME_MAPS: Record<string, AdventureMap> = {};
