# Bonewake — Final Fantasy-Style RPG Design Bible

> **Document status:** Design only. No code is written yet. This bible defines the new **Story/Adventure mode** to be built *inside* the existing Bonewake app (React 19 + Vite + Zustand + Dexie/IndexedDB + Tailwind + framer-motion + vite-plugin-pwa), reusing the existing combat engine (`src/lib/combat.ts`), `SpriteAnimator`, all 752 sprites, the 3 audio tracks, and the existing GitHub Pages auto-deploy workflow.
>
> **Asset rule:** every hero, enemy, boss, background, and music reference below is a **real asset already in the repo**. Anything not yet in the repo is flagged as an explicit **Asset gap** to be generated later via PixelLab, anchored to the existing **kidbot V1** pro style.

---

## 0. SLICE CANON (single source of truth — every section obeys this)

This table resolves every cross-section conflict. Where any later prose disagrees, **this table wins.** The vertical slice is named **"Forsaken Fields: The First Wake."**

| Decision | Canonical answer (binding) |
|---|---|
| **Battle model — the SLICE** | **Reuse the existing `resolveBattle` auto-battler, unchanged.** The slice ships on the pre-resolved auto-battler so the *walkable overworld* is proven first. The "FF feel" of the slice is **exploration + encounter cadence + party recruitment**, not per-turn command input. |
| **Battle model — the FULL GAME** | The FF-style **ATB command menu** (Attack/Skill/Magic/Item/Defend/Flee, MP, manual targeting) is **Milestone M2 (post-slice)**, specified in §5. It is a *future* build, not part of the slice. |
| **Slice hub town** | **Lastlight** — a walled human holdfast on the edge of the Forsaken Fields. (Single name everywhere.) |
| **Slice town NPCs (3)** | **Mara, the Wake-Warden** (quest-giver + story voice); **Joss the Bonepicker** (shop: one healing consumable); **The Tender** (free full-heal / rest + save-confirm beat). |
| **Slice party (cap 3 active)** | **Kengo** (`kengo`, start) + **Luna** (`luna`, recruited in Lastlight) + **Elara** (`elara`, recruited at the dungeon mouth). Active cap = **3** (matches `bonewake_squad` / `bondBonusFor`). Kaius/Aelia/Arcaveli are **later milestones**, not the slice. |
| **Slice dungeon** | **The Old Burial Ground** — short crypt, ~2 rooms + boss chamber. |
| **Slice boss** | **`graveyardlich`** rendered with `BOSS_AURA_IDS` (orange-glow) at story-scaled boss stats — **"The First Lich."** NOT a painted World/Shatter boss, NOT `boneknight`. Painted bosses (`lich_king`, `bonewake_dragon`, `bone_cerberus`, `plague_hydra`) are **deferred to M4** because they have no directional/walk frames and are 5–10M-HP raid-scale. |
| **Persistence** | **One new Dexie table: `adventure`, primary key `id`, single row `id:'me'`**, added via an appended `this.version(6).stores({ adventure: 'id' })` (live chain ends at version 5). Holds all Adventure state (position, party, flags, inventory, clears). No competing `overworldState`/`adventureClears` tables. |
| **Roster sharing** | Adventure **shares the gacha `OwnedHero`/`useHeroes` store, equipment, gems, talents, and bonds** (so `toCombatUnit`, `bondBonusFor`, and gear all reuse cleanly). Progression is **shared, not isolated** — leveling a hero in Adventure is the same `OwnedHero` the rest of the app sees. The `adventure` table stores only *exploration/story* state (position, flags, recruited-into-story set, adventure-local consumables), never a parallel hero-level store. |
| **Battle route** | **Reuse `/battle/play/:stageId`** with a reserved stage id **`adv`**. A single guarded `if (stageId === 'adv')` branch in `BattlePlayPage` reads the handoff payload. No new `/adventure/battle` route. |
| **Tile size** | **32 px** logical tiles. |
| **Viewport** | **15 × 11 tiles** visible window, camera-follow, clamped, integer-scaled with `imageSmoothingEnabled = false`. |
| **Movement** | Tile-locked, 4-directional, ~140 ms smooth slide per step, input-buffered (held key chains steps). No diagonals. |
| **Encounter model** | **Step-accumulator** (NOT per-step probability). Each fresh tile entered inside an `EncounterZone` adds to a hidden `danger` counter; crossing a per-zone threshold triggers a battle. Threshold = `base ± 25%`, randomized each trigger; an ~8-step **grace window** after any battle and after entering a zone. Slice band: **22–30 steps** average (gentle, teaching). |
| **Visible/bump enemies** | Roaming enemy sprites; collision triggers a fixed-comp battle; `oneShot` markers never respawn (flag in the `adventure` row). Used for the dungeon mini-boss approach. |
| **Fail behavior** | Party wipe → **respawn at the last Bone Shrine / Tender (town), party HP+MP fully restored, small gold penalty, no XP loss.** Not a hard game-over. (One rule everywhere.) |
| **Walk-music rule** | Only **3 tracks** exist. Canonical: **`menu_theme.mp3`** plays while walking (town, overworld path, AND dungeon corridors); **`battle_theme.mp3`** plays during normal encounters; **`boss_theme.mp3`** plays during the boss fight. `battle_theme` never plays while merely walking. |
| **North-facing stopgap** | North walk frames do not exist for anyone. **Interim behavior (one rule): when walking north, the player/NPC is drawn using their `_south.png` (camera-facing) frame** — i.e. they appear to face the camera while moving away. Slice maps are laid out to minimize long northward travel. Real north frames are an Asset gap. |
| **`cure` / `cleanse` mechanic** | **NET-NEW**, not reuse. There is no `cure` effect type and no `poison` status in the engine — only `burn` (DoT) and `stun` exist. The full game's M2 must add a new effect path that **strips `burn` and `stun`** (referred to as "cure burn/stun" — never "poison"). Not present in the slice (slice uses the auto-battler). |
| **`def_buff` for Defend** | **NET-NEW plumbing.** `def_buff` exists only as an `ActiveEffect.kind` (produced by `heroSkills` `self_def_buff`), NOT as a castable `Skill.effect.type`. The M2 Defend command must push a new `def_buff` ActiveEffect — it is not a free reuse. (M2 only.) |
| **Cure-Research gating** | Cure Research grants **party-wide buffs + narrative beats only.** Biome progression stays **spatial**: a synthesis at the bench **opens a physical door** (collision toggle) — never an abstract node unlock. This keeps the "progress is spatial" rule intact. |

---

## 1. Vision & Pillars

*Bonewake* is a mature, gory, dark-fantasy console-style RPG in which the zombie plague has already **won**: humanity lost the single night the dead "woke," and the undead now rule the world as an articulate feudal court of deathlords. The player guides a hand-picked Vanguard recovery cell — built from Bonewake's real named-hero roster — across a **walkable, tile-based overworld** of towns and dungeons, traversed with the arrow keys, where stepping into enemies and tripping random encounters drops into turn-based battles in the FF1-6 register. The driving question is a true survival-horror moral guillotine: humanity is **racing to synthesize a cure**, and the central twist is that the cure they've been couriering is the engine of the apocalypse. The mode is built entirely *inside* the existing Bonewake React app, additively, reusing the live combat engine, sprites, audio, and deploy.

**Pillars:**

- **Walkable world, console-RPG feel.** A real overworld you physically traverse (canvas-rendered tiles inside React), not a menu/node map. Towns, dungeons, NPCs, shops, save shrines.
- **Adult dark-fantasy horror, always.** Terse, grim, fatalistic voice (the existing `bossBanter.ts` register). Physical decay, body horror, permanent death, unwinnable-clean choices. *Dark Souls / Berserk* tone, never cruelty-porn, never gore-as-gag.
- **A fixed cast you grow, not a gacha box you collect.** The story knows 8 hand-authored characters (Kengo + 7 recruits) with arcs and death-stakes; the rest of the roster and the gacha stay usable as "mercenaries" but get no plot.
- **Reuse the engine, add the world.** The combat kernel, sprites, `UnitCard`/`SpriteAnimator`, economy, and deploy are reused verbatim; the net-new work is the tile engine, map data, and (later) the interactive battle loop.
- **A signature meta-hook: Cure Research.** Killing plague-strain bosses yields reagents that synthesize Cure Stages — granting permanent party-wide buffs and opening the next biome's door — turning the cure fiction into a mechanical spine.
- **Asset-honest.** Every reference is a real repo asset; the overworld art layer (tiles, props, town NPCs, north frames) is the one true gap, scoped in waves.

---

## 2. Story & World Bible

### 2.1 Premise — The World After the Wake

The plague did not "break out." It **woke up.** Across the dead centuries it lay in the marrow of the world's first graves, and one night every buried thing opened its eyes at once. Humanity didn't lose a war — it lost a single night, the **Bonewake**, and then spent a generation learning that the dead now outnumber, outlast, and out-organize the living.

The undead are not a mindless tide. They have a **hierarchy**: shamblers and ghouls at the bottom, risen knights and casters in the middle, and at the apex a court of *intelligent* deathlords — the painted World Bosses and Shatter Bosses — who govern the rotted realm like feudal lords, each ruling a biome. The dead build. The dead crown kings. The dead remember who they were, and hate the living for still being it.

Scattered humanity survives in **enclaves** — fortified scraps of the old world — racing a clock no one can read: the plague is still *spreading inward*, converting bodies, then land, then finally light itself (the endgame "Cosmic Corruption"). The only hope anyone still whispers about is a **cure** — and the central, terrible question is whether a cure is even possible, or whether what's been found is something far worse wearing a cure's face.

**The party** is a recovery cell sent from the last coordinated human remnant, the **Vanguard**, to find the one person who might know how to end the Wake. **Kengo** is the starting, story-gifted protagonist (consistent with the existing welcome-mail "Kengo has joined you").

### 2.2 The Central Mystery — What the Cure Actually Is

Lock these reveals; do not soften them.

1. **Surface truth (Acts I–II):** Before the Wake, a circle of plague-doctors and court alchemists — the **Pale Choir** — were close to a true cure. Their last researcher vanished into the Necropolis with the formula. Find them, finish the work.
2. **Mid reveal (Act III):** The "researcher" is **the Plague Doctor** (real Shatter Boss `plague_doctor`; `public/sprites/bosses/plague_doctor_idle.png` + directional `plague_doctor_undead_*`). He *did* finish the cure. It works. But it does not restore the dead to **life** — **it restores them to *mind*.** It cures the *madness*, not the *death*. Every intelligent undead lord is a "cured" subject: lucid, sentient, furious to still be a corpse. **The cure is the cause of the hierarchy.**
3. **Deep reveal (Acts IV–V):** The plague is not a disease. It is a **mind** — a single buried consciousness, **The Worm of Names** (real boss `worm_god` / "The Worm God"; the existing 4-5 banter already calls it *"a worm of names"* that *"has eaten the words for hero, for legend, for hope"*). It "wakes" the dead by *eating the names of the living* — identity is the contagion. The deathlords are names the Worm chose to keep whole as governors.
4. **The choice (Finale):** The party can synthesize a real, working **anti-cure** — a way to *re-silence* the dead, granting the deathlords the death they were robbed of and starving the Worm. But silencing the Worm means **un-speaking every name it holds — including the millions of converted humans** who could, in theory, be restored if a true restoration were ever found. The cure-quest ends not with a vaccine but with a moral guillotine: **mercy-kill the world's dead to save the world's living, or hold out for a restoration that may never come while the Wake keeps spreading.**

