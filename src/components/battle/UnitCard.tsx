// Battle unit card — sprite, floating HP/energy bars, status-effect icons,
// element badge, lunge/attack animation, and floating damage numbers. Extracted
// from BattlePlayPage (which was ~1500 lines) so the battle screen's render is
// composed of focused pieces rather than one monolith.
import { motion, AnimatePresence } from 'framer-motion';
import type { CombatUnit } from '../../types';
import { HERO_SPRITES, ENEMY_SPRITES, PAINTED_BOSS_IDS, BOSS_AURA_IDS } from '../../data/heroes';
import SpriteAnimator from '../SpriteAnimator';
import { ArchetypeBadge } from '../ui/HeroBadges';
import { heroGlowTier, glowFilter, glowClass, glowOrbColor, getWeaponAnchor, type GlowTier } from '../../lib/glow';
import { useHeroes } from '../../store/heroes';

const ELEMENT_ICON: Record<string, { glyph: string; color: string }> = {
  fire:  { glyph: '🔥', color: '#fb923c' },
  water: { glyph: '💧', color: '#38bdf8' },
  earth: { glyph: '🌿', color: '#84cc16' },
  light: { glyph: '✨', color: '#fde047' },
  dark:  { glyph: '🌙', color: '#a78bfa' },
};

export interface FloatingNumber {
  id: number; x: number; y: number; value: string; color: string;
  dstId: string;
  // Element-matchup badge — 'strong' = ×1.5 super-effective, 'weak' = 0.75×
  // resisted, undefined = neutral (no badge shown).
  ele?: 'strong' | 'weak';
}

