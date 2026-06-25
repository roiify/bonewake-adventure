import type { AdventureMap } from '../types';
import { LASTLIGHT } from './lastlight';
import { FORSAKEN_CROSSING } from './forsaken_crossing';
import { OLD_BURIAL_GROUND } from './old_burial_ground';

export const ADVENTURE_MAPS: Record<string, AdventureMap> = {
  [LASTLIGHT.id]: LASTLIGHT,
  [FORSAKEN_CROSSING.id]: FORSAKEN_CROSSING,
  [OLD_BURIAL_GROUND.id]: OLD_BURIAL_GROUND,
};

export const START_MAP = 'lastlight';