### 2.3 Antagonists — Drawn From the Real Boss Roster

Every antagonist is a real existing boss sprite. No invented bosses.

**The Three Crowns (primary antagonist tier):**

| Crown | Real boss asset | Role in plot | Region |
|---|---|---|---|
| **The Crowned Lich** | `lich_king` (Shatter Boss, "necromancer overlord, highest ATK") | Political head of the undead court; believes the cure made him a *rightful king*. Wants the formula *delivered*, not destroyed. | Ch3 Dread Court / Ch9 Necromancer's Court |
| **The Plague Doctor** | `plague_doctor` (Shatter Boss, poison/plague debuffer) | The cure's actual author; the tragic antagonist. He *hides* the formula, horrified by what he made. The "find the researcher" goal **is** the Act III boss fight. | Ch4 Crypts → Ch5 Cathedral |
| **The Worm God** | `worm_god` (Shatter Boss, largest HP pool) | The true final antagonist — the buried mind. Not a person; *a hunger that learned grammar.* | Ch4 deep / Finale |

**Regional / mid bosses (real roster, mapped to the regions they already guard):**

- **The First Lich** — the **slice mini-boss**, a `graveyardlich` with `BOSS_AURA_IDS` in the Old Burial Ground (Forsaken Fields). *Note: `graveyardlich` is a real Ch1-3/dungeon dark mage; it is the slice's gatekeeper. (Verbatim `bossBanter['1-5']` voice is reused.)*
- **Bonewake Dragon** (`bonewake_dragon`, World Boss, AoE fire-breath bruiser) — apex terror of the **Ashen Wastes** (Ch2); optional super-boss / Act II climax.
- **The Hollow Lich** (`graveyardlich` aura) — Ch2 chapter boss, Ashen Wastes.
- **The Fallen Captain** (`fallen_captain`, fire warrior, tanky) — Ch7 Vanguard Camp boss. **Critical NPC-turned-boss:** in life he led the Vanguard (existing 7-5 banter: *"In life I led the king's vanguard. In death I lead them still."*). The emotional gut-punch of Act IV.
- **The Soul Leech** (`soul_leech` aura) — Ch8 Zombie Legion boss.
- **The Necromancer** (`necromancer` aura) — Ch9 Court boss; the Crowned Lich's enforcer (9-5 banter: *"I have raised armies… You will be the last."*).
- **Crimson Centaur** (`crimson_centaur`, World Boss, charging melee first-striker) — roaming rival across the Vanguard Camp / Zombie Battlefield regions.
- **The reanimated-captain set-piece** uses the real **`gilded_revenant`** (a Ch12 light warrior, gold-armored). **Re-grounded:** this beat is relocated to its correct region — **Chapter 12 (Iron Famine)** — NOT Ch5 Cathedral. Kaius's mentor-loss beat at the Cathedral (Ch5) instead uses a **`plague_priest`** (Ch14 light mage) or, for region fit, the Cathedral's own `plague_monk`; the gold-armored captain reanimation is a *later* Ch12 callback. (See §4.2.)

**Endgame escalation (real Shatter/late bosses, post-Ch9 "Cosmic Corruption," reusing `cosmic_fire.jpg` / `sky_clouds.jpg` / `sky_cliffs.jpg`):** `starfall_lich`, `void_juggernaut`, `apocalypse_horror`, `final_revenant`.

### 2.4 Factions