export function UnitCard({ unit, attacker, hit, side, floats, isUlt, isSkill, isHealing, lungeTo, setRef, unleashReady, onUnleash }: {
  unit: CombatUnit; attacker: boolean; hit: boolean; side: 'player' | 'enemy'; floats: FloatingNumber[]; isUlt: boolean; isSkill: boolean;
  isHealing: boolean;
  lungeTo: { dx: number; dy: number } | null;
  setRef: (el: HTMLDivElement | null) => void;
  // Manual-ult (low-speed) only: when true this hero's ult is charged and the
  // player can tap the hero to fire it now.
  unleashReady?: boolean;
  onUnleash?: () => void;
}) {
  // Resolve sprite set
  const heroSprites = HERO_SPRITES[unit.templateId];
  const enemySprites = ENEMY_SPRITES[unit.templateId as keyof typeof ENEMY_SPRITES];
  const sprites = heroSprites ?? enemySprites;
  // Lineage 2-style weapon-upgrade aura — hero tier derived from highest
  // equipped upgradeLevel; painted bosses get a fixed tier 2 (orange pulse);
  // regular enemies stay clean. NOTE: unit.id is a synthetic instance id
  // ('p0'/'p1'/'p2'), NOT the owned-hero db id — look up the owned hero by
  // templateId so we can match against equipment.equippedTo.
  const equipment = useHeroes(s => s.equipment);
  const heroes = useHeroes(s => s.heroes);
  // No enemies glow — auras are a hero-only signal for weapon upgrade tier.
  const _isPaintedBossForGlow = false;
  void BOSS_AURA_IDS; void PAINTED_BOSS_IDS;
  // Manny's summons (Bone King, Lich Sovereign) inherit Manny's
  // weapon-upgrade aura — they're his minions, so they share his glow tier.
  const SUMMON_TEMPLATE_IDS = new Set(['bone_king', 'lich_sovereign']);
  const _glowSourceTemplate = SUMMON_TEMPLATE_IDS.has(unit.templateId) ? 'manny' : unit.templateId;
  const _ownedHero = side === 'player'
    ? heroes.find(h => h.templateId === _glowSourceTemplate)
    : undefined;
  // Dev override: ?glow=1|2|3|4 forces every player hero to a glow tier so
  // we can preview without rolling high-upgrade gear. Gated to dev builds.
  const _glowOverride = (() => {
    if (!import.meta.env.DEV) return null;
    if (typeof window === 'undefined') return null;
    const v = new URLSearchParams(window.location.search).get('glow');
    if (v === '1' || v === '2' || v === '3' || v === '4') return Number(v) as GlowTier;
    return null;
  })();
  const glow: GlowTier = _glowOverride !== null && side === 'player'
    ? _glowOverride
    : side === 'player'
      ? heroGlowTier(_ownedHero?.id ?? '', equipment)
      : (_isPaintedBossForGlow ? 2 : 0);

  // Pick the right animation for current state — falls through to idle so
  // SpriteAnimator handles multi-frame strips correctly even when the unit is
  // just standing around.
  let animSrc: string | null = sprites?.idle ?? null;
  if (sprites) {
    if (!unit.alive) animSrc = (heroSprites?.death ?? enemySprites?.death) ?? animSrc;
    else if (hit && !attacker && (heroSprites?.hitCols || enemySprites?.hitCols)) animSrc = (heroSprites?.hit ?? enemySprites?.hit) ?? animSrc;
    else if (attacker && isHealing && heroSprites?.heal) animSrc = heroSprites.heal;
    else if (attacker && isUlt && (heroSprites?.ult || enemySprites?.skill)) animSrc = heroSprites?.ult ?? heroSprites?.skill ?? enemySprites?.skill ?? animSrc;
    else if (attacker && isSkill && (heroSprites?.skill || enemySprites?.skill)) animSrc = heroSprites?.skill ?? enemySprites?.skill ?? animSrc;
    else if (attacker) animSrc = (heroSprites?.attack ?? enemySprites?.attack) ?? animSrc;
  }

  // Per-state column override — painted bosses have 9-frame attack atlases
  // (attackCols=9) over a single painted idle, and pro heroes are gaining
  // per-pose strips (idleCols / attackCols / deathCols) as the PixelLab
  // template-animation pipeline produces them. Pick the cols matching the
  // pose that animSrc resolved to above.
  const isAttackState = !!(attacker && !isHealing);
  let effectiveCols = sprites?.cols ?? 1;
  if (!unit.alive) {
    // Dead units gray out on the single-frame base — no death strip.
  } else if (hit && !attacker && (heroSprites?.hitCols ?? enemySprites?.hitCols)) {
    // Flinch strip — plays once at high fps while the hit shake runs.
    effectiveCols = (heroSprites?.hitCols ?? enemySprites?.hitCols)!;
  } else if (attacker && isHealing) {
    // Heal actions fall back to the attack sprite when no dedicated heal
    // pose exists (see animSrc above) — match that strip's cols too.
    if (!heroSprites?.heal && heroSprites?.attackCols) effectiveCols = heroSprites.attackCols;
  } else if (attacker && (isUlt || isSkill) && heroSprites) {
    // Hero ults have their own strips; skill stays on the single-frame base.
    // (Enemies fall through: painted-boss skill/ult reuse the attack atlas.)
    if (isUlt && heroSprites.ultCols) effectiveCols = heroSprites.ultCols;
  } else if (isAttackState && (heroSprites?.attackCols ?? enemySprites?.attackCols)) {
    effectiveCols = (heroSprites?.attackCols ?? enemySprites?.attackCols)!;
  } else if (unit.alive && !attacker && (heroSprites?.idleCols ?? enemySprites?.idleCols)) {
    effectiveCols = (heroSprites?.idleCols ?? enemySprites?.idleCols)!;
  }
  // Multi-frame idle = breathing loop, rendered at a slow 5fps below.
  // Single-frame sprites skip the animation interval inside SpriteAnimator.

  const hpPct = (unit.hp / unit.maxHp) * 100;
  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444';

  // Lunge: on a basic attack the attacker pulls back slightly, dashes to the
  // target's actual on-screen position to make contact, holds the strike,
  // then snaps back. Stops at 88% so sprites overlap on contact rather than
  // the attacker fully covering the target. Skills/ults stay rooted.
  const isLunge = !!(attacker && !isUlt && !isSkill && !isHealing && lungeTo);
  const dashX = isLunge && lungeTo ? lungeTo.dx * 0.88 : 0;
  const dashY = isLunge && lungeTo ? lungeTo.dy * 0.88 : 0;
  const windUpX = isLunge && lungeTo ? -lungeTo.dx * 0.06 : 0;
  return (
    <motion.div
      ref={setRef}
      animate={{
        x: isLunge
          ? [0, windUpX, dashX, dashX, 0]
          : (attacker ? (side === 'player' ? 24 : -24) : 0),
        y: isLunge ? [0, 0, dashY, dashY, 0] : 0,
        scale: attacker ? 1.12 : 1,
      }}
      transition={
        isLunge
          // 1.0s total: wind-up → dash → hold-at-target while impact lands → retreat
          // Impact fires at 600ms (60%), retreat finishes by 1000ms.
          ? { duration: 1.0, times: [0, 0.10, 0.35, 0.65, 1] }
          : { duration: 0.18 }
      }
      style={{ zIndex: unleashReady ? 25 : attacker ? 15 : 5, cursor: unleashReady ? 'pointer' : undefined }}
      className={`relative ${hit && unit.alive ? 'animate-shake' : ''} ${unit.alive ? '' : 'grayscale opacity-60'} ${unleashReady ? 'ult-ready-ring' : ''}`}
      onClick={unleashReady ? onUnleash : undefined}
      role={unleashReady ? 'button' : undefined}
      title={unleashReady ? `Tap to fire ${unit.name}'s ultimate` : undefined}
    >
      {/* Tap-to-fire badge — shown on the hero when their ult is charged and
          manual control is active. Tapping anywhere on the hero fires it. */}
      {unleashReady && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="font-pixel text-[8px] px-1.5 py-0.5 rounded-full animate-pulse whitespace-nowrap"
               style={{ background: '#dc2626', color: '#fff', border: '1px solid #fecaca', boxShadow: '0 0 8px #ef4444' }}>
            ⚡ FIRE
          </div>
        </div>
      )}

      {/* Floating HP bar + name above the unit */}
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 w-24 z-10 pointer-events-none">
        {/* Archetype seal tucked at the HP bar. Anchored to the side facing the
            battlefield center (right edge of the bar for left-column heroes,
            left edge for right-column enemies) so both teams read the same. */}
        {/* Element icon tucked at the HP bar, on the OUTER side (opposite the
            archetype seal) so it reads the same for heroes and enemies. */}
        {ELEMENT_ICON[unit.element] && (
          <div
            className={`absolute -top-0.5 z-10 w-4 h-4 rounded-full flex items-center justify-center text-[9px] leading-none pointer-events-none ${side === 'player' ? '-left-5' : '-right-5'}`}
            style={{
              background: '#0a0a0aee',
              border: `1px solid ${ELEMENT_ICON[unit.element].color}`,
              boxShadow: `0 0 4px ${ELEMENT_ICON[unit.element].color}88`,
            }}
            title={unit.element}
          >
            {ELEMENT_ICON[unit.element].glyph}
          </div>
        )}
        {unit.archetype && (
          <div
            className={`absolute top-0 opacity-90 ${side === 'player' ? '-right-5' : '-left-5'}`}
            style={{ filter: 'drop-shadow(0 1px 0 #000)' }}
          >
            <ArchetypeBadge archetype={unit.archetype} size={16} />
          </div>
        )}
        <div className="text-[9px] font-pixel truncate text-center" style={{ color: unit.color, textShadow: '0 1px 0 #000' }}>{unit.name}</div>
        <div className="h-1.5 bg-zinc-900/80 rounded border border-zinc-700 overflow-hidden mt-0.5">
          <motion.div
            initial={false}
            animate={{ width: `${hpPct}%` }}
            transition={{ duration: 0.25 }}
            style={{ background: hpColor, height: '100%' }}
          />
        </div>
        {/* Energy bar: cyan ramp → yellow at 50 (skill ready) → orange glow at 100 (ult ready) */}
        <div
          className={`relative h-1 bg-zinc-900/80 rounded border border-zinc-700/70 overflow-hidden mt-0.5 ${unit.energy >= 100 ? 'animate-pulse' : ''}`}
          style={unit.energy >= 100 ? { boxShadow: '0 0 6px 1px #fb923c, 0 0 2px #fff inset' } : undefined}
        >
          <motion.div
            initial={false}
            animate={{ width: `${unit.energy}%` }}
            transition={{ duration: 0.25 }}
            style={{
              background: unit.energy >= 100 ? '#fb923c' : unit.energy >= 50 ? '#facc15' : '#22d3ee',
              height: '100%',
            }}
          />
          {/* 50% tick mark — the skill-ready threshold */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-700/80" />
        </div>
      </div>

      {/* Status effect icons floating above HP */}
      {unit.effects && unit.effects.length > 0 && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-0.5 z-20 justify-center">
          {unit.effects.map((ef, i) => (
            <span key={i} className="text-[10px] leading-none" title={`${ef.kind} ${ef.value} (${ef.remaining})`}>
              {ef.kind === 'burn' ? '🔥' : ef.kind === 'shield' ? '🛡' : ef.kind === 'buff_atk' ? '⚡' : '⏱'}
            </span>
          ))}
        </div>
      )}


      {/* Character sprite — heroes face right naturally, enemies mirrored.
          Hero sprite atlases are PixelLab 124×124 frames with significant
          padding for walk/attack motion; enemy portraits are tightly cropped
          1024×1024. Painted boss-tier sprites (Bonewake Dragon, Lich King,
          etc.) render almost 2× the size to telegraph "this is a BOSS,
          not a regular enemy". */}
      {(() => {
        const isPaintedBoss = PAINTED_BOSS_IDS.has(unit.templateId);
        // Boss container = w-48 (192px) — fits cleanly inside the 196px
        // enemy column without bleeding left into the hero column (which
        // caused the boss to visually overlap with the middle hero).
        // Bumped HEIGHT to h-56 (224px) so the boss still reads taller
        // than heroes — the sprite renders at 192px square and is bottom-
        // anchored, so the extra 32px of column height becomes "looming"
        // headroom above the silhouette.
        const containerSize = isPaintedBoss ? 'w-52 h-96' : 'w-44 h-44';
        // A few enemy sprites were exported with the figure filling 100% of a
        // tiny canvas (no padding), so at the standard render size they appear
        // ~2x too large next to normally-framed enemies (whose subject is ~47%
        // of the canvas). Scale just those down to match. Measured from the
        // opaque-pixel bbox of each sprite vs the 0.47 reference fraction.
        const OVERSIZED_ENEMY_SCALE: Record<string, number> = {
          gilded_revenant: 0.47,
          crypt_wyvern: 0.47,
          obsidian_knight: 0.47,
        };
        const enemySizeScale = isPaintedBoss ? 1 : (OVERSIZED_ENEMY_SCALE[unit.templateId] ?? 1);
        const renderSize = Math.round((isPaintedBoss ? 440 : (heroSprites ? 234 : 220)) * enemySizeScale);
        // Per-sprite orientation (verified empirically in-game):
        //   - Heroes face EAST natively → correct on player side, no flip.
        //   - Regular enemies face WEST natively → correct on enemy side,
        //     no flip.
        //   - Most painted bosses face WEST or FORWARD (symmetric) → no
        //     flip on enemy side.
        //   - Specific painted bosses were generated facing EAST (their
        //     directional poses — like plague_doctor's scythe-arm and
        //     soul_reaper's scythe-arm — clearly point right). Those
        //     need a flip on the enemy side so they face the heroes.
        //   - chino's hero sprite shipped reversed (faces west) — one-off
        //     flip override on the player side.
        const REVERSED_HEROES = new Set<string>(['chino']);
        const flipHero = REVERSED_HEROES.has(unit.templateId);
        const EAST_FACING_BOSSES = new Set<string>();
        const EAST_FACING_ENEMIES = new Set<string>(['corpse_hound']);
        const flipPaintedBoss = isPaintedBoss && side === 'enemy' && EAST_FACING_BOSSES.has(unit.templateId);
        const flipEnemy = !isPaintedBoss && side === 'enemy' && EAST_FACING_ENEMIES.has(unit.templateId);
        const baseFilter = 'brightness(0.85) contrast(1.05) saturate(1.05) drop-shadow(0 6px 8px rgba(0,0,0,0.85))';
        const wrapStyle: React.CSSProperties | undefined = isPaintedBoss
          ? { filter: baseFilter, transform: flipPaintedBoss ? 'scaleX(-1)' : undefined }
          : flipHero || flipEnemy
            ? { transform: 'scaleX(-1)' }
            : undefined;
        // TODO(weapon-glow): we previously experimented with a localized
        // orb at each hero's weapon anchor (see HERO_WEAPON_ANCHORS in
        // src/lib/glow.ts). Parked until the weapon-overlay system is built
        // — at that point the glow filter will go on the weapon overlay
        // sprite directly, no coordinate math needed. For now: full-body
        // glow on both heroes and painted bosses.
        const wantsOuterGlow = glow > 0;
        const glowStyle: React.CSSProperties | undefined = wantsOuterGlow && glow === 1
          ? { filter: glowFilter(1) }
          : undefined;
        const outerGlowClass = wantsOuterGlow ? glowClass(glow) : '';
        const weaponAnchor: { cx: number; cy: number; size: number } | null = null;
        const showWeaponGlow = false;
        void getWeaponAnchor; // referenced for future use, suppress unused warning
        // Idle breathing bob — staggered per slot so the field doesn't pulse in
        // sync. Paused (no class) while dead; keeps running during attacks since
        // the lunge transform lives on the outer motion.div.
        const bobDelay = `${(((unit.id.charCodeAt(0) * 7) + (parseInt(unit.id.slice(1), 10) || 0) * 5) % 8) * 0.2}s`;
        return (
          <div
            className={`${outerGlowClass} ${unit.alive ? 'animate-bob' : ''}`}
            style={{ ...glowStyle, animationDelay: bobDelay }}
          >
          <div
            className={`relative ${containerSize} flex items-end justify-center ${isPaintedBoss ? '' : 'overflow-hidden'} ${hit && unit.alive ? 'animate-hit-flash' : ''}`}
            style={wrapStyle}
          >
            {animSrc ? (
              isPaintedBoss && effectiveCols === 1 && sprites!.rows === 1 ? (
                // Static painted-boss sprite — use <img object-fit:contain> so the
                // figure scales up to fill the container while preserving aspect
                // ratio (SpriteAnimator's backgroundSize stretches and distorts).
                <img
                  src={animSrc}
                  alt={unit.name}
                  style={{
                    width: renderSize,
                    height: renderSize,
                    minWidth: renderSize,
                    minHeight: renderSize,
                    flexShrink: 0,
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                  }}
                />
              ) : (
                <SpriteAnimator
                  src={animSrc}
                  cols={effectiveCols}
                  rows={sprites!.rows}
                  fps={hit ? 18 : (attacker && isUlt ? 7 : (attacker && isSkill ? 10 : (attacker ? 14 : 5)))}
                  loop={unit.alive && !hit}
                  paused={false}
                  size={renderSize}
                />
              )
            ) : (
              <div className="text-5xl">{unit.emoji}</div>
            )}
            {/* Weapon-localized orb is parked until the weapon-overlay
                system lands — see TODO(weapon-glow) above. */}
            {void showWeaponGlow}
            {void weaponAnchor}
            {void glowOrbColor}
          </div>
          </div>
        );
      })()}

      {/* Floating damage numbers + element-matchup badge */}
      <AnimatePresence>
        {floats.map(f => (
          <motion.div
            key={f.id}
            initial={{ y: 0, opacity: 1, scale: 0.6 }}
            animate={{ y: -40, opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 font-pixel text-base pointer-events-none z-20 flex items-center gap-1"
            style={{ color: f.color, textShadow: '0 1px 0 #000, 0 0 6px rgba(0,0,0,0.8)' }}
          >
            {f.value}
            {f.ele === 'strong' && (
              <span className="text-[8px] px-1 rounded font-pixel"
                    style={{ background: '#dc2626', color: '#fff', textShadow: 'none' }}>
                ×1.5
              </span>
            )}
            {f.ele === 'weak' && (
              <span className="text-[8px] px-1 rounded font-pixel"
                    style={{ background: '#3b82f6', color: '#fff', textShadow: 'none' }}>
                RESIST
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
