export type PathId = 'push' | 'pull' | 'core';
export type GearSlot = 'weapon' | 'armor' | 'shield';

export interface Gear {
  slot: GearSlot;
  name: string;
  /** Main color used to paint the gear on the hero. */
  color: string;
  /** Optional glow for the legendary tiers. */
  glow?: string;
}

export interface SkillNode {
  id: string;
  name: string;
  /** One-line form cue shown while training. */
  cue: string;
  /** Unit of one "rep": reps or seconds held. */
  unit: 'reps' | 'sec';
  sets: number;
  /** Where a fresh node starts (per set). */
  startReps: number;
  /** Per-set target that unlocks the next node. */
  unlockSets: number;
  unlockReps: number;
  /** Gear earned when this node is unlocked (beaten). */
  reward: Gear;
}

export interface SkillPath {
  id: PathId;
  name: string;
  tagline: string;
  slot: GearSlot;
  nodes: SkillNode[];
}

export const PATHS: SkillPath[] = [
  {
    id: 'push',
    name: 'Push',
    tagline: 'Forge your blade',
    slot: 'weapon',
    nodes: [
      {
        id: 'incline-pushup',
        name: 'Incline push-up',
        cue: 'Hands on a bench, body in one straight line.',
        unit: 'reps',
        sets: 4,
        startReps: 10,
        unlockSets: 3,
        unlockReps: 15,
        reward: { slot: 'weapon', name: 'Wooden sword', color: '#a16207' },
      },
      {
        id: 'pushup',
        name: 'Push-up',
        cue: 'Chest to fist height, elbows at 45°, squeeze glutes.',
        unit: 'reps',
        sets: 5,
        startReps: 8,
        unlockSets: 3,
        unlockReps: 20,
        reward: { slot: 'weapon', name: 'Iron sword', color: '#9ca3af' },
      },
      {
        id: 'diamond-pushup',
        name: 'Diamond push-up',
        cue: 'Hands close under the chest, elbows brush the ribs.',
        unit: 'reps',
        sets: 4,
        startReps: 6,
        unlockSets: 3,
        unlockReps: 12,
        reward: { slot: 'weapon', name: 'Steel sword', color: '#cbd5e1' },
      },
      {
        id: 'dips',
        name: 'Dips',
        cue: 'Use the assisted machine first. Shoulders down, lean slightly forward.',
        unit: 'reps',
        sets: 4,
        startReps: 5,
        unlockSets: 3,
        unlockReps: 10,
        reward: { slot: 'weapon', name: "Knight's blade", color: '#fbbf24' },
      },
      {
        id: 'archer-pushup',
        name: 'Archer push-up',
        cue: 'Wide hands, shift onto one arm, the other stays straight. Reps per side.',
        unit: 'reps',
        sets: 3,
        startReps: 3,
        unlockSets: 3,
        unlockReps: 8,
        reward: { slot: 'weapon', name: 'Flame sword', color: '#f97316', glow: '#fb923c' },
      },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    tagline: 'Earn your armor',
    slot: 'armor',
    nodes: [
      {
        id: 'dead-hang',
        name: 'Dead hang',
        cue: 'Full grip on the bar, shoulders active, breathe.',
        unit: 'sec',
        sets: 3,
        startReps: 20,
        unlockSets: 3,
        unlockReps: 45,
        reward: { slot: 'armor', name: 'Leather tunic', color: '#92400e' },
      },
      {
        id: 'assisted-pullup',
        name: 'Assisted pull-up',
        cue: 'Assisted machine or band. Chin over the bar, full hang at the bottom.',
        unit: 'reps',
        sets: 4,
        startReps: 6,
        unlockSets: 3,
        unlockReps: 12,
        reward: { slot: 'armor', name: 'Leather armor', color: '#b45309' },
      },
      {
        id: 'negatives',
        name: 'Pull-up negatives',
        cue: 'Jump to the top, lower yourself over 5 slow seconds.',
        unit: 'reps',
        sets: 4,
        startReps: 3,
        unlockSets: 3,
        unlockReps: 5,
        reward: { slot: 'armor', name: 'Chainmail', color: '#6b7280' },
      },
      {
        id: 'strict-pullup',
        name: 'Strict pull-up',
        cue: 'Dead hang start, no kipping. Many small sets beat one big one.',
        unit: 'reps',
        sets: 5,
        startReps: 2,
        unlockSets: 3,
        unlockReps: 8,
        reward: { slot: 'armor', name: 'Iron armor', color: '#9ca3af' },
      },
      {
        id: 'pullup',
        name: 'Pull-up volume',
        cue: 'Smooth reps, chest toward the bar.',
        unit: 'reps',
        sets: 4,
        startReps: 8,
        unlockSets: 3,
        unlockReps: 12,
        reward: { slot: 'armor', name: 'Steel armor', color: '#cbd5e1' },
      },
      {
        id: 'lsit-pullup',
        name: 'L-sit pull-up',
        cue: 'Hold the legs at 90° for the whole rep.',
        unit: 'reps',
        sets: 3,
        startReps: 3,
        unlockSets: 3,
        unlockReps: 8,
        reward: { slot: 'armor', name: 'Dragon armor', color: '#7c3aed', glow: '#a78bfa' },
      },
    ],
  },
  {
    id: 'core',
    name: 'Core',
    tagline: 'Raise your shield',
    slot: 'shield',
    nodes: [
      {
        id: 'knee-raise',
        name: 'Hanging knee raise',
        cue: 'Knees to chest, no swinging. Control the way down.',
        unit: 'reps',
        sets: 3,
        startReps: 8,
        unlockSets: 3,
        unlockReps: 15,
        reward: { slot: 'shield', name: 'Wooden shield', color: '#a16207' },
      },
      {
        id: 'tuck-lsit',
        name: 'Tuck L-sit',
        cue: 'On dip bars or parallettes, push the floor away, knees tucked.',
        unit: 'sec',
        sets: 3,
        startReps: 8,
        unlockSets: 3,
        unlockReps: 15,
        reward: { slot: 'shield', name: 'Iron shield', color: '#9ca3af' },
      },
      {
        id: 'one-leg-lsit',
        name: 'One-leg L-sit',
        cue: 'One leg straight, one tucked. Switch each set.',
        unit: 'sec',
        sets: 4,
        startReps: 8,
        unlockSets: 3,
        unlockReps: 15,
        reward: { slot: 'shield', name: 'Steel shield', color: '#cbd5e1' },
      },
      {
        id: 'lsit',
        name: 'Full L-sit',
        cue: 'Both legs straight and locked, toes pointed.',
        unit: 'sec',
        sets: 3,
        startReps: 5,
        unlockSets: 3,
        unlockReps: 15,
        reward: { slot: 'shield', name: 'Tower shield', color: '#fbbf24' },
      },
      {
        id: 'toes-to-bar',
        name: 'Toes to bar',
        cue: 'Straight legs up to the bar, slow on the way down.',
        unit: 'reps',
        sets: 3,
        startReps: 5,
        unlockSets: 3,
        unlockReps: 10,
        reward: { slot: 'shield', name: 'Legendary shield', color: '#22d3ee', glow: '#67e8f9' },
      },
    ],
  },
];

/** Non-skill exercise that keeps the legs honest. */
export const BONUS = {
  id: 'goblet-squat',
  name: 'Goblet squat',
  cue: 'Dumbbell at the chest, sit between the heels.',
  sets: 3,
  reps: 10,
};

export function getPath(id: PathId): SkillPath {
  const path = PATHS.find((p) => p.id === id);
  if (!path) throw new Error(`Unknown path ${id}`);
  return path;
}

export const STARTER_GEAR: Record<GearSlot, Gear> = {
  weapon: { slot: 'weapon', name: 'Bare fists', color: '#e7c9a9' },
  armor: { slot: 'armor', name: 'Gym shirt', color: '#475569' },
  shield: { slot: 'shield', name: 'No shield', color: 'transparent' },
};
