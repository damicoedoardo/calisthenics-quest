export type PathId = 'push' | 'pull' | 'core';

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
}

export interface SkillPath {
  id: PathId;
  name: string;
  tagline: string;
  color: string;
  nodes: SkillNode[];
}

export const PATHS: SkillPath[] = [
  {
    id: 'push',
    name: 'Push',
    tagline: 'Strike harder',
    color: '#fb923c',
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
      },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    tagline: 'Draw the bow',
    color: '#60a5fa',
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
      },
    ],
  },
  {
    id: 'core',
    name: 'Core',
    tagline: 'Find your stillness',
    color: '#4ade80',
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
      },
    ],
  },
];

export function getPath(id: PathId): SkillPath {
  const path = PATHS.find((p) => p.id === id);
  if (!path) throw new Error(`Unknown path ${id}`);
  return path;
}
