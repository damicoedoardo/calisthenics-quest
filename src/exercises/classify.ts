import { defaultKit, type Kit, type MoveId } from '@/sprites/characters/moves';
import type { ExerciseId } from '@/sprites/characters/exercise';

/* Sorting the catalog: each exercise gets the movement its pixel demo shows and the kit it's done
   with, from its name, equipment and category. Rules are tried in order, first match wins, so the
   specific ones (a "front squat") come before the general ones (a "squat"). To fix one exercise,
   add it to OVERRIDES by id. */

interface Rule {
  re: RegExp;
  move: MoveId;
  /** Only for these catalog categories. */
  only?: string[];
}

const STRETCH = ['stretching'];

const RULES: Rule[] = [
  // mobility and stretching first: their names reuse the strength words ("Split Squats" is a stretch)
  { re: /-smr|foam/, move: 'foam-roll' },
  { re: /circles|rotations? with|wrist rotations|round the world|arm drill/, move: 'circles' },
  { re: /neck (exercise|stretch|resistance)|plate neck|chin to chest|looking at ceiling|side neck|head harness/, move: 'neck' },
  { re: /child'?s pose/, move: 'child-pose' },
  { re: /cat stretch|pelvic tilt|hip circles \(prone\)|stomach vacuum/, move: 'cat-cow' },
  { re: /quad|dancer'?s|leg grab/, move: 'quad-stretch', only: STRETCH },
  { re: /calf|soleus|achilles|gastrocnemius|peroneals|tibialis/, move: 'calf-stretch', only: STRETCH },
  { re: /hip flexor|runner'?s|world'?s greatest|split squat|crossover reverse lunge|kneeling hip/, move: 'lunge-stretch', only: STRETCH },
  { re: /toe touch|standing hamstring|inchworm|upper back-leg|spinal stretch/, move: 'toe-touch', only: STRETCH },
  { re: /seated|straddle|90\/90|floor hamstring|groin|adductor|butterfly|sit squats/, move: 'seated-stretch', only: STRETCH },
  { re: /lying|knee to chest|knees to chest|on your back|lower back curl|one knee/, move: 'knee-hug', only: STRETCH },
  { re: /tricep|bicep|chest|shoulder|deltoid|elbows back|lat|wrist|forearm|upper back|iron cross|middle back|behind head/, move: 'arm-stretch', only: STRETCH },
  { re: /overhead|upward|lateral stretch|side stretch|windmills|torso rotation|pyramid|hug a ball/, move: 'reach-stretch', only: STRETCH },
  { re: /leg raises|scissor|front leg|rear leg|side leg|leg-up|frog/, move: 'balance', only: STRETCH },
  { re: /superman|locust/, move: 'back-extension', only: STRETCH },
  { re: /hang/, move: 'reach-stretch', only: STRETCH },
  { re: /groiners|dynamic/, move: 'lunge-stretch', only: STRETCH },
  { re: /.*/, move: 'reach-stretch', only: STRETCH },

  // cardio machines and conditioning
  { re: /bicycling|recumbent|bike(?! crunch)|air bike/, move: 'bike', only: ['cardio'] },
  { re: /rowing/, move: 'rower' },
  { re: /rope jumping|jump rope/, move: 'jump-rope' },
  { re: /running|jogging|walking, treadmill|trail|sprint|skating|elliptical|stairmaster|step mill|skipping|butt kick|carioca|claw|wall drill|start technique|quick step/, move: 'run' },
  { re: /battling ropes/, move: 'battle-ropes' },
  { re: /drag curl/, move: 'curl' },
  { re: /sled|prowler|drag|rickshaw carry|power stairs/, move: 'sled-push' },
  { re: /farmer|yoke|carry|conan|walk(?!ing lunge)/, move: 'carry' },
  { re: /slam|overhead throw|scoop throw|backward medicine/, move: 'slam' },
  { re: /chest push|chest pass|return push|chest throw|heavy bag/, move: 'press-out' },
  { re: /star jump|jumping jack/, move: 'star-jump' },
  { re: /jump|\bhops?\b|bound|leap|box skip|box shuffle|push-off|rocket|depth/, move: 'jump' },

  // olympic lifts and strongman
  { re: /snatch pull|snatch deadlift|clean pull|clean deadlift/, move: 'deadlift' },
  { re: /clean shrug|snatch shrug/, move: 'shrug' },
  { re: /front squat \(clean grip\)/, move: 'front-squat' },
  { re: /snatch/, move: 'snatch' },
  { re: /clean|atlas|keg|sandbag|tire flip|rack delivery|log lift|circus/, move: 'clean' },
  { re: /jerk|push press|thruster|bradford|anti-gravity|jammer|circus/, move: 'push-press' },

  // core
  { re: /side bridge|side jackknife|side plank/, move: 'side-plank' },
  { re: /glute bridge|butt lift/, move: 'bridge' },
  { re: /plank/, move: 'plank' },
  { re: /rollout|ab roller|fallout|wheel/, move: 'ab-rollout' },
  { re: /cable crunch|rope crunch|kneeling cable|cable seated crunch|cable reverse crunch/, move: 'cable-crunch' },
  { re: /mountain climber|spider crawl|bear crawl/, move: 'mountain-climber' },
  { re: /russian twist|plate twist|barbell twist|full twist|wipers|figure 8|pirate|halo|around the world|judo|landmine 180|car drivers/, move: 'russian-twist' },
  { re: /side bend/, move: 'side-bend' },
  { re: /wood ?chop|cable lift|sledgehammer swing/, move: 'woodchop' },
  { re: /windmill|turkish/, move: 'windmill' },
  { re: /pallof/, move: 'press-out' },
  { re: /dead bug|air bike|cocoons|heel touch|flutter|elbow to knee/, move: 'dead-bug' },
  { re: /hanging leg raise|hanging pike|knee\/hip raise|knee raise/, move: 'leg-raise' },
  { re: /leg raise|leg lift|leg pull-in|reverse crunch|scissor|leg tucks|bottoms up|butt-ups|hip raise(?! with)/, move: 'leg-raise' },
  { re: /sit-up|situp|jackknife|v-up|otis|gorilla/, move: 'sit-up' },
  { re: /crunch/, move: 'crunch' },

  // legs
  { re: /barbell hack squat/, move: 'deadlift' },
  { re: /leg press|calf press|hack squat|lying machine squat/, move: 'leg-press' },
  { re: /leg extension/, move: 'leg-extension' },
  { re: /leg curl|hamstring curl|glute-ham|glute ham|hamstring slides|manual hamstring/, move: 'leg-curl' },
  { re: /calf-machine shoulder shrug/, move: 'shrug' },
  { re: /calf raise|calf raises|donkey calf/, move: 'calf-raise' },
  { re: /hip thrust|glute bridge|butt lift|hip lift|bridge|pelvic|hip raise/, move: 'bridge' },
  { re: /good morning|hyperextension|back extension|pull through|reverse hyper|superman/, move: 'good-morning' },
  { re: /romanian|stiff[- ]leg|one-legged deadlift|single-leg deadlift|wide stance stiff/, move: 'rdl' },
  { re: /deadlift|rack pull|clean pull|snatch pull|shrug.*(clean|snatch)/, move: 'deadlift' },
  { re: /swing|pass between/, move: 'kettlebell-swing' },
  { re: /kickback.*(glute|leg)|glute kickback|cable kickback|one-legged cable kickback|hip extension|donkey/, move: 'kickback-glute' },
  { re: /abduct|adduct|monster walk|side leg|hip flexion|lateral leg/, move: 'side-leg-raise' },
  { re: /overhead squat|overhead kettlebell squat|snatch balance/, move: 'overhead-squat' },
  { re: /front squat|front barbell squat|zercher|goblet|front squats|frankenstein/, move: 'front-squat' },
  { re: /step[- ]?up|box squat high/, move: 'step-up' },
  { re: /lunge|split squat|split jump|scissors jump/, move: 'lunge' },
  { re: /squat|sit squats|chair squat/, move: 'squat' },

  // push
  { re: /handstand/, move: 'handstand-pushup' },
  { re: /bench dip|dips? - triceps|body-up|body tricep/, move: 'bench-dip' },
  { re: /bent-over .*triceps extension/, move: 'triceps-kickback' },
  { re: /(lying|decline|incline).*triceps? (extension|press)/, move: 'skull-crusher' },
  { re: /triceps? (overhead )?extension|triceps press|overhead triceps/, move: 'triceps-overhead' },
  { re: /rear delt|reverse fly|reverse flyes|back flyes|pull apart|face pull|reverse machine|rear lateral|side lateral$|low-pulley side lateral/, move: 'rear-delt-fly' },
  { re: /upright row|upright cable row|row to neck/, move: 'upright-row' },
  { re: /high pulley row/, move: 'lat-pulldown' },
  { re: /bar curl on high pulley/, move: 'curl' },
  { re: /cross over - with bands/, move: 'chest-fly' },
  { re: /flye?s?\b|fly\b|crossover|butterfly|pec deck|iron cross|svend|chest squeeze|bodyweight flyes/, move: 'chest-fly' },
  { re: /skull ?crusher|lying.*triceps|triceps? press to chin|jm press|tate press|lying triceps press/, move: 'skull-crusher' },
  { re: /pushdown|push-down|push down/, move: 'triceps-pushdown' },
  { re: /kickback/, move: 'triceps-kickback' },
  { re: /triceps? extension|tricep extension|overhead triceps|french press|towel triceps/, move: 'triceps-overhead' },
  { re: /lateral raise|side lateral|deltoid raise|laterals|lateral$|scaption|incline shoulder raise|side laterals/, move: 'lateral-raise' },
  { re: /rear delt|reverse fly|reverse flyes|back flyes|pull apart|face pull|reverse machine/, move: 'rear-delt-fly' },
  { re: /front.*raise|raise.*front|plate raise|front cable raise|front two-dumbbell|dumbbell raise|straight raises|single dumbbell raise|spell caster/, move: 'front-raise' },
  { re: /upright row|high pull/, move: 'upright-row' },
  { re: /shrug/, move: 'shrug' },
  { re: /shoulder press|military press|overhead press|arnold|seesaw press|see-saw|cuban press|press behind|para press|bent press|kettlebell press|seated press|shoulder \(military\)|standing.*dumbbell press|seated dumbbell press|palms-in dumbbell press|palm-in one-arm/, move: 'shoulder-press' },
  { re: /incline shoulder raise|neck press|smith press|palms facing in|wipers/, move: 'bench-press' },
  { re: /incline bench pull/, move: 'barbell-row' },
  { re: /chest press|standing cable chest/, move: 'press-out' },
  { re: /bench press|floor press|board press|pin press|chain press|smith machine .*press|decline press|incline.*press|dumbbell press|guillotine|close-grip.*press|hammer grip incline|leverage .*press|machine bench/, move: 'bench-press' },

  // pull
  { re: /pullover/, move: 'pullover' },
  { re: /straight-arm pulldown|straight arm pulldown|rope straight/, move: 'straight-arm-pulldown' },
  { re: /pulldown|pull-down/, move: 'lat-pulldown' },
  { re: /inverted row|suspended row|mid row|bodyweight mid/, move: 'inverted-row' },
  { re: /seated cable row|cable rows?|seated one-arm cable|low pulley row|shotgun row|elevated cable|pulley row/, move: 'seated-row' },
  { re: /row/, move: 'barbell-row' },
  { re: /wrist curl|finger curl|wrist roller|plate pinch|hand squeeze|pronation|supination|reverse plate curl/, move: 'wrist-curl' },
  { re: /curl/, move: 'curl' },
  { re: /internal rotation|external rotation/, move: 'curl' },
  { re: /chain handle extension/, move: 'triceps-pushdown' },
  { re: /crucifix/, move: 'lateral-raise' },
];

/** Exercises the rules get wrong, by catalog id. */
const OVERRIDES: Record<string, { move?: MoveId; kit?: Kit }> = {
  Bodyweight_Squat: { move: 'squat', kit: 'none' },
  Barbell_Squat: { move: 'barbell-squat' },
  Barbell_Full_Squat: { move: 'barbell-squat' },
  Plank: { move: 'plank' },
  Balance_Board: { move: 'balance' },
  Hug_A_Ball: { move: 'reach-stretch', kit: 'none' },
  Torso_Rotation: { move: 'russian-twist', kit: 'none' },
  Pyramid: { move: 'child-pose', kit: 'none' },
  Chest_Stretch_on_Stability_Ball: { move: 'arm-stretch', kit: 'none' },
  Downward_Facing_Balance: { move: 'plank', kit: 'none' },
  'One_Handed_Hang': { move: 'reach-stretch', kit: 'none' },
  Stomach_Vacuum: { move: 'cat-cow', kit: 'none' },
  Superman: { move: 'back-extension', kit: 'none' },
  'Hyperextensions_Back_Extensions': { move: 'back-extension', kit: 'machine' },
  'Hyperextensions_With_No_Hyperextension_Bench': { move: 'back-extension', kit: 'none' },
  Weighted_Ball_Hyperextension: { move: 'back-extension', kit: 'ball' },
  Reverse_Hyperextension: { move: 'kickback-glute', kit: 'machine' },
  Glute_Ham_Raise: { move: 'leg-curl', kit: 'machine' },
  Natural_Glute_Ham_Raise: { move: 'leg-curl', kit: 'none' },
  Floor_Glute_Ham_Raise: { move: 'leg-curl', kit: 'none' },
  Rope_Climb: { move: 'lat-pulldown', kit: 'none' },
  Ab_Roller: { move: 'ab-rollout', kit: 'none' },
  Wrist_Roller: { move: 'wrist-curl', kit: 'none' },
  Bodyweight_Flyes: { move: 'chest-fly', kit: 'none' },
  Standing_Lateral_Stretch: { move: 'reach-stretch', kit: 'none' },
  Knee_Across_The_Body: { move: 'knee-hug', kit: 'none' },
  'Oblique_Crunches_-_On_The_Floor': { move: 'crunch', kit: 'none' },
  'Supine_Chest_Throw': { move: 'bench-press', kit: 'medball' },
  'Rickshaw_Deadlift': { move: 'deadlift', kit: 'barbell' },
  'Monster_Walk': { move: 'side-leg-raise', kit: 'band' },
  'Clean_and_Press': { move: 'clean', kit: 'barbell' },
  'Battling_Ropes': { move: 'battle-ropes', kit: 'none' },
  'Isometric_Chest_Squeezes': { move: 'chest-fly', kit: 'none' },
  'Kneeling_Arm_Drill': { move: 'run', kit: 'none' },
  'Medicine_Ball_Full_Twist': { move: 'russian-twist', kit: 'medball' },
  'Catch_and_Overhead_Throw': { move: 'slam', kit: 'medball' },
  'Front_Plate_Raise': { move: 'front-raise', kit: 'plate' },
  'Smith_Machine_Hip_Raise': { move: 'bridge', kit: 'barbell' },
  'Physioball_Hip_Bridge': { move: 'bridge', kit: 'ball' },
  'Ball_Leg_Curl': { move: 'leg-curl', kit: 'ball' },
  'Exercise_Ball_Pull-In': { move: 'mountain-climber', kit: 'ball' },
  'Exercise_Ball_Crunch': { move: 'crunch', kit: 'ball' },
  'Crunch_-_Legs_On_Exercise_Ball': { move: 'crunch', kit: 'none' },
  'Weighted_Ball_Side_Bend': { move: 'side-bend', kit: 'ball' },
  'Bosu_Ball_Cable_Crunch_With_Side_Bends': { move: 'cable-crunch', kit: 'cable' },
  'Bench_Sprint': { move: 'step-up', kit: 'none' },
  'Step-up_with_Knee_Raise': { move: 'step-up', kit: 'none' },
  'Lunge_Sprint': { move: 'lunge', kit: 'none' },
  'Lunge_Pass_Through': { move: 'lunge', kit: 'kettlebell' },
  'Wind_Sprints': { move: 'leg-raise', kit: 'none' },
  'Prone_Manual_Hamstring': { move: 'leg-curl', kit: 'none' },
  'Platform_Hamstring_Slides': { move: 'bridge', kit: 'none' },
  'Single_Leg_Glute_Bridge': { move: 'bridge', kit: 'none' },
  'Leg_Lift': { move: 'kickback-glute', kit: 'none' },
  'Glute_Kickback': { move: 'kickback-glute', kit: 'none' },
  'Scapular_Pull-Up': { move: 'shrug', kit: 'none' },
  'Gironda_Sternum_Chins': { move: 'lat-pulldown', kit: 'none' },
  'Cable_Iron_Cross': { move: 'chest-fly', kit: 'cable' },
  'Iron_Cross': { move: 'lateral-raise', kit: 'dumbbell' },
  'Standing_Olympic_Plate_Hand_Squeeze': { move: 'wrist-curl', kit: 'plate' },
  'Dumbbell_Lying_Pronation': { move: 'wrist-curl', kit: 'dumbbell' },
  'Dumbbell_Lying_Supination': { move: 'wrist-curl', kit: 'dumbbell' },
  'Power_Partials': { move: 'lateral-raise', kit: 'dumbbell' },
  'Front_Raise_And_Pullover': { move: 'pullover', kit: 'barbell' },
  'Kettlebell_Sumo_High_Pull': { move: 'upright-row', kit: 'kettlebell' },
  'Heavy_Bag_Thrust': { move: 'press-out', kit: 'none' },
  'Moving_Claw_Series': { move: 'run', kit: 'none' },
  'Sled_Overhead_Backward_Walk': { move: 'carry', kit: 'none' },
  'Sled_Overhead_Triceps_Extension': { move: 'triceps-overhead', kit: 'none' },
  'Sled_Reverse_Flye': { move: 'rear-delt-fly', kit: 'none' },
  'Sled_Row': { move: 'seated-row', kit: 'none' },
  'Bear_Crawl_Sled_Drags': { move: 'mountain-climber', kit: 'none' },
  'Forward_Drag_with_Press': { move: 'sled-push', kit: 'none' },
  'Atlas_Stone_Trainer': { move: 'clean', kit: 'stone' },
};

/** The program's moves that keep their hand-drawn demos when the catalog has them. */
const PROGRAM: Record<string, ExerciseId> = {
  'Incline_Push-Up': 'incline-pushup',
  'Incline_Push-Up_Close-Grip': 'incline-pushup',
  'Incline_Push-Up_Medium': 'incline-pushup',
  'Incline_Push-Up_Reverse_Grip': 'incline-pushup',
  'Incline_Push-Up_Wide': 'incline-pushup',
  Pushups: 'pushup',
  'Push-Up_Wide': 'pushup',
  'Pushups_Close_and_Wide_Hand_Positions': 'pushup',
  'Clock_Push-Up': 'pushup',
  'Plyo_Push-up': 'pushup',
  'Push-Ups_With_Feet_Elevated': 'pushup',
  'Decline_Push-Up': 'pushup',
  'Push-Ups_With_Feet_On_An_Exercise_Ball': 'pushup',
  'Suspended_Push-Up': 'pushup',
  'Single-Arm_Push-Up': 'archer-pushup',
  'Plyo_Kettlebell_Pushups': 'pushup',
  'Close-Grip_Push-Up_off_of_a_Dumbbell': 'diamond-pushup',
  'Push-Ups_-_Close_Triceps_Position': 'diamond-pushup',
  'Incline_Push-Up_Depth_Jump': 'incline-pushup',
  Parallel_Bar_Dip: 'dips',
  'Dips_-_Triceps_Version': 'dips',
  'Dips_-_Chest_Version': 'dips',
  Ring_Dips: 'dips',
  Weighted_Bench_Dip: 'dips',
  Dip_Machine: 'dips',
  'Band_Assisted_Pull-Up': 'assisted-pullup',
  Pullups: 'pullup',
  'Chin-Up': 'pullup',
  'V-Bar_Pullup': 'pullup',
  'Wide-Grip_Rear_Pull-Up': 'pullup',
  Weighted_Pull_Ups: 'pullup',
  Mixed_Grip_Chin: 'pullup',
  'One_Arm_Chin-Up': 'pullup',
  Side_To_Side_Chins: 'pullup',
  'Rocky_Pull-Ups_Pulldowns': 'pullup',
  Muscle_Up: 'pullup',
  Kipping_Muscle_Up: 'pullup',
  Hanging_Pike: 'toes-to-bar',
  Hanging_Leg_Raise: 'toes-to-bar',
  'Knee_Hip_Raise_On_Parallel_Bars': 'knee-raise',
  'Gorilla_Chin_Crunch': 'knee-raise',
};

const PROGRAM_EXTRA: Record<string, ExerciseId> = {
  Isometric_Wipers: 'pushup',
  Drop_Push: 'pushup',
};

export interface Sorted {
  /** The demo: a library move, or one of the program's hand-drawn ones. */
  demo: ExerciseId;
  kit: Kit;
}

interface Input {
  id: string;
  name: string;
  category: string;
  equipment: string;
}

export function kitFor(x: Input): Kit {
  const n = x.name.toLowerCase();
  // stretches are named after body parts ("IT Band"), so only their listed equipment counts
  if (x.category === 'stretching') return x.equipment === 'foam roll' ? 'roller' : x.equipment === 'exercise ball' ? 'ball' : 'none';
  if (/smith/.test(n)) return 'barbell';
  if (/cable|pulley|rope attachment|pulldown/.test(n) && x.equipment !== 'bands') return 'cable';
  if (/band/.test(n) || x.equipment === 'bands') return 'band';
  if (/kettlebell/.test(n) || x.equipment === 'kettlebells') return 'kettlebell';
  if (/dumbbell|\bdb\b/.test(n) || x.equipment === 'dumbbell') return 'dumbbell';
  if (/barbell|ez[- ]bar|e-z|bar curl|landmine|t-bar|axle|car deadlift|trap bar|log lift|chains/.test(n) || x.equipment === 'barbell' || x.equipment === 'e-z curl bar') return 'barbell';
  if (/medicine ball|med ball|weighted crunches/.test(n) || x.equipment === 'medicine ball') return 'medball';
  if (x.equipment === 'exercise ball' || /exercise ball|stability ball|physioball|bosu/.test(n)) return 'ball';
  if (x.equipment === 'foam roll') return 'roller';
  if (/stone|keg|sandbag|tire/.test(n)) return 'stone';
  if (/plate/.test(n)) return 'plate';
  if (x.equipment === 'cable') return 'cable';
  if (x.equipment === 'machine') return 'machine';
  return 'none';
}

export function classify(x: Input): Sorted {
  const program = PROGRAM[x.id] ?? PROGRAM_EXTRA[x.id];
  if (program) return { demo: program, kit: 'none' };
  const o = OVERRIDES[x.id];
  const n = x.name.toLowerCase();
  let move = o?.move;
  if (!move) {
    for (const r of RULES) {
      if (r.only && !r.only.includes(x.category)) continue;
      if (r.re.test(n)) {
        move = r.move;
        break;
      }
    }
  }
  move ??= 'squat';
  let kit = o?.kit ?? kitFor(x);
  // "other" gear (a sled, chains, a log) is drawn as what the move is usually done with
  if (kit === 'none' && x.equipment === 'other' && !o?.kit) kit = defaultKit(move);
  if (move === 'foam-roll') kit = 'roller';
  return { demo: move, kit };
}
