// Pre-fight boss banter. Tied to chapter boss stages (every 5th stage).
// Each chapter's final boss gets a 1-3 line intro shown on the pre-battle screen.

export interface BossBanterLine {
  speaker: 'boss' | 'narrator';
  line: string;
}

export const BOSS_BANTER: Record<string, BossBanterLine[]> = {
  '1-5': [
    { speaker: 'narrator', line: 'A bone-armoured knight rises from the rotted grass.' },
    { speaker: 'boss', line: 'Turn back. These fields drink the dead.' },
    { speaker: 'boss', line: 'Or join them. Either is fine.' },
  ],
  '2-5': [
    { speaker: 'narrator', line: 'The air sears. Something old and orange laughs in the ash.' },
    { speaker: 'boss', line: 'Look at you. So much fire to spend.' },
    { speaker: 'boss', line: 'I will keep it for myself.' },
  ],
  '3-5': [
    { speaker: 'narrator', line: 'Two thrones. Two crowns. No mercy.' },
    { speaker: 'boss', line: 'You arrive at the court without offering.' },
    { speaker: 'boss', line: 'Your bones will suffice.' },
  ],
  '4-5': [
    { speaker: 'narrator', line: 'A worm of names coils between the burial slabs.' },
    { speaker: 'boss', line: 'I have eaten the words for hero, for legend, for hope.' },
    { speaker: 'boss', line: 'You have nothing left to say.' },
  ],
  '5-5': [
    { speaker: 'narrator', line: 'The cathedral is silent. The Pontiff is not.' },
    { speaker: 'boss', line: '...' },
    { speaker: 'narrator', line: 'A weight settles on your chest. Your heroes draw breath.' },
  ],
  '6-5': [
    { speaker: 'narrator', line: 'Beyond the cliffs of forgetting waits a tide of stillness.' },
    { speaker: 'boss', line: 'You came all this way to die clean.' },
    { speaker: 'boss', line: 'I will not waste it.' },
  ],
  '7-5': [
    { speaker: 'narrator', line: 'A purple banner of ribbon and bone. A crown that never tarnished.' },
    { speaker: 'boss', line: 'In life I led the king\'s vanguard. In death I lead them still.' },
    { speaker: 'boss', line: 'Kneel, and I will spare your captains. Or do not. It changes nothing.' },
  ],
  '8-5': [
    { speaker: 'narrator', line: 'His ribcage burns cyan with the souls of a hundred fallen kings.' },
    { speaker: 'boss', line: 'Each life is a candle. Yours, I think, will burn warmly for me.' },
    { speaker: 'boss', line: 'Step closer. Let me taste it.' },
  ],
  '9-5': [
    { speaker: 'narrator', line: 'Two staffs. Two crystals. One hand for the dead, one for the dying.' },
    { speaker: 'boss', line: 'I have raised armies. I have raised kings. I have raised the dead at every grave you crossed.' },
    { speaker: 'boss', line: 'You are not the first to find me. You will be the last.' },
  ],
};
