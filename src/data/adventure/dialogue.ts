import type { DialogueLine } from './types';

// Adventure dialogue, keyed by id. Tone: grim, terse, fatalistic — matches the
// bossBanter register. Some ids have variants gated by story flags; the engine
// picks '<id>__done' over '<id>' when that flag is set (see engine).

export const DIALOGUE: Record<string, DialogueLine[]> = {
  // --- Lastlight (hub town) ---
  mara: [
    { who: 'Mara, the Wake-Warden', text: 'You\'re the one the Vanguard sent. Good. We\'re short on the living.' },
    { who: 'Mara', text: 'Before the Wake, the Pale Choir nearly finished a cure. Their last researcher carried it into the Old Burial Ground and never walked back out.' },
    { who: 'Mara', text: 'Bring me whatever\'s left of that work. A fragment. A vial. Anything. East through the Crossing, then into the graves.' },
    { who: 'Mara', text: 'And keep your hands up. These fields drink the dead.' },
  ],
  mara__done: [
    { who: 'Mara, the Wake-Warden', text: 'You found it. A piece of the cure, after all these years.' },
    { who: 'Mara', text: 'One fragment. The Necromancer holds the rest. But it\'s a start — the first true one we\'ve had.' },
    { who: 'Mara', text: 'Rest. The road north opens when you\'re ready. The dead won\'t wait, and neither will we.' },
  ],
  mercenary: [
    { who: 'The Flesh-Broker', text: 'Need a body at your back? I keep the desperate on a short leash. Pick one — they\'ll fight at your level and grow as you do. Trade them out whenever you like.' },
  ],
  warden: [
    { who: 'The Warden', text: 'You\'ve the look of a delver. The dead run deeper than any grave — and meaner the lower you go.' },
    { who: 'The Warden', text: 'Pick your descent. But the far gates stay barred until you\'ve proven yourself in the shallow dark.' },
  ],
  joss: [
    { who: 'Joss the Bonepicker', text: 'Gear off the dead, gear for the living. Take a look — coin\'s coin.' },
  ],
  smith: [
    { who: 'Hagen, the Bonesmith', text: 'Bring me a piece with bad blood in it. I\'ll beat the curse out and reforge what it carries.' },
  ],
  keeper: [
    { who: 'The Keeper', text: 'Whatever you can\'t carry, I\'ll hold. Same vault for every soul who walks the Bonewake.' },
  ],
  tender: [
    { who: 'The Tender', text: 'Sit. Breathe. You\'re still warm — that\'s more than most.' },
    { who: 'The Tender', text: 'Your wounds are mended and your dead are buried proper. The shrine remembers you were here.' },
  ],
  // --- Forsaken Crossing (field) ---
  refugee: [
    { who: 'Refugee on the Road', text: 'You\'re going TOWARD the graves? Gods. Take this — I won\'t need it where I\'m headed.' },
    { who: 'Refugee', text: 'The shamblers are slow. The fast ones aren\'t. Don\'t let them circle you.' },
  ],
  crossing_sign: [
    { who: '', text: 'A warped signpost: "FORSAKEN CROSSING — Lastlight (W) · The Old Burial Ground (E)". The east arrow is clawed half off.' },
  ],
  // --- Old Burial Ground (dungeon) ---
  corpse_note: [
    { who: '', text: 'A researcher\'s last note, pinned under a cold hand:' },
    { who: '', text: '"The cure works. That is the horror of it. It does not raise the dead — it taught them to want. Do not finish my work. The thing in the deep lich already has."' },
  ],
  burial_sign: [
    { who: '', text: 'Scratched into the gate: "THE DEAD ARE PATIENT. YOU ARE NOT." Beyond, the dark goes down.' },
  ],
  ch2_wall: [
    { who: '', text: 'The crypt continues north — but the way is choked with rubble and old wards.' },
    { who: '', text: '(Chapter 2 — the Ashen Wastes — opens in a future milestone.)' },
  ],
  // --- recruits ---
  luna_recruit: [
    { who: 'Luna', text: 'Don\'t look at the pit. I do the mercy-killing so no one else has to hear them ask.' },
    { who: 'Luna', text: 'You\'re the first in months who didn\'t ask me to fix you. Just to walk with you.' },
    { who: 'Luna', text: '...Fine. I\'ll come. Someone has to keep you breathing. Luna joined the party.' },
  ],
  elara_recruit: [
    { who: '', text: 'An arrow splits a fastghoul\'s skull an inch from Luna\'s throat. A figure drops from the dead tree.' },
    { who: 'Elara', text: 'You\'re loud. The dead three valleys over heard you coming.' },
    { who: 'Elara', text: 'I don\'t learn names anymore — they don\'t last. But I\'ll watch your backs to the graves. Elara joined the party.' },
  ],
  cure_fragment: [
    { who: '', text: 'In the lich\'s ashes: a sealed vial of pale fluid, still faintly warm. The Cure Fragment.' },
    { who: '', text: 'Cure Research advanced. Stage 0: First Sample (+8% max HP, party-wide). Bring it back to Mara.' },
  ],
};