1. **The Vanguard (human military remnant).** Anchor: `ch7_vanguard_camp.jpg`. The party's employer and home base — disciplined, exhausted, morally compromised. Internal rot: their greatest hero, the **Fallen Captain** (`fallen_captain`), rose as a deathlord. Recruit hooks: **Kaius** (only tank, "Paladin of the Cross") is the Vanguard's last paladin-commander; **Reiji + Chino** (the "Broken Oath" bond, *"Two warriors who refused to die clean"*) are Vanguard deserters.
2. **The Survivor Enclaves (civilian holdouts).** Anchor: `ch1_forsaken_fields.jpg`. Walled towns and hamlets — farmers, scavengers, hedge-priests. The **slice's town, Lastlight, lives here.** Recruit hook: **Luna** (only healer, "Priestess of the dawn") tends a field-shrine enclave; **George** ("Druid of the Last Grove") protects a surviving grove at the edge of the Ashen Wastes.
3. **The Undead Hierarchy (the dead's feudal order).** A *court*, not a monolith. Bottom: `shambler`, `fastghoul`, `boneknight`. Middle: `plague_caster`, `necromancer`. Apex: the Three Crowns. Key tension: the Crowned Lich (`lich_king`) and the Worm God (`worm_god`) are *not allies* — the Lich believes he rules; the Worm knows it owns him. Anchor: `ch9_necromancer_court.jpg`.
4. **The Pale Choir (the cure cabal — hidden faction).** Anchor: `ch5_cathedral.jpg` (Pale Cathedral). The pre-Wake circle that built the cure; most are dead, the survivors *are the cured deathlords*. The Plague Doctor is the last sane member. (Ch5 is literally "Pale Cathedral" with a "Pale Choir" stage in `stages.ts`.)

### 2.5 Region & Act Map (the 9 real chapter backgrounds)

Every region uses a real `public/sprites/bg/*.jpg` already wired in `auraMap.ts` `CHAPTER_BG`. Combat backdrops are reused as the battle layer; **overworld walkable tiles are the asset gap** (see §9).

| Act | Ch | Real background | Region | Story function | Real bosses/enemies |
|---|---|---|---|---|---|
| **I — The Lie** | 1 | `ch1_forsaken_fields.jpg` | **Forsaken Fields** | Tutorial town (Lastlight) + first dungeon. Enclave gives the cure-quest; plants the surface lie. **VERTICAL SLICE LIVES HERE.** | `shambler`, `fastghoul`, `boneknight`, `graveyardlich`; boss **The First Lich** (`graveyardlich` + aura) |
| **I** | 2 | `ch2_scorched_wastes.jpg` | **Ashen Wastes** | Burnt crossing; the Bonewake Dragon's domain. First "the land is converting" beat. | `graveyardlich`; **Hollow Lich**; optional **Bonewake Dragon** |
| **II — The Court** | 3 | `ch3_necropolis.jpg` | **Dread Court / Necropolis** | First contact with the intelligent dead — the Crowned Lich *invites* the party. | `royal_lich`; boss **The Crowned Lich** (`lich_king`, 3-5 banter) |
| **II** | 4 | `ch4_crypts.jpg` | **Whispering Crypts** | Hunt for the "researcher"; first whisper of the Worm (4-5 banter). | `carrion_spider`, `graveyardlich`; the Worm's antechamber |
| **III — The Reveal** | 5 | `ch5_cathedral.jpg` | **Pale Cathedral** | Pale Choir's chapter-house. **THE CURE REVEAL** — confront the Plague Doctor. | `plague_monk`; boss **The Plague Doctor** (`plague_doctor`) |
| **III** | 6 | `ch6_worlds_edge.jpg` | **World's Edge** | The spread reaches the edge of the living world; party realizes they've couriered the apocalypse. | "The Quiet Crown" — late aura enemies |
| **IV — The War** | 7 | `ch7_vanguard_camp.jpg` | **Vanguard Camp** | Return to base; the Vanguard is compromised; the Fallen Captain reveal. Hub town #2. | vanguard roster; boss **The Fallen Captain** (`fallen_captain`, 7-5 banter) |
| **IV** | 8 | `ch8_zombie_battlefield.jpg` | **Zombie Battlefield** | Open-field war; exploit the Lich/Worm schism; Crimson Centaur rival climax. | zombie legion; boss **The Soul Leech** |
| **V — The Choice** | 9 | `ch9_necromancer_court.jpg` | **Necromancer's Court** | Final throne-hall: the Necromancer, then the Worm, then **the anti-cure choice.** | boss **The Necromancer** (9-5) → **The Worm God** (`worm_god`) finale |

**Post-Ch9 (Cosmic Corruption, optional endgame):** reuse `cosmic_fire.jpg` / `sky_clouds.jpg` / `sky_cliffs.jpg` as the Worm-rotted reality where `starfall_lich` → `final_revenant` close the New Game+ arc.

### 2.6 Key NPCs

- **Mara, the Wake-Warden** *(Act I quest-giver, Lastlight).* A one-eyed ex-Vanguard scout who runs the slice's hub town. Gruff, fatalistic, kind underneath. Gives the cure-fragment quest, teaches walking/combat, is the player's tutorial voice. *Asset gap: town-NPC overworld sprite.*
- **Luna** *(recruitable → party healer).* Real hero `luna`; tends the hold's wounded. The Act I emotional recruit; believes the cure is salvation — her faith breaks in Act III. Zero battle-art gap.
- **Kaius, the Last Paladin** *(Vanguard commander, recruitable later).* Real hero `kaius`, only tank. The party's link to the Vanguard. His mentor was the Fallen Captain, making Ch7 personal.
- **The Plague Doctor** *(antagonist-as-NPC, Act III).* Real boss `plague_doctor`. Speaks before he fights (in the `bossBanter.ts` register). Not evil — *guilty.* The reveal lives in his mouth; the party can let him die or extract the anti-cure formula.
- **The Worm God** *(the antagonist as a voice).* Real boss `worm_god`. Extends the 4-5 banter; speaks in stolen names. The last NPC the player ever hears.
- *(Optional self-insert beat: **Tatiana & Roiify** — real `twins` hero, the owner self-insert married duo, strongest base power — as a late-game legendary recruit found holding a lighthouse at World's Edge.)*

### 2.7 Tone Guardrails

**Voice (locked, matches `bossBanter.ts`):** terse, grim, fatalistic, second-person menace. Short lines. No quips. The dead are *articulate and patient* — scarier than feral. Reference cadence: *"Turn back. These fields drink the dead. Or join them. Either is fine."*

**Do:** lean into physical decay/body horror/existential dread (house aesthetic: *"physical decay — exposed bone, peeling flesh, sunken eye sockets — active dripping blood, weathered tattered gear, dark muted palette with deep crimson accents"*); treat death as permanent and meaningful; make the cure-choice genuinely unwinnable-clean (no secret save-everyone option); use the body-horror enemy pool (`bloated_glutton`, `hangman`, `conjoined_horror`, `stitched_brute`, `crawling_torso`, `maggot_host`, `butcher_zombie`) in high-dread regions.

**Don't:** no sexual violence, no torture-as-entertainment, no on-screen harm to children; no gore *gags*; don't redeem the Worm (the Plague Doctor is the tragic one, the Worm is the void). Keep it **mature dark-fantasy**, not splatter-exploitation — dread carries the weight, not the viscera count. Rating target: deliverable on GitHub Pages behind a one-line content warning on first launch.

### 2.8 Opening Cinematic / Intro Script

*Presentation: static `ch1_forsaken_fields.jpg` backdrop with slow Ken-Burns drift, white-on-black text cards, `menu_theme.mp3` low and slowed. No VO (no VO assets exist). Fades to walkable Lastlight on the last line. Reuses the `bossBanter.ts` text-card pattern.*

> *[Black. `menu_theme.mp3` fades in, pitched low.]*
> **CARD:** They told us the plague broke out.
> **CARD:** It didn't break out. It *woke up.*
> *[Fade in: `ch1_forsaken_fields.jpg` — rotted farmland under a bruised sky, drifting.]*
> **NARRATOR:** One night, every grave the world had ever dug opened its eyes at once. We call it the Bonewake.
> **NARRATOR:** That was a generation ago. We have been losing every night since.
> *[The drift settles on a distant, walled enclave — small light in a dead field.]*
> **NARRATOR:** The dead do not rot away. They *organize.* They crown kings. They remember our names — and they have not forgiven us for keeping them.
> **CARD:** There is one rumor left worth dying for.
> **NARRATOR:** Before the Wake, the plague-doctors of the Pale Choir nearly finished a cure. Their last researcher took the formula into the Necropolis, and was never seen again.
> **NARRATOR:** The Vanguard — what's left of the living army — has spent its last good soldiers looking. Tonight, they're sending you.
> *[**Kengo**, using his real `kengo` idle sprite, walks into frame at the enclave gate, fists wrapped.]*
> **MARA** *(off-card, gravel):* You the one they sent to find the cure?
> **MARA:** Good. Walk with me. And keep your hands up — these fields drink the dead.
> *[The slowed `menu_theme` cuts out. One last card, white on black:]*
> **CARD:** BONEWAKE
> *[Hard cut to walkable Lastlight. Player gains control of Kengo. Tutorial begins.]*

---

## 3. World Map & Exploration (walkable overworld)

The overworld is a set of interconnected, canvas-rendered **32 px** tile maps the player walks with the arrow keys. Map-edge exits hand off to the connected map; the **step-accumulator** danger counter and **visible/bump enemies** trigger battles via the existing engine. NO menu/node world map — traversal is spatial.

### 3.1 Engine constants (per Slice Canon §0)

| Constant | Value |
|---|---|
| `TILE` | 32 px |
| Viewport | 15 × 11 tiles, camera-follow, clamped, `imageSmoothingEnabled = false` |
| Map grid | town/field up to 40×30 tiles; dungeon rooms 20×15 to 30×24 |
| Movement | tile-locked, ~140 ms slide/step, buffered, no diagonals |
| Facing | south / east / west; **north drawn as `_south.png` (camera-facing stopgap)** |
| Encounter model | **step-accumulator**, slice band 22–30 steps, ±25% jitter, ~8-step grace window |
| Render | single `<canvas>`, layered tiles + entities; React DOM for HUD/menus/dialogue |

### 3.2 Map data format

Plain typed TS modules under `src/data/adventure/maps/` (the established `data/*` typed-const + lookup-map convention) — they typecheck in CI (`tsc -b` gates the deploy), tree-shake, and need no fetch plumbing.

```ts
// src/data/adventure/types.ts
export type TileId = number;            // index into a Tileset frame grid; 0 = empty
export type Dir = 'south' | 'east' | 'west' | 'north';
export type Biome = 'plains' | 'ash' | 'crypt' | 'urban_ruin' | 'cathedral' | 'water';

export interface Tileset {
  id: string;
  src: string;                          // asset('sprites/adventure/tiles/<id>.png')
  tileSize: 32; cols: number;
  solidTiles: Set<TileId>;              // tileset-level default collision
}

export interface MapWarp { x:number; y:number; toMap:string; toX:number; toY:number; facing:Dir; }

export interface MapNpc {
  id:string; spriteId:string;          // a real hero/enemy sprite key, e.g. 'luna'
  x:number; y:number; facing:Dir;
  movement:'static'|'wander';
  dialogueId:string;
  recruits?:string;                    // hero id added to the party on talk-complete
  shopId?:string;                      // opens a shop UI
  oneShot?:boolean;
}

export interface EncounterZone {
  x:number; y:number; w:number; h:number;
  dangerBase:number;                   // step-accumulator threshold (22-30 in slice)
  enemyTemplateIds:string[];           // REAL ids: ['shambler','fastghoul','boneknight','graveyardlich']
  minLevel:number; maxLevel:number;
  battleBgChapter:number;              // which CHAPTER_BG to show in the handed-off fight
}

export interface FixedEncounter {     // visible/bump enemy
  id:string; spriteId:string;         // e.g. 'graveyardlich'
  x:number; y:number; facing:Dir;
  movement:'static'|'patrol';
  enemyTemplateIds:string[]; levels:number[];
  battleBgChapter:number;
  bossBanterId?:string;               // reuse BOSS_BANTER, e.g. '1-5'
  isBoss?:boolean;                     // routes to boss_theme + BOSS_AURA_IDS render
  oneShot:true;
}

export interface AdventureMap {
  id:string; name:string; biome:Biome;
  w:number; h:number; tilesetId:string;
  ground:TileId[]; decor:TileId[]; overhead:TileId[];   // flat row-major, length w*h
  collisionOverride:number[];          // 0=tileset default, 1=force solid, 2=force walkable
  warps:MapWarp[]; npcs:MapNpc[];
  encounterZones:EncounterZone[]; fixedEncounters:FixedEncounter[];
  saveShrine?:{x:number;y:number};     // Bone Shrine (save + full heal)
  ambientTrack:'menu';                 // walking always uses menu_theme (Canon §0)
  battleBgChapterDefault:number;
  gateDoors?:{x:number;y:number; openFlag:string}[]; // physical doors opened by story flags
}
```

Three draw layers + a data collision layer give correct depth (player walks *behind* `overhead` canopies) without a z-buffer. Collision is two-tier: tileset default (`solidTiles`) plus per-cell `collisionOverride`. Maps register in `src/data/adventure/maps/index.ts` as `ADVENTURE_MAPS: Record<string, AdventureMap>`, mirroring `HERO_BY_ID`.

### 3.3 Slice zone graph (walk-connected, not nodes)

```
            [BONE SHRINE / SAVE + The Tender]
                       |
   LASTLIGHT (hub town) ──E──▶ FORSAKEN CROSSING (field) ──E──▶ THE OLD BURIAL GROUND (dungeon)
        │ (shop: Joss) (NPC: Mara)        │ (N spur, gated by boneknight)        │
        │                                 ▼                                      ▼
   [Mara gives quest]                (optional spur chest)              BOSS CHAMBER: The First Lich
                                                                          (graveyardlich + BOSS_AURA_IDS)
                                                                                  │ (post-boss)
                                                                                  ▼
                                                              [Cure Fragment pickup → return to Lastlight]
```

This maps onto canonical **Chapter 1 — Forsaken Fields** (stages 1-1…1-5), so progression, enemies, backgrounds, and the boss-banter voice all reuse real content. Each former "stage" becomes a walkable place.

### 3.4 Zone specs

**ZONE 1 — LASTLIGHT (hub town).** `ch1_forsaken_fields.jpg` (zone splash/parallax band; walkable surface tiled on top — Asset gap). Biome `urban_ruin` — a fortified survivor holdfast walled with bone and scrap. ~32×24 tiles. Music `menu_theme.mp3`.
- NPCs: **Mara, the Wake-Warden** (quest-giver, story voice; gives the Cure Fragment quest, opens the gate on accept); **Joss the Bonepicker** (`shopId` — sells the slice's one healing consumable + low-rarity gear, reusing `loot.ts`/`useItems`); **The Tender** (free full party HP heal/rest, doubles as the save-confirm beat).
- Kengo + Luna stand in town as overworld figures (their real `_south.png` frames) before Luna joins.
- **Save:** Bone Shrine at town center — interacting writes the `adventure` row and full-heals. No encounters (safe zone). Hidden chest behind the Tender's tent (starter gold + one low-rarity `loot.ts` drop).
- Exits: **East → Forsaken Crossing.**

**ZONE 2 — FORSAKEN CROSSING (field).** `ch1_forsaken_fields.jpg`. Biome `plains` — decaying farmland and a rotted crossroads (stage 1-1 "The Risen Path" walkable). ~40×24 tiles, L-shape with a north spur. Walking music `menu_theme.mp3`.
- NPC: **Refugee on the Road** — one-time hint + a free starter consumable.
- Encounters: step-accumulator (band 22–30), pool **`shambler` + `fastghoul`**. Visible: 2 slow patrolling `shambler` (dodgeable); 1 `boneknight` blocking the north spur (defeat to reach the spur chest; `oneShot`).
- Secrets: north-spur chest (mid-tier loot + `mat_*` material).
- Exits: **West → Lastlight; East → Old Burial Ground.**

**ZONE 3 — THE OLD BURIAL GROUND (dungeon).** `ch4_crypts.jpg` (the battles/splash swap to the crypt backdrop). Biome `crypt` — sunken graves, cracked sarcophagi, root-choked stairs (stages 1-2/1-3 compressed into one explorable dungeon → the 1-5 boss). Two stitched rooms: **Entry Crypt** ~24×18 → **Boss Chamber** ~20×15 (separate maps joined by a stair-door warp). Walking music `menu_theme.mp3`; boss swaps to `boss_theme.mp3`.
- NPC: none (hostile). One **corpse-note** tile-object delivering a `bossBanter`-voice lore line foreshadowing the First Lich.
- **Save:** Bone Shrine just inside the Entry Crypt.
- Encounters: step-accumulator, pool **`boneknight` + `graveyardlich` + `fastghoul`**. Visible: 2 patrolling `boneknight` in the chamber approach (clear to open the boss door; `oneShot`); 1 `graveyardlich` elite guarding a treasure alcove.
- Secrets: false sarcophagus → `MAT_SOULSHARD` + gold; cracked wall → shortcut bypassing one patrol.
- **Boss — The First Lich:** the boss door requires the approach patrols cleared (flag) AND party level ≥ 4 (soft gate via `gating.ts`). Walking onto the boss-trigger tile shows verbatim **`bossBanter['1-5']`** on a prebattle overlay, then routes to **`/battle/play/adv`** (Canon route) with `isBoss:true` → `graveyardlich` rendered via `BOSS_AURA_IDS`, `boss_theme.mp3`. **On victory:** the Cure Fragment pickup appears, the dungeon clears (flag), and Mara's return-line plays in Lastlight. *(Kaius does NOT join in the slice — that is a later milestone.)*
- Exits: **West → Forsaken Crossing; internal stair-door → Boss Chamber.** A post-boss far door is a **"Chapter 2 coming soon"** physical wall (collision block + sign) marking the slice boundary.

### 3.5 Encounters (unified to the real engine)

Both encounter types funnel into the **existing `resolveBattle` auto-battler** via the reserved route `/battle/play/adv` (Canon). The bridge: `AdventureEngine` builds an encounter payload (party from the shared `OwnedHero` store via `toCombatUnit`; enemies from `enemyTemplateIds` via `buildEnemyUnit` at rolled levels), stashes it in a module singleton plus the `bonewake_squad` localStorage key the battle chain already reads, then `navigate('/battle/play/adv')`.
- **Random (step-accumulator):** each fresh tile in an `EncounterZone` adds to a hidden `danger` counter; crossing `dangerBase ± 25%` triggers 1–3 enemies; ~8-step grace after any battle and on zone entry.
- **Visible/bump:** `FixedEncounter` sprites patrol; collision triggers a fixed comp; `oneShot` markers set a flag and never respawn.
- **Boss tiles:** a `FixedEncounter` with `isBoss:true` shows `bossBanterId` banter, renders the enemy via `BOSS_AURA_IDS`, and plays `boss_theme.mp3`.
- Slice pool, verbatim real ids: **`shambler`, `fastghoul`, `boneknight`, `graveyardlich`** (the canonical `ENEMY_TEMPLATES` already driving dungeons/tower, so balance is pre-tuned). Slice boss = `graveyardlich` + `BOSS_AURA_IDS`.

### 3.6 Save points (Bone Shrines)

A skull-cairn tile-object: on interact, (1) writes the `adventure` row (zone id, cell x/y, facing, all flags), (2) full-heals + revives the party, (3) confirm toast. **Autosave** writes the row (no heal) on every zone transition, so a closed tab resumes at the last zone edge; Shrines additionally heal. Slice placement: Lastlight center, Old Burial Ground entry. *Asset gap: shrine prop; interim render = recolored `ui/` frame + a skull material icon.*

### 3.7 Gating & progression (spatial only)

- **Level gates** reuse `src/data/gating.ts` (`isUnlocked`/`FEATURE_GATES`): the boss door soft-gates at level 4.
- **Flag gates** = physical doors/collision toggles opened by booleans in the `adventure` row (boneknight-down opens the north spur; approach-patrols-clear opens the boss door).
- **Cure-Research doors (full game):** synthesis at the bench flips a `gateDoors[].openFlag`, **opening a physical door** — never an abstract node unlock. Progress stays spatial.

---

## 4. Party & Characters

> *"The world is over. We lost. Now we just decide who's worth burning the last of our blood for."*

### 4.1 The Protagonist — KENGO, "The Last Walker"

`id: kengo`, warrior/monk-bruiser, earth. The protagonist, by deliberate choice: he is already the canonical starter (`App.tsx` seeds `kengo`; welcome mail: *"Kengo has joined you…"*); he has the most complete, story-flexible kit (full pro set; Iron Palm 8.0× single-target; Stone Body 35% dodge; Fury Awakens +40% dmg at low HP; neutral earth element); and a wandering monk whose *"fists shatter bone"* is the cleanest human lens on a bone-apocalypse.

**Backstory:** a pit fighter (his art-prompt class title is literally "Pit Fighter") whose walled town fell during the first Wake. He survived because he was already caged when the dead came — the bars that imprisoned him kept the corpses out while everyone who locked him up was eaten. He walks toward the cure because walking is the only thing left that isn't dying.

**Player identity:** Kengo is the **overworld avatar** (moved with arrow keys via his `kengo_south/east/west` frames), **permanent and unremovable** from the active party, the camera, the dialogue voice, and battle slot 1.

> **Asset gap — north walk frames.** Kengo (and every recruit) has south/east/west but **no north frame.** Slice stopgap (Canon): draw `_south.png` when walking north. Real `*_north` frames generated later via PixelLab, anchored to `pro/kengo_south.png`.

### 4.2 Party size & structure

| Tier | Size | Definition |
|---|---|---|
| **Active party** | **3** (Canon) | Fights battles. Slot 1 always **Kengo** (locked). Slots 2–3 = recruited members. Matches `bonewake_squad`, `SquadPicker`, `bondBonusFor`. |
| **Reserve roster** | up to **9** story recruits | Swappable at any Bone Shrine / town. Persists via the shared `OwnedHero` store. |
| **The Wake (mercenary roster)** | all 13 pullable heroes | The full gacha roster — fieldable, but no story beats (§4.5). |

The *story* knows **7 hand-authored recruits + Kengo = 8 narrative characters.** Everyone else is a fieldable mercenary, not a person the plot mourns — keeping the writing tight while honoring "reuse all 752 sprites."

### 4.3 The Story-Critical Core (7 recruits)

Each is a real roster hero with a recruitment cutscene, dialogue, arc, and death-stakes.

**LUNA — "The Dawn That Lies"** (`luna`, healer, light). The roster's **only healer** — the mandatory first recruit, the party's spine. Dawn Resurrection (team heal 1250 + 60% ATK; *does not revive* — a brutal limit), Healer's Touch, Dawn Rises; only `luna_heal` pose. Class prompt "Bloodmage": her "miracle healing" is a blood rite that burns her own vitality. Arc: from performing hope she no longer feels to spending her real self on real people. **Recruit — Ch1, Lastlight** (the slice): Kengo finds her over a pit of the freshly-risen she's been mercy-killing; she joins because Kengo is the first person in months who didn't ask her to fix him.

**ELARA — "The Quiet Range"** (`elara`, assassin/archer, earth). The slice's optional DPS recruit; ranged precision vs Kengo's brawler melee. Arrow Volley (AOE 2.5×), Eagle Eye, Trail Sight; pairs with Len for the **Shadowblades** bond. Class prompt "Plague Archer": immune to the airborne strain, so she's spent the apocalypse as everyone's disposable scout; she's stopped learning names. **Recruit — Ch1, the dungeon mouth** (the slice): she's been shadowing the party; reveals herself after silently saving Luna from a `fastghoul` ambush.

**KAIUS — "The Oath That Outlived Its God"** (`kaius`, tank, light). The roster's **only tank**; tank aura (+15% DEF/+10% HP to allies). Aegis Judgment (7.5× + 450 ally shield 2t), Iron Stance, Battle Cry. Class prompt "Fallen Paladin": his entire order died defending a cathedral that fell anyway. Arc: protecting *these* living people over a dead institution's honor. **Recruit — Ch5, Pale Cathedral:** Kaius is the last defender. *(Re-grounded per critique: his captain's reanimation as the gold-armored `gilded_revenant` is correctly a **Chapter 12 (Iron Famine)** callback, not a Ch5 asset. At Ch5 the mentor-loss beat uses the Cathedral's region-correct `plague_monk`.)* **Kaius is NOT a slice recruit** — he joins in Act III.

**LEN / "ARCAVELI" — "The Knife Already Behind You"** (`len`, display name **Arcaveli**, assassin/twin-blade, dark). *(Implementation: id is `len`; story keys off `len`, displays "Arcaveli.")* Shadow Dance (lowest-HP finisher 7.2×), Bloodlust, Shadow Step; highest SPD+CRIT. Class prompt "Veteran Assassin"; `bonds.ts` "Gutter Kings" (*"a drunk and an assassin own every alley"*) is his pre-game life. **Recruit — Ch3, Necropolis:** already inside hunting the Crowned Lich; offers an alliance of convenience that never ends.

**GEORGE — "The Last Grove"** (`george`, warrior/shapeshifter druid, earth). Richest cutscene asset — sprite shapeshifts (attack=human, skill=wolf, ult=bear). Primal Form (7.8×); beefiest warrior (1280 HP). Class prompt "Wild Shaman": abandoned the last living grove to seek a cure a grove can't outlast. **Recruit — Ch4, Whispering Crypts:** holds a swarm of `carrion_spider` off dying refugees; joins because Kengo's party tried to carry the wounded.

**KORVAN — "The Black Harvest"** (`korvan`, warrior/soul-reaper, dark). The villain-to-ally arc. Soul Harvest (AOE 2.7×), Crimson Frenzy, Soul Drink; **Reaper's Pact** bond with Manny. Believes the cure is cruelty and has been *culling* survivor camps as "mercy." Fights the party across Act IV before Kengo refuses to kill him. He never fully softens. **Recruit — Ch8, post Soul Leech:** a forced battle against Korvan-as-enemy; on defeat, a choice-driven scene recruits him.

**THE TWINS / TATIANA & ROIIFY — "Bound As One"** (`twins`, mage duo, light). The endgame signature recruit — two combatants in one slot, highest base power, the owner self-insert. Yin-Yang Strike (AOE 2.8× + burn 180/3); deliberately ~15–20% over budget. **Paired Dawn** bond ties them to Luna. Arc: living proof of the whole game's question — loyalty to one vs survival of all. **Recruit — Ch9, Necromancer's Court:** found defending a sealed vault rumored to hold the last cure research.

### 4.4 Recruitment cadence

| Order | Recruit | Chapter / beat | Backdrop (real) | Role added | In slice? |
|---|---|---|---|---|---|
| 0 | **Kengo** (start) | Ch1 start, Lastlight | `ch1_forsaken_fields.jpg` | DPS (locked slot 1) | ✅ |
| 1 | **Luna** | Ch1, Lastlight | `ch1_forsaken_fields.jpg` | Healer (mandatory) | ✅ |
| 2 | **Elara** | Ch1, dungeon mouth | `ch1_forsaken_fields.jpg` | Ranged DPS | ✅ (optional) |
| 3 | **Arcaveli** (`len`) | Ch3, Necropolis | `ch3_necropolis.jpg` | Burst finisher | M3+ |
| 4 | **George** | Ch4, The Singing Bones | `ch4_crypts.jpg` | Off-tank bruiser | M3+ |
| 5 | **Kaius** | Ch5, Pale Cathedral | `ch5_cathedral.jpg` | Tank (trinity complete) | M3+ |
| 6 | **Korvan** | Ch8, post Soul Leech | `ch8_zombie_battlefield.jpg` | Dark AOE (villain→ally) | M5 |
| 7 | **Tatiana & Roiify** | Ch9, Open Graves | `ch9_necromancer_court.jpg` | Endgame duo | M5 |

**Pacing note:** the full trinity (tank+healer+DPS) isn't complete until Kaius at Ch5. If Act-I/II attrition proves brutal in playtests, Kaius's recruit can shift to **Ch2 Ashen Wastes** (`ch2_scorched_wastes.jpg`) — both backdrops exist, so it's a one-line data change. The slice ships the Ch1 trio (Kengo/Luna/Elara) to validate the loop first.

### 4.5 How the full roster coexists ("The Wake")

**Layer 1 — The Bound (8 story characters):** Kengo + the 7 recruits. People with arcs; recruited through play.
**Layer 2 — The Wake (mercenaries):** every other pullable hero — **Aelia** (frost), **Pyra** (pyro), **Manny** (death caller), **Chino** (drunken master), **Reiji** (samurai) — fieldable in active slots 2–3 with no cutscenes. Diegetic framing: other survivors/sellswords passing through camp. The gacha/summon flow stays 100% untouched; pulls add Wake mercenaries to the same shared `OwnedHero` bench.

**Special cases:**
- **Manny (`manny`)** — his solo mechanic auto-fills the squad with **Bone King** + **Lich Sovereign** summons (`MANNY_SUMMON_IDS`), so he cannot share a fixed story trio. **Decision:** in the walkable party, fielding Manny is **allowed but special-cased** — selecting him fills the remaining 2 active slots with his summons (matching live behavior), making him a self-contained "lone necromancer" companion. He is best used as a recurring Ch9 mid-boss-or-ally set-piece. The hidden summons stay non-recruitable (`HIDDEN_HERO_IDS`).
- **Reiji + Chino** — the **Broken Oath** / **Gutter Kings** bond pair: a ready-made *optional* Act II recruitment duo, flagged for a post-slice expansion, not the core 7.

### 4.6 Combat-role coverage (core 7 + Kengo)

| Character | Archetype | Element | Battle niche | Signature |
|---|---|---|---|---|
| Kengo | warrior | earth | Sustained single-target, self-dodge | Iron Palm (8.0×) |
| Luna | healer | light | **Only** sustain | Dawn Resurrection |
| Kaius | tank | light | **Only** wall + ally shields | Aegis Judgment |
| Elara | assassin | earth | Crit / AOE chip | Arrow Volley |
| Arcaveli (`len`) | assassin | dark | Lowest-HP finisher | Shadow Dance |
| George | warrior | earth | Off-tank bruiser | Primal Form |
| Korvan | warrior | dark | Crit AOE + on-kill heal | Soul Harvest |
| Twins | mage | light | Endgame burst + burn | Yin-Yang Strike |

Spread: earth ×3, light ×3, dark ×2 — enough for the `combat.ts` triangle (fire>earth>water>fire; light↔dark) to matter without forcing a pull. The one intentional gap is **mage damage before the Twins**, fillable by a Wake mercenary (Aelia/Pyra) — a real reason to engage the gacha without making it mandatory.

---

## 5. Battle System

> **SCOPE (Canon §0):** The **slice ships on the existing `resolveBattle` auto-battler, unchanged.** This entire section specifies the **post-slice Milestone M2 — Interactive Combat** (the FF-style ATB command menu). It is the design target for the full game's battles, NOT the slice.

### 5.1 North star: ATB, conditional-wait (FF IV/VI register)

`combat.ts` already orders units by **pure SPD descending, recomputed each round** (one shared initiative list) — an initiative model, not a side-phase model. ATB is its natural evolution: convert the per-round SPD sort into a continuously filling gauge where `fillRate ∝ spd`, preserving the exact role SPD plays today (Arcaveli 95 / Twins 90 / Elara 90 … Kaius 50 / Kengo 70) and the protected speed/crit identities. **Conditional-wait:** when a player hero's gauge is full and the command menu / target selector is open, **all other gauges pause** (default = Wait; an "Active" toggle in `Profile.settings`). Battle speed reuses the existing `speed` 1/2/4/8× control, here scaling ATB fill rate.

**Engine impact:** Story (M2) battles do **not** call `resolveBattle()` (which resolves synchronously). A new driver `src/lib/storyBattle.ts` owns the ATB loop and calls **extracted, side-effect-free kernel functions** from `combat.ts` for all math. The clever `manualUlt`/`forceUltNow`/`resume`-re-resolve hack is dropped in favor of a real paused loop.

### 5.2 The command menu (6 commands)

| Command | Behavior | Engine basis |
|---|---|---|
| **Attack** | Basic attack, manual target. Charges +20 energy self / +30 target. | Reuse the basic-attack math verbatim (`mitigatedDamage`, `rollCrit`/`critMult`, `elementAdvantage`, on-hit/lifesteal/reflect/shield). Replace `pickEnemyTarget` with a UI cursor (player only). |
| **Skill** | The hero's **Ultimate** (`ultimateId`). Greyed until `energy >= 100`. | Reuse the ult branch wholesale; player chooses *when*. |
| **Magic** | MP-cost spell list (§5.4). | `Skill`/`SKILL_BY_ID` reused as the spell registry. |
| **Item** | Use a consumable. | Reuse `useItems` + Dexie `items`; reuse heal/revive math. |
| **Defend** | **NEW plumbing:** pushes a new `def_buff` ActiveEffect + a 50% incoming-damage-reduction flag until the hero's next turn; refunds +10 energy; half-fills the next ATB gauge. | `def_buff` exists as an `ActiveEffect.kind` but **not** as a castable `Skill.effect.type` — so Defend is a small new action, not a free reuse. |
| **Flee** | Party escape (§5.5). | NEW. |

### 5.3 Party & targeting

Fixed 3-hero active party (Canon), loaded via `loadSquad()` and built with `toCombatUnit` — so equipment, gems, talents, set bonuses, tank aura, and bonds (Shadowblades, United Front) all apply unchanged. Manny's solo special-case (§4.5) is honored. **Targeting:** a manual cursor for player actions (`single` → any one; `all` → whole rank sweep; `lowest` (Arcaveli) → auto-locks lowest-HP; `self` → caster). Taunt still constrains enemy AI only (`pickEnemyTarget` reused for enemies).

### 5.4 MP / Magic economy (NEW, full-game)

`combat.ts` has no MP — ults use the 0–100 `energy` charge. We **keep energy for the ult (Skill)** and **add MP for Magic** (orthogonal: burst vs sustain). **Unified spec (Canon, single source):**
- New base stat `mp`/`maxMp` on `CombatUnit`, `OwnedHero`, base block.
- **Base MP by role:** Mage/Healer 40, Tank 28, Warrior 24, Assassin 22. **+2 MP per hero level.** **MP does NOT scale with `levelMult`** (keeps the resource economy flat/readable).
- **MP regen:** +6 MP at the start of each of that unit's turns; full refill after every battle. No overworld MP regen except at Bone Shrines / the Tender (resource tension between fights).
- **Spell list = `SKILL_BY_ID` entries tagged with `mpCost`** plus a `learnedAt` level; generalize each hero from one `ultimateId` to `{ ultimateId, spellIds[] }`. Existing `Skill` targeting (`single|all|lowest|self`) and effects (`heal|shield|burn|stun|buff_atk|revive`) cover the slice/full spell set.
- **`stun`** is wired-but-unused today; M2 activates it (e.g. the `graveyardlich`'s "Grave Chill").
- **`cure`/`cleanse` is NET-NEW (Canon):** add a new effect path that **strips `burn` and `stun`** (never "poison" — no poison status exists). Luna's *Cleanse* and antidote consumables route through it.

Sample kits (M2, data-only on `skills.ts`):

| Hero | Lvl 1 | Lvl 3 | Lvl 8 | Lvl 14 (capstone = existing ult) |
|---|---|---|---|---|
| **Kengo** | Strike (basic) | Stone Fist (1.8× single, 6 MP) | Guard Break (1.5× + def-shred, 8 MP) | **Iron Palm** (8.0× single, 18 MP) |
| **Luna** | Strike | Mend (heal 1.2× ATK, 5 MP) | Dawnlight (heal all 600, 10 MP); *Cleanse* (strip burn/stun, 6 MP) | **Dawn Resurrection** (heal team 1250 + 60% ATK, 22 MP) |
| **Aelia** | Strike | Frost Shard (1.6× single, 5 MP) | Ice Lance (2.0× + chance-stun, 9 MP) | **Frost Crystal** (2.6× all, 20 MP) |
| **Kaius** | Strike | Bulwark (new def_buff +200/3t, 6 MP) | Taunt Roar (force-target self 2t, 7 MP) | **Aegis Judgment** (7.5× + 450 ally shield 2t, 20 MP) |
| **Arcaveli** | Strike | Backstab (1.9× single, 5 MP) | Twin Cut (1.4× ×2, 8 MP) | **Shadow Dance** (7.2× lowest-HP, 16 MP) |

### 5.5 Escape (Flee, M2)

Success = `clamp(0.35 + (partyAvgSpd - enemyAvgSpd)/200, 0.10, 0.95)`. Consumes the fleeing hero's turn; on failure the party forfeits initiative (enemy gauges +25%); on success the battle ends, returns to the pre-encounter tile, no rewards, grace window set. `fleeAllowed = false` on boss/miniboss/scripted-ambush encounters.

### 5.6 Battle backgrounds, formations, enemy sprites (all real)

Backgrounds map zone → real bg JPG via `CHAPTER_BG`/`auraMap.ts` (auto-warm into the `bonewake-images` runtime cache via `asset()`). Formations are 1–5 enemy slots referencing real bases in `public/sprites/pixellab/enemies/pro/`, rendered with `ENEMY_SPRITES` + `UnitCard`. Enemy AI reuses `pickEnemyTarget` (taunt → lowest-HP tank 80%, else 70% lowest / 30% random) and existing healer/ult logic. Elite variants = same sprite, stat-scaled + `BOSS_AURA_IDS` glow.

### 5.7 Victory / XP / loot (shared spine — both auto-battler slice and M2)

- **XP:** `distributeSquadExp` (`src/lib/rewards.ts`) against the **shared `OwnedHero` levels** (Canon: roster is shared, so XP mutates the same `OwnedHero` the whole app sees) with `xpForLevel`/`levelMult`/`STAR_MULT`. Per-formation `xpReward` (boss > miniboss > elite > common).
- **Loot:** ARPG drop system (`loot.ts`/`lib/loot.ts`) is the spine; owner-assigned via `pickOwnerFor`/`BASE_CLASS_USERS` (bow→Elara, staff→casters). Gold/gems via `useProfile`. Bosses drop guaranteed `MAT_SOULSHARD` + per-hero essence.
- **Victory screen:** `boss_theme`→fanfare; framer-motion EXP bars; HP (and MP, M2) restore; return to overworld at the encounter tile with grace window. First-clear/best metrics recorded in the **`adventure`** row (Canon — single table).
- **Defeat (Canon):** wipe → respawn at the last Bone Shrine / Tender, HP+MP restored, small gold penalty, no XP loss. No permadeath.

### 5.8 Reuse vs build (M2)

**Reuse (do not rewrite):** the damage/crit/element/status kernel; status tick; ability effects (ult branch, heal math `1250 + 60% ATK`, Luna heal-revive-less, Kaius shield-all, Pyra/Manny/Twins burn, Chino buff_atk; `applyOnHit/OnKill/OnAttackHeal/FirstTurn`; echo aggregation; SPD-derived dodge); enemy AI; SPD initiative (→ ATB basis); identity scaling; tank aura; bonds; all gear/gem/talent aggregation (`calcHeroStats`→`toCombatUnit`); `SpriteAnimator`/`HERO_SPRITES`/`ENEMY_SPRITES`/`UnitCard`/`CHAPTER_BG`/audio/framer-motion; Dexie/stores/`distributeSquadExp`/loot/currencies/save-export-import.

**Build (M2):** `storyBattle.ts` ATB driver + extracted kernel functions; command menu + manual cursor UI; MP system; in-battle Item system (`src/data/consumables.ts`); Defend (new `def_buff` ActiveEffect + reduction) and Flee; the new **`cure`** (strip burn/stun) effect path; overworld encounter glue (already built in the slice via the auto-battler); defeat-to-shrine flow.

**Drop:** the `manualUlt`/`forceUltNow`/`resume` machinery; any synchronous `resolveBattle` call in the M2 Story path. *(The slice still uses `resolveBattle` — M2's driver replaces it only when M2 lands.)*

---

## 6. Progression, Equipment & the Cure-Research Meta

**Pillars:** grow a fixed cast, not a gacha box; power comes from three legible sources — **Level (XP)**, **Gear (loot + signature sets + gems)**, and **Cure Research** (the meta-track); numbers stolen from the live game (`xpForLevel`, `levelMult`, `STAR_MULT`, `mitigatedDamage`) so the slice is balanced against the same math.

### 6.1 Leveling & XP

Reuse `xpForLevel = round(50 * 1.18^(level-1))`, `levelMult = 1 + (level-1)*0.05`, and `distributeSquadExp` verbatim. Both level tracks kept: **hero level** drives `levelMult` and ability unlocks; **account/player level** drives `playerLevelMult` (+0.25% HP/ATK/DEF), crit/dodge identity scaling, and the cap `effectiveLevel = min(star*200, playerLevel)`. **Slice cap:** hero & account 1→20 (well inside the S/star-3 cap of 200). SPD/CRIT never scale with level (engine rule), preserving assassin/crit identities.

XP table (computed from the live formula): L1 0 cum / L5 261 (`levelMult` 1.20) / L10 957 (talents unlock, `floor((lvl-10)/3)`) / L13 first talent point / L20 6,200 cum (`levelMult` 1.95). Slice payout (via `distributeSquadExp`): common 18 XP, elite (+`graveyardlich`) 45, mini-boss 180, the slice boss (The First Lich) 400 + the Cure Fragment. Re-clearing the same overworld encounter id pays 50% after the third clear (anti-grind decay, stored on the `adventure` row by encounter id).

### 6.2 Stat growth per role

No explicit per-level tables — growth is `base × STAR_MULT[star] × levelMult × playerLevelMult` in `calcHeroStats`. Role base blocks (real, `heroes.ts`) encode role identity, so roles diverge automatically as they level (at L20 / `levelMult` 1.95, Kaius ~3510 base HP vs Aelia ~1658; the tank pulls further ahead in survivability, the mage in ATK). **No manual stat-point screen** — player-directed growth lives entirely in **Talents** (the 3-branch Might/Finesse/Endurance trees, `talents.ts`, unlocking at L13/16/19 in the slice), one customization surface, not two.

### 6.3 How skills & magic are learned (full game)

The live game gives each hero one ability; FF needs a list. Generalize `Skill`/`SKILL_BY_ID` into multi-ability kits (§5.4), learned three ways: **(a) by level** (`learnedAt`; capstone = existing ult at L14); **(b) by equipment** — a 5-piece signature set can rank up an ability (e.g. **Iron Mountain** `kengo_iron` 5-piece grants Iron Palm +1 rank, the parsed `ultDmgBonus` doing the work); **(c) by item (tomes)** — deferred past the slice. One capstone per hero, gated behind level AND MP, so the feel is "open cheap, build to the capstone." *(All §6.3 applies to M2; the slice uses the auto-battler's single-ult model.)*

### 6.4 MP

See §5.4 for the **single canonical MP spec** (Mage/Healer 40 / Tank 28 / Warrior 24 / Assassin 22; +2/level; no `levelMult` scaling; +6/turn regen; full refill on victory; overworld regen only at shrines/Tender). M2 only.

### 6.5 Equipment (reuse the real three-system model)

1. **ARPG random loot (`loot.ts`) = the spine.** `BaseItem` + affixes; rarity 1–5 weights `{1:60,2:28,3:9,4:1.5,5:0.2}`; quality `q`→T1–T20; `upgradeMult = 1 + upgradeLevel*0.05`; hero-bound `boundTo`; 5 slots; class-keyed ownership (`pickOwnerFor`/`BASE_CLASS_USERS`).
2. **Signature ultimate sets (`ultimateGear.ts`) = the chase.** Each slice hero's real 5-piece set (Kengo's **Iron Mountain** `kengo_iron`, plus Luna's/Elara's, and Kaius's/Aelia's/Arcaveli's later); bonuses at 2/3/5; 5-piece "+N% ult damage" → `ultDmgBonus`.
3. **Gems (`gems.ts`) = tuning.** Sockets by rarity `0/1/1/2/3/3`; tiers 1–4 auto-generated, tier-5 ult-gems hero-bound. **Slice ships tiers 1–3.**

**Pruned for the slice:** the legacy fixed-stat `equipment.ts` is dropped from Story mode (redundant with ARPG loot).

Sample slice drops (scaled by `equipStats`):

| Item | Base / Slot | Rarity | Primary | Affixes | Bound | From |
|---|---|---|---|---|---|---|
| Cracked Bone Cleaver | axe / weapon | 1 Common | ATK +18 | — | warrior | `shambler`, `boneknight` |
| Mire-Soaked Hood | hood / helm | 2 Magic | HP +90 | +4% crit | caster | `graveyardlich` elite |
| Frostbitten Talisman | talisman / accessory | 3 Rare | CRIT +6% | +60 ATK, +8 SPD | (caster) | The First Lich |
| Iron Mountain — Gauntlet | set (`kengo_iron`) | set | ATK +55 | +ult dmg @5pc | Kengo | crafted (`MAT_SOULSHARD` + Kengo essence + gold) |
| Chipped Ruby (T2) | gem | tier 2 | ATK +24 | socket | any | `fastghoul` packs, shop |
| Worn Sapphire (T2) | gem | tier 2 | HP +180 | socket | any | shop, dungeon |

Boss **Echoes** (the live one-time `revive_first_fallen` / offensive-mult system) are kept as a rare drop but not required to clear the slice.

### 6.6 Consumables & items (NEW, minimal)

No in-battle consumable system exists today. Build the smallest one: `src/data/consumables.ts` `{ id, name, effect:{type,value}, target }`, an **Item** command routing through the shared resolver (reusing `heal`/`revive`; **`cure` is the NET-NEW strip-`burn`/`stun` path**, never "poison"). Shared party inventory (the one place bind rules relax). *(In-battle item use is an M2 feature; the slice's only consumable, Joss's healing tonic, is field-use/out-of-battle via `useItems`.)*

| Item | Effect | Target | Where |
|---|---|---|---|
| Rotgut Tonic (lesser potion) | Heal 350 HP | 1 ally | Joss 40g; common drop (**the slice's one consumable**) |
| Marrow Draught (greater potion) | Heal 900 HP | 1 ally | shop 120g; elite drop (M2+) |
| Field Ether | Restore 25 MP | 1 ally | shop 80g; dungeon (M2+) |
| Plaguebane Vial | **Cure `burn`/`stun`** (NEW path; not "poison") | 1 ally | shop 30g; `plague_caster` drop (M2+) |
| Grave-Salt (revive) | Revive ally @ 30% HP | 1 dead ally | shop 250g; boss drop (M2+) |
| Bonewake Ration | Out-of-battle: full HP(+MP) party | party | inn-only, 60g |

### 6.7 Currency & shops

Reuse live `Profile` currencies (`gold`, `gems`, `friendPoints`); the slice spends **only gold** (+ Cure reagents, §6.8). Gems/friendPoints untouched (no gacha in Story). Gold from encounters (common ~12g, elite ~35g, boss ~150g) and salvage. `MAT_SOULSHARD` from boss/elite clears for signature crafting.

**Slice shop:** **Joss the Bonepicker** in Lastlight — sells the Rotgut Tonic, T1–T3 gems, a gold-only gear-upgrade service (`upgradeMult`), and a salvage bench (gear → scrap/arcane dust; gems → gem dust). The darker **Cure Research bench** is introduced narratively by **Mara** in the full game (the Bonecaller-medic role folds into Mara/Joss for the slice). Music in town/shop: `menu_theme.mp3`.

### 6.8 THE META-HOOK — Cure Research

Killing **plague-strain bosses** (the painted `bosses/` assets) yields reagents spent at the **Cure Research Bench** to synthesize **Cure Stages**, each of which: (1) **opens a physical door** to the next biome (spatial gate, per Canon — never an abstract node unlock), (2) grants a **permanent party-wide "Inoculation" buff** injected at the same point `playerLevelMult` already injects in `calcHeroStats` (tiny, low-risk surface), and (3) advances a visible **Cure %** meter on the Adventure map (0→100 = full cure = end of the full game).

**Currencies:** **Cure Sample** (generic, 1 per painted-boss kill), **Strain Reagent** (named per boss — *Dragon's Ichor* from `bonewake_dragon`, *Hydra Bile* from `plague_hydra`, etc.), and **Cure Progress (%)** (a new `Profile.cureProgress` scalar).

**Slice/early Cure Stages.** *(Critique fix: the slice's mandatory boss is the auto-battler `graveyardlich` First Lich, NOT a painted boss; painted-boss Cure stages begin at M4 when painted bosses are wired and have story-scaled stats. The slice ships **Stage 0**, fed by the First Lich, with painted-boss stages as the documented continuation.)*

| Cure Stage | When | Cost | Cure % | Inoculation (party-wide) | Spatial gate |
|---|---|---|---|---|---|
| **Stage 0 — First Sample** | **Slice (M1)** | The Cure Fragment from **The First Lich** (`graveyardlich`) | +3% (→3%) | **+8% max HP** | Opens the "Chapter 2 coming soon" door framing (slice boundary) |
| **Stage I — Isolate the Strain** | M4 | 1× *Dragon's Ichor* (`bonewake_dragon`) + 2× Cure Sample + 300g | +5% (→8%) | +6% ATK | Opens Ch2→Ch3 door |
| **Stage II — Culture the Antigen** | M4 | 1× *Hydra Bile* (`plague_hydra`) + 4× Cure Sample + 600g | +5% (→13%) | **−10% damage from `dark`-element enemies** (counters the roster's heavy dark bias) | Opens Crypts interior |

**Why it's right:** reuses real bosses with zero new boss art; buffs inject where `playerLevelMult` already does; it's *complementary* (leveling deepens individuals, Cure Research lifts the whole party and gates the story) and never competes for XP. *Asset gap: Cure Research Bench UI panel + reagent icons (reuse `ui/` material-icon style).*

---

## 7. Technical Architecture (tile engine + integration)

Hard constraint: nothing here touches or destabilizes the live gacha game. The Adventure mode is **additive** — new routes, a new store, one new Dexie table, new data files, new components — reusing the combat engine, `SpriteAnimator`, the 752 sprites, the 3 tracks, and the deploy.

### 7.1 Rendering: Canvas for the map, DOM for the UI

Render the walkable map on a single `<canvas>`; keep all HUD/menus/dialogue as React DOM overlaid on top. A DOM-grid map would mean hundreds of nodes with per-frame `style.backgroundPosition` mutations driven by React state — unrealistic at 60fps on the 16GB Air / phone PWA target. Canvas draws the same scene with a few `drawImage` calls, `ctx.imageSmoothingEnabled = false`, sub-tile camera offsets, and **one `requestAnimationFrame` loop** that React never re-renders during walking (React re-renders only on discrete state: dialogue opens, menu appears, a battle starts). DOM (not canvas) is kept for dialogue/menus/HUD so the existing UI kit (`PageHeader`, `Card`, `Pill`, `PrimaryButton`, framer-motion, `MotionConfig` reduce-motion) is reused verbatim.

**Crucial:** the map canvas does **not** use `SpriteAnimator` (that's a CSS-background-position tweener for DOM `<div>`s — wrong tool). A small canvas blitter (`drawSpriteFrame`, §7.4) draws overworld sprites using the **same source PNGs and frame-grid metadata** `HERO_SPRITES`/`ENEMY_SPRITES` already describe. `SpriteAnimator` continues unchanged in the battle screen we hand off to (§7.6). The canvas lives in `AdventurePage`, a full-screen route **outside `<Shell>`** (like `/battle/play/:stageId`), so the map gets the whole viewport with no nav chrome; the entry *into* Adventure is surfaced inside Shell.

### 7.2 Tilemap data format

See §3.2 — typed TS modules under `src/data/adventure/maps/` (typecheck-gated, tree-shaking, no fetch). Three draw layers + a data collision layer; two-tier collision (`solidTiles` default + per-cell `collisionOverride`).

### 7.3 Movement / collision / interaction loop

One `requestAnimationFrame` loop in `AdventureEngine` (`src/lib/adventure/engine.ts`) — a plain TS class, not a React component, so walking never triggers React renders. `AdventurePage` instantiates it in a `useEffect`, hands it the `<canvas>` ref, and subscribes to discrete callbacks (`onDialogue`, `onBattle`, `onAreaChange`, `onMenu`) that flip React state for the DOM overlay. Movement is tile-locked with ~140 ms interpolation and input buffering (Canon). Collision: out-of-bounds/`collisionOverride 1`/`solidTiles`/occupied-by-NPC-or-fixed-encounter → blocked. Per-frame: read input snapshot → advance the active slide → on completion run enter-tile triggers (warp / step-accumulator roll) → tick NPC/fixed-encounter movers → handle interaction ray (1 tile in facing dir) → render (clear → ground → decor → y-sorted sprites → overhead). While an overlay is open, an internal `paused` flag keeps drawing the last frame and ignores movement.

### 7.4 Overworld sprite blitter

`drawSpriteFrame(ctx, sheet, frameIndex, dx, dy, size)` in `src/lib/adventure/sprites.ts` reuses the exact sheet conventions (`cols`, per-pose strip counts, the `pixellab/heroes/pro/<id>_<pose>.png` scheme). Standing facing uses `_south/_east/_west`; west mirrors east where absent (matching `UnitCard` flips). **Walk animation (V1):** a 2-pose "step" bob off the directional frame (battle sprites are not walk cycles) — flagged Asset gap; later replaced by true 3-frame cycles. **North (Canon stopgap):** draw `_south.png` when walking north; maps minimize northward travel. A shared `spritePath(id,pose)` helper is the single source of truth for sprite paths (consumed by both the blitter and the battle path map).

### 7.5 Routing, store, Dexie

**Route:** add `import AdventurePage` + `<Route path="/adventure" element={<AdventurePage/>}/>` **outside `<Shell>`** in `App.tsx`. Relative path only (router prepends `basename` = `/bonewake` in prod). The deploy workflow's `cp dist/index.html dist/404.html` already resolves deep-links. Surface the entry by adding one item to the `MODES` array in `ModesPage.tsx` (supports `GATE_BY_PATH` level-gating) and optionally a Home `ActionCard`. Do NOT repoint the "Story" tab (live `/battle`) or resize the 6-slot bottom nav.

**Store:** `src/store/adventure.ts` → `useAdventure`, the existing thin-wrapper-over-Dexie pattern (mutate Dexie, then `set`). It holds **only exploration/story state**, never a parallel hero-level store (Canon: roster is shared):

```ts
interface AdventureSave {
  id:'me';
  currentMapId:string; px:number; py:number; facing:Dir;
  party:string[];                 // hero ids in the active Adventure party, max 3, default ['kengo']
  recruited:string[];             // story-recruited hero ids
  storyFlags:Record<string,boolean>;   // recruited_luna, beat_first_lich, cure_stage_0, ...
  defeatedEncounters:string[];    // oneShot fixed-encounter ids
  inventory:Record<string,number>;// adventure-local consumable counts
  clears:Record<string,{first:boolean;best?:number}>; // per-zone/encounter clear records
  playtimeMs:number;
}
```

**Dexie:** add **one** table via an appended migration (never edit an existing version):

```ts
this.version(6).stores({ adventure: 'id' }); // additive; live chain ends at version(5)
```

The `adventure` table is separate from `profile`/`heroes`/`equipment`, so exploration progress is isolated **but hero levels/gear are NOT** — recruiting Luna adds her id to `recruited` and grants the same `OwnedHero` the gacha sees (Canon: shared roster, so `toCombatUnit`/`bondBonusFor`/gear all reuse). `exportSave`/`importSave` gain one table. `initSave()` seeds a default Adventure row lazily on first `/adventure` entry, not at boot.

### 7.6 Battle hand-off (reuse, don't fork)

On encounter, `AdventureEngine` builds a payload: the active party → `CombatUnit`s via `toCombatUnit` (using `HERO_BY_ID` + the shared `OwnedHero` levels/gear), enemies via `buildEnemyUnit` from the zone's real `enemyTemplateIds` at rolled levels. **Handoff:** stash the payload in a module singleton (`src/lib/adventure/handoff.ts`) plus the `bonewake_squad` localStorage key, then `navigate('/battle/play/adv')` (Canon route). `BattlePlayPage` gets a single guarded branch: `if (stageId === 'adv')` → read `pendingAdventureBattle`, pick `CHAPTER_BG[battleBgChapter]`, show `BOSS_BANTER[bossBanterId]` when present, render `isBoss` enemies via `BOSS_AURA_IDS`, play `battle_theme`/`boss_theme`. The auto-battler, `UnitCard`, `SpriteAnimator`, audio, and reward payout run unchanged. **Return:** `BattlePlayPage` calls back through `handoff.ts` with the `BattleResult` and `navigate('/adventure')`; the engine writes XP via `distributeSquadExp` (mutating the shared `OwnedHero`), marks `oneShot` encounters defeated, sets `storyFlags`, and restores `(px,py,facing,currentMapId)`. On loss → respawn at the last shrine/Tender (Canon). Reserving `adv` is safe: real stage ids are `'<chapter>-<stage>'` and never collide with `'adv'`.

### 7.7 Asset loading & Pages base path

All Adventure art loads through `asset()` (prepends `BASE_URL` + `?b=<buildid>`). New tile/prop/sprite PNGs live under `public/sprites/adventure/...`; map backdrops reuse `public/sprites/bg/*.jpg`. Per the PWA config, `public/**` images are **runtime-cached** (CacheFirst, `bonewake-images`, 1500-cap) — no manifest/precache edit; audio likewise. **Deploy unchanged.** `src/lib/adventure/assets.ts` provides `loadImage(src)` + a cache; `AdventurePage` shows the `<Splash>`-style loader until the current map's tileset + on-screen sprite sheets resolve, then starts the rAF loop. **Never hardcode `/bonewake/`** — always `asset('sprites/adventure/...')`.

### 7.8 File/module plan

New: `src/pages/AdventurePage.tsx`; `src/lib/adventure/{engine,sprites,assets,handoff}.ts`; `src/store/adventure.ts`; `src/data/adventure/{types,tiles,dialogue}.ts` + `maps/index.ts` + per-map files (`lastlight.ts`, `forsaken_crossing.ts`, `old_burial_ground.ts`, `burial_boss_chamber.ts`); `src/components/adventure/{DialogueBox,PauseMenu,PartyScreen,Dpad,AreaBanner}.tsx`.
Surgical edits (additive only): `App.tsx` (one import + one route outside Shell); `src/lib/db.ts` (one appended `version(6)`); `src/pages/BattlePlayPage.tsx` (one guarded `if (stageId === 'adv')` branch); `src/pages/ModesPage.tsx` (one `MODES` entry). Optional hygiene: hoist duplicated `CHAPTER_NAMES`/`CHAPTER_EMOJI` into `src/data/chapters.ts`.

---

## 8. Production Roadmap & the First Vertical Slice

### 8.1 Vertical Slice — "Forsaken Fields: The First Wake"

One self-contained ~20–30 min loop that proves the walkable-RPG pillar end-to-end and survives a reload on GitHub Pages: **boot → open Adventure → walk Lastlight → talk to NPCs → accept the Cure Fragment quest → walk the overworld path → enter the Old Burial Ground → fight encounters → beat The First Lich → grab the Cure Fragment → return to Lastlight → quest resolves → save persists.**

**Definition of done (walking the whole way):**
1. Start in **Lastlight** controlling **Kengo**; save at the **Bone Shrine** (The Tender full-heals); buy a **Rotgut Tonic** from **Joss**; accept the quest from **Mara**.
2. Walk **east** into **Forsaken Crossing**; survive `shambler`/`fastghoul` step-accumulator encounters; dodge or kill the visible `shambler`; beat the `boneknight` to open the north spur; grab the spur chest.
3. Walk **east** into **The Old Burial Ground**; save at its Bone Shrine; fight through `boneknight`/`graveyardlich`/`fastghoul`; clear the approach patrols; read the corpse-note (`bossBanter`-voice).
4. Recruit **Luna** (in Lastlight) and **Elara** (at the dungeon mouth) along the way; they appear in the squad and `bonewake_squad`.
5. Trigger **The First Lich** (`graveyardlich` + `BOSS_AURA_IDS`) with verbatim `bossBanter['1-5']`; fight via the **existing `/battle/play/adv` → `resolveBattle`** to `boss_theme.mp3`.
6. On victory: Cure Fragment pickup (Cure Stage 0, +8% party HP), dungeon clears, Mara's closing line (*"One fragment. The Necromancer holds the rest."*); hit the "Chapter 2 coming soon" wall.

**Slice reuses:** real heroes (Kengo, Luna, Elara), real enemies (`shambler`/`fastghoul`/`boneknight`/`graveyardlich`), real backgrounds (`ch1_forsaken_fields`, `ch4_crypts`), real audio (`menu`/`battle`/`boss`), real banter (`bossBanter['1-5']`), the **United Front** bond (any full 3-hero squad: +300 HP/+30 ATK), the auto-battler, and the shared economy stores.
**Slice builds:** the canvas tile engine + map data + step-accumulator/visible-enemy glue + interaction/dialogue + the `adventure` Dexie table + the `/battle/play/adv` handoff + the Cure-Fragment quest flag. **No interactive combat in the slice** (that's M2).

### 8.2 Milestone roadmap

| Milestone | Theme | Deliverables | Combat | Art |
|---|---|---|---|---|
| **M0 — Pre-slice spike (1 wk)** | Prove canvas tiles in React | placeholder grid, arrow movement + collision, camera, deploys | n/a | placeholder colored tiles |
| **M1 — VERTICAL SLICE (3–4 wks)** | "Forsaken Fields: The First Wake" | Everything in §8.1, deployed to Pages | **Reuse `resolveBattle`** | Asset Gap Wave 1 (§9) |
| **M2 — Interactive combat (3–4 wks)** | FF ATB command menu | `storyBattle.ts` + extracted kernel; Attack/Skill/Magic/Item/Defend/Flee; MP stat; new `cure` (strip burn/stun) + `def_buff`-cast paths; `consumables.ts`; in-battle items | **Build new** | UI: command-menu frames (reuse `ui/` kit) |
| **M3 — Ch1–3 walkable (4–6 wks)** | Three biomes | Necropolis + Crypts zones; 1–2 more towns; world-map connectors; recruit Arcaveli (Ch3), George (Ch4), Kaius (Ch5); chapter bosses as boss-aura enemies | Interactive | Wave 2 (§9) |
| **M4 — Painted-boss set pieces (2–3 wks)** | Spectacle + Cure stages I–II | Wire painted bosses (`bonewake_dragon`, `plague_hydra`, later `lich_king`, `plague_doctor`, `worm_god`) at **story-scaled HP** via `PAINTED_BOSS_IDS`; Cure Research bench + stages I–II | Interactive | none (painted bosses exist) |
| **M5 — Full Ch1–9 story (8–12 wks)** | Complete first arc | All 9 chapters walkable; all named bosses; full recruit roster (Korvan villain→ally, Twins, Manny solo-companion set-piece); cure-fragment metaplot → Worm of Names; the anti-cure choice | Interactive | Wave 3 (§9) |
| **M6 — Endgame + polish (ongoing)** | Ch10–29 + systems | Procedural post-Necromancer arc; cosmic biome (`cosmic_fire`/`sky_*`); SFX pass; consumables/shops/inns matured | Interactive | cosmic tilesets, SFX |

**Critical-path ordering:** M0 retires the one unproven assumption (canvas-in-React) before M1. **M1 ships on the auto-battler precisely so the overworld and the combat-loop rewrite are never in flight simultaneously.** M2 swaps the battle loop only after the overworld is stable.

### 8.3 QA / acceptance gates (M1)

Pass on a fresh profile AND after a hard reload, in both `npm run dev` and the deployed build:
- **Build/deploy:** `npm run build` (`tsc -b && vite build`) clean (or Pages deploy fails); `dist/404.html` deep-link `/bonewake/adventure` loads; `/adventure` renders outside Shell full-screen; all art via `asset()` (no hardcoded `/bonewake/`).
- **Movement:** arrow keys move 4-dir; collision blocks walls/props/NPCs; camera clamps; zone transitions both ways spawn at linked tiles; **music: `menu` (walk/town/dungeon) → `battle` (encounters) → `boss` (boss) → `menu`** (Canon).
- **Interaction/story:** face-NPC + action opens dialogue; Mara's quest flips flag to `active` and opens the gate; Luna recruits in town, Elara at the dungeon mouth (both in `bonewake_squad`); The Tender full-heals; Cure Fragment pickup flips quest to `done` + Cure Stage 0; Mara's closing line.
- **Combat handoff:** each encounter launches `/battle/play/adv` with correct enemy ids + backdrop; step-accumulator fires at a tuned non-annoying rate; visible enemies trigger on contact and don't respawn; `resolveBattle` deterministic; `distributeSquadExp` levels the shared `OwnedHero`; United Front active; on win, return to the pre-fight tile, facing preserved; on loss, respawn at shrine/Tender, HP+MP restored (Canon); boss uses `graveyardlich` + aura + `boss_theme` + banter.
- **Persistence:** flags, recruits, hero levels, clears survive reload (`adventure` table); no regression to `/battle`/gacha/tower; `exportSave`/`importSave` round-trips the new table.
- **A11y/mobile:** `MotionConfig` reduce-motion honored; works at 420px; touch d-pad plan noted even if M1 is keyboard-first.

---

## 9. Consolidated Asset-Gap List (PixelLab, kidbot V1 style)

Every item is net-new art not in the inventory. Generate via **PixelLab**, anchored to the **kidbot V1** pro style (same lineage as the 105 hero pro-sprites), carrying the mandatory house suffix from `docs/basic_attack_prompts.md`: *"pixel art, gritty mature dark fantasy gory survival horror, physical decay (exposed bone, peeling flesh, sunken eye sockets), active dripping blood, weathered tattered gear, dark muted palette with deep crimson accents."* Tiles at a fixed **32×32** pitch, pixel-snapped (PIXEL_SNAP.md / pixel-snapper) to tile seamlessly with the directional sprites. **Battle art (heroes, enemies, bosses, backgrounds, music, banter) is all REAL and needs nothing new** — gaps are the overworld layer + M2 UI.

### Wave 1 — required for the M1 slice (the only blocking art)

| Gap | What | PixelLab approach | Qty |
|---|---|---|---|
| **AG-1** Forsaken Fields ground tileset | dead grass/dirt/mud/dead-crop + edges/transitions | `create_topdown_tileset`, 32px, palette from `ch1_forsaken_fields.jpg` | 1 set |
| **AG-2** Crypt interior tileset | stone floor/wall, cracked slabs, bone piles, gates, stairs | `create_topdown_tileset`, palette from `ch4_crypts.jpg` | 1 set |
| **AG-3** Lastlight town tiles + props | bone/scrap palisade, gate, huts, well, signs, refugee tents, breakable fence, chest (closed/open) | `create_topdown_tileset` + `create_map_object` | 1 set + ~10 props |
| **AG-4** Town NPC overworld sprites | Mara, Joss, The Tender — south/east/west idle | `create_character` + `create_character_state` | 3 NPCs |
| **AG-5** Bone Shrine save prop | idle + subtle active-glow frame | `create_map_object` | 1 |
| **AG-6** Interactables/decor | Cure Fragment pickup, dungeon door/portal, corpse-note | `create_map_object` | ~3 |
| **AG-7** North walk frames (slice heroes) | `kengo_north`, `luna_north`, `elara_north` | `create_character_state`, existing pro sprites as style ref | 3 |

> **Slice fallback to de-risk art:** if Wave-1 slips, M1 can ship with placeholder flat-color tiles (AG-1/2/3), reuse `_south.png` for NPC markers (AG-4) and the Bone Shrine (AG-5), and use the Canon north stopgap (draw `_south.png` when walking up) so AG-7 is non-blocking. The slice's *systems* are the gate, not the art.

### Wave 2 — M3 (Ch1–3 + world map)
- **AG-8** Scorched Wastes (ash) tileset (palette: `ch2_scorched_wastes.jpg`).
- **AG-9** Necropolis (urban-ruin) tileset (palette: `ch3_necropolis.jpg`).
- **AG-10** Overworld/world-map tiles — paths, cliffs, dead trees, rivers, bridges, region-transition gates.
- **AG-11** 1–2 additional towns' tiles/props + more NPCs (shopkeeper/blacksmith/quest-giver/villager).
- **AG-12** North walk frames for Arcaveli, George, Kaius.
- **AG-13** M2 battle UI: command-menu cursor + Item/Magic icons (MP crystal, potion, ether, antidote, revive, repel) — the `ui/` kit lacks these.

### Wave 3 — M5 (full Ch1–9)
- **AG-14** Tilesets + town/interior sets for Crypts, Cathedral, World's Edge, Vanguard Camp, Zombie Battlefield, Necromancer's Court (palettes: `ch4`–`ch9`).
- **AG-15** Interior tiles (inn/shop/tavern/throne-room floors, walls, furniture).
- **AG-16** North walk frames for the **entire recruitable roster** (the largest art debt — no hero has a north frame today).
- **AG-17** Cure Research Bench UI panel + reagent icons (Cure Sample, Dragon's Ichor, Hydra Bile) in the `ui/` material-icon style.

### Ongoing
- **AG-18** Cosmic/endgame tileset (Ch20–24) — lean on unused `cosmic_fire.jpg`/`sky_cliffs.jpg`/`sky_clouds.jpg` for palette/parallax.
- **AG-19** **SFX** — footsteps, menu blips, hit/heal/encounter stingers. **No SFX exist in `public/audio/` today** (only the 3 music tracks). Not blocking for M1.
- **AG-20** (Optional) Mobile on-screen D-pad + A/B button art for the PWA touch path (`Dpad.tsx`) — can ship with CSS/`ui/` shapes as a stopgap.

> Known sprite caveats for later reuse (not slice blockers): **`ash_empress`** lacks a directional idle/attack strip (only e/s/w) — avoid as a Story boss until generated; **`obsidian_knight`** has directional frames only (no idle/attack/hit) — keep out of formations until completed; **`plague_doctor`**'s directional source is named `plague_doctor_undead_*`.

---

## 10. Open Questions / Risks

1. **Canvas-in-React performance & lifecycle (HIGH).** Bonewake has never rendered an interactive canvas tilemap. *Mitigation:* M0 spike retires this before M1; single `<canvas>` + rAF loop decoupled from React state; cull off-screen tiles; cap simultaneous wander NPCs (~8); reuse one offscreen tileset image per map; integer-snap blits; test on the real PWA on-device.
2. **Combat-loop fork pressure (HIGH).** Temptation to build the FF command menu *during* the slice. *Mitigation:* hard Canon rule — M1 ships on `resolveBattle`; the interactive loop is M2, isolated behind the extracted kernel.
3. **Art volume, esp. north frames (HIGH/slow-burn).** No hero/enemy has a north frame; 9 biomes of tilesets/towns/interiors is a large PixelLab queue. *Mitigation:* wave-based gaps; slice ships placeholder tiles + the `_south.png`-north stopgap; batch-generate north frames per-arc, always passing existing pro sprites as style reference.
4. **`BattlePlayPage` is ~1457 lines and central to the live game.** Even a one-`if` branch risks regressing gacha battles. *Mitigation:* gate strictly on `stageId === 'adv'`; add a `combat.test.ts`-style test asserting normal stage ids are untouched; never modify `resolveBattle`.
5. **Dexie migration discipline.** Appending `version(6)` is safe; editing any existing version corrupts live saves. *Mitigation:* strictly append; verify `exportSave`/`importSave` include `adventure`; test upgrade from a real existing save before shipping.
6. **Shared-roster side effects.** Because Adventure shares `OwnedHero`/gear/levels (Canon), Adventure XP/gear changes are visible in the gacha modes and vice versa. *Mitigation:* this is the intended minimal-build model; surface clear in-mode copy that Adventure and the gacha share the *same* heroes; ensure encounter XP scaling doesn't trivialize gacha content (tune `xpReward` against `distributeSquadExp`).
7. **Style drift across PixelLab batches (MEDIUM).** *Mitigation:* lock one palette/prompt template per biome (anchored to that chapter's JPG), always pass pro sprites as style reference, run everything through pixel-snapper to the 32px pitch.
8. **Encounter pacing / return-to-tile state (MEDIUM).** Handoff to a separate full-screen route and returning to the exact tile/facing with non-respawning `oneShot` markers is fiddly. *Mitigation:* dedicated QA cases (§8.3); persist pre-fight position in the `adventure` row before navigating.
9. **Typecheck-gated deploy (MEDIUM).** `npm run build` runs `tsc -b`; any type error in new data files hard-fails the Pages deploy. *Mitigation:* typecheck locally before every push.
10. **Mobile input (MEDIUM).** Real form factor is a 420px PWA; the overworld is keyboard-first for M1. *Mitigation:* add an on-screen d-pad (AG-20) before M3; input buffering + forgiving interaction hit-test; on-device testing.
11. **Base-path violations break Pages silently (MEDIUM).** Any hardcoded `/bonewake/` or leading-slash path 404s only in production. *Mitigation:* lint/grep for raw `/sprites/` strings; route 100% of Adventure art through `asset()`.
12. **Open design question — Manny in the walkable party.** §4.5 allows fielding Manny via his auto-fill summons. Confirm in playtest whether a summon-only "party" reads well on the overworld (only Manny has a walk avatar; his summons appear only in battle) or whether Manny should be restricted to set-piece encounters. *Default:* allow in battle, represent only Manny on the overworld.
13. **Open design question — the anti-cure finale's UX.** The Cure %/anti-cure choice is the emotional climax (§2.2/§6.8). The branching consequence (mercy-kill the dead vs hold out) needs a dedicated finale flow spec (single ending vs New Game+ fork) in M5 — flagged, not yet specified.
