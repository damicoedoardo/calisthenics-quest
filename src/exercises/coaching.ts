import type { ExerciseId } from '@/sprites/characters/exercise';

/* How to do each movement well, and what usually goes wrong: one entry per demo (the library's
   movements in src/sprites/characters/moves.ts and the program's hand-drawn moves), shared by every
   exercise that uses it. `family`, `region` and `kind` sort the movements for search and for
   building a session: a coach picks a squat, a hinge, a push and a pull, then stretches. */

export type Family =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push-horizontal'
  | 'push-vertical'
  | 'pull-horizontal'
  | 'pull-vertical'
  | 'arms'
  | 'shoulders'
  | 'legs-isolation'
  | 'core'
  | 'carry'
  | 'power'
  | 'plyometric'
  | 'cardio'
  | 'stretch'
  | 'mobility';

export type Region = 'upper' | 'lower' | 'core' | 'full';

/** What a movement is for in a session. */
export type Kind = 'strength' | 'power' | 'plyometric' | 'cardio' | 'stretch' | 'mobility';

export interface Coaching {
  family: Family;
  region: Region;
  kind: Kind;
  /** How to do it well, most important first. */
  tips: string[];
  /** What usually goes wrong. */
  mistakes: string[];
}

const c = (family: Family, region: Region, kind: Kind, tips: string[], mistakes: string[]): Coaching => ({ family, region, kind, tips, mistakes });

export const COACHING: Record<ExerciseId, Coaching> = {
  // ----- legs -----
  squat: c(
    'squat',
    'lower',
    'strength',
    ['Feet about shoulder width, toes turned out a little.', 'Sit the hips back and down, knees travel out over the toes.', 'Keep the chest up and the whole foot on the floor.', 'Go as deep as you can with a flat back, then drive up through the mid-foot.'],
    ['Knees caving in on the way up.', 'Heels lifting off the floor.', 'Rounding the lower back at the bottom.', 'Cutting the depth short when it gets hard.'],
  ),
  'barbell-squat': c(
    'squat',
    'lower',
    'strength',
    ['Bar on the upper back (not the neck), hands just outside the shoulders, elbows down.', 'Big breath and brace the belly before each rep.', 'Sit down between the heels, knees out over the toes.', 'Drive up with the chest and hips rising together.'],
    ['Hips shooting up first so it turns into a good morning.', 'Knees caving in.', 'Losing the brace and rounding at the bottom.', 'Bar rolling up onto the neck.'],
  ),
  'front-squat': c(
    'squat',
    'lower',
    'strength',
    ['Weight resting on the front of the shoulders, elbows high and pointing forward.', 'Torso stays tall: think of sitting straight down.', 'Knees go well forward and out.', 'Keep the elbows up as you stand, or the weight rolls forward.'],
    ['Elbows dropping, so the chest folds over.', 'Gripping the bar hard instead of letting it rest on the shoulders.', 'Heels coming up.', 'Rounding the upper back.'],
  ),
  'overhead-squat': c(
    'squat',
    'full',
    'strength',
    ['Wide grip, arms locked, the weight right over the mid-foot.', 'Push up into the bar and squeeze the shoulder blades.', 'Squat straight down with the torso tall.', 'Start light: mobility limits this before strength does.'],
    ['Bar drifting forward of the feet.', 'Elbows bending.', 'Leaning the chest forward to get deep.', 'Going too heavy too soon.'],
  ),
  lunge: c(
    'lunge',
    'lower',
    'strength',
    ['Long enough step that both knees bend to about 90°.', 'Torso upright, weight mostly on the front foot.', 'Lower straight down until the back knee is just off the floor.', 'Push through the front heel to come up.'],
    ['Front knee caving inward.', 'Steps so short the front heel lifts.', 'Leaning far forward over the front knee.', 'Slamming the back knee into the floor.'],
  ),
  'step-up': c(
    'lunge',
    'lower',
    'strength',
    ['Whole foot on the box, knee in line with the toes.', 'Lean a little forward and drive through the top leg.', 'Stand all the way up before stepping down.', 'Step down slowly, under control.'],
    ['Pushing off the bottom leg to do the work.', 'A box so high the hips drop below the knee and the back rounds.', 'Knee caving in as you rise.', 'Dropping down off the box.'],
  ),
  'leg-press': c(
    'squat',
    'lower',
    'strength',
    ['Feet flat on the plate, about hip width, mid-plate.', 'Lower until the knees reach about 90°, lower back stays on the pad.', 'Press through the whole foot.', 'Stop just short of locking the knees.'],
    ['Lowering so far the hips curl off the seat.', 'Locking the knees out hard at the top.', 'Knees caving in.', 'Pushing with the toes, heels lifting.'],
  ),
  'leg-extension': c(
    'legs-isolation',
    'lower',
    'strength',
    ['Knee lined up with the machine\'s pivot, pad on the front of the ankle.', 'Straighten the leg fully and squeeze the thigh for a beat.', 'Lower slowly.', 'Hold the handles so the hips stay down.'],
    ['Swinging the weight up with momentum.', 'Lifting the hips off the seat.', 'Dropping the weight back down.', 'Seat set so the knee is not at the pivot.'],
  ),
  'leg-curl': c(
    'legs-isolation',
    'lower',
    'strength',
    ['Hips pressed into the pad the whole time.', 'Curl the heels toward the glutes, squeeze, lower slowly.', 'Pad just above the heels.', 'Use a full range: straight legs to fully bent.'],
    ['Hips lifting to cheat the weight up.', 'Jerking the weight.', 'Half reps at the top.', 'Pointing the toes to cramp the calves.'],
  ),
  'calf-raise': c(
    'legs-isolation',
    'lower',
    'strength',
    ['Rise as high as you can onto the balls of the feet.', 'Pause at the top, then lower slowly.', 'Let the heels drop below the step for a full stretch if you\'re on one.', 'Knees straight but not locked.'],
    ['Bouncing quick tiny reps.', 'Rolling onto the outside of the foot.', 'Bending the knees to push.', 'Skipping the stretch at the bottom.'],
  ),
  bridge: c(
    'hinge',
    'lower',
    'strength',
    ['Feet flat, about hip width, heels under the knees at the top.', 'Drive through the heels and squeeze the glutes.', 'Finish with a straight line from shoulders to knees.', 'Ribs down: lift with the hips, not the lower back.'],
    ['Arching the lower back at the top.', 'Feet too far away, so the hamstrings cramp.', 'Pushing through the toes.', 'Rushing without a squeeze at the top.'],
  ),
  deadlift: c(
    'hinge',
    'full',
    'strength',
    ['Bar over the mid-foot, shins close to it.', 'Hinge down with a flat back, grip just outside the legs.', 'Brace, pull the slack out of the bar, then push the floor away.', 'Stand tall with glutes squeezed; lower the same way.'],
    ['Rounding the lower back.', 'Bar drifting away from the legs.', 'Jerking the bar off the floor.', 'Leaning back at the top.'],
  ),
  rdl: c(
    'hinge',
    'lower',
    'strength',
    ['Soft knees that stay put; the hips push back.', 'Weight slides down the front of the thighs.', 'Lower until you feel a strong hamstring stretch, back flat.', 'Drive the hips forward to stand.'],
    ['Bending the knees so it turns into a squat.', 'Rounding the back to reach lower.', 'Letting the weight drift forward.', 'Hyperextending at the top.'],
  ),
  'good-morning': c(
    'hinge',
    'lower',
    'strength',
    ['Bar on the upper back, knees soft.', 'Push the hips back and tip the chest forward with a flat back.', 'Go only as low as the back stays flat.', 'Squeeze the glutes to stand.'],
    ['Rounding the spine.', 'Going too heavy: this one is for control.', 'Squatting down instead of hinging.', 'Looking up and cranking the neck.'],
  ),
  'kettlebell-swing': c(
    'hinge',
    'full',
    'power',
    ['It\'s a hip hinge, not a squat: hips back, shins nearly vertical.', 'Hike the bell back between the legs, then snap the hips forward.', 'The arms only guide; the bell floats to chest height.', 'Stand tall at the top: glutes tight, ribs down.'],
    ['Lifting the bell with the arms.', 'Squatting the swing.', 'Rounding the back at the bottom.', 'Leaning back at the top.'],
  ),
  'kickback-glute': c(
    'hinge',
    'lower',
    'strength',
    ['Hands under shoulders, knees under hips, back flat.', 'Push the heel back and up toward the ceiling.', 'Squeeze the glute at the top for a beat.', 'Keep the hips square to the floor.'],
    ['Arching the lower back to lift higher.', 'Twisting the hips open.', 'Swinging the leg fast.', 'Letting the belly sag.'],
  ),
  'side-leg-raise': c(
    'legs-isolation',
    'lower',
    'strength',
    ['Stand tall, hold something for balance if needed.', 'Lift the leg out to the side with the toes pointing forward.', 'Move from the hip; the body stays upright.', 'Lower slowly.'],
    ['Leaning the torso the other way.', 'Turning the toes up to the ceiling.', 'Swinging the leg.', 'Lifting too high and hitching the hip.'],
  ),
  'back-extension': c(
    'hinge',
    'lower',
    'strength',
    ['Pad just below the hip bones, heels locked in.', 'Lower with a flat back, then lift with the glutes and hamstrings.', 'Stop when the body is in one straight line.', 'Arms crossed on the chest; add weight only when it\'s easy.'],
    ['Over-arching past straight at the top.', 'Rounding the back to go lower.', 'Bouncing out of the bottom.', 'Pad so high it blocks the hinge.'],
  ),
  jump: c(
    'plyometric',
    'lower',
    'plyometric',
    ['Quick dip, swing the arms, explode up.', 'Land softly on the balls of the feet, knees bending to absorb.', 'Knees track over the toes on landing.', 'Reset between reps: quality beats speed.'],
    ['Landing stiff-legged.', 'Knees caving on the landing.', 'Doing them tired, when the form falls apart.', 'Jumping down off high boxes instead of stepping down.'],
  ),
  // ----- push -----
  'bench-press': c(
    'push-horizontal',
    'upper',
    'strength',
    ['Shoulder blades squeezed together and down, feet planted.', 'Lower the weight to the middle of the chest, elbows about 45° from the body.', 'Touch, then press up and slightly back over the shoulders.', 'Keep the wrists straight, stacked over the elbows.'],
    ['Flaring the elbows straight out to the sides.', 'Bouncing the bar off the chest.', 'Lifting the hips off the bench.', 'Shoulders rolling forward at the top.'],
  ),
  'chest-fly': c(
    'push-horizontal',
    'upper',
    'strength',
    ['A slight, fixed bend in the elbows the whole time.', 'Open the arms wide in an arc until you feel a chest stretch.', 'Bring the hands back together as if hugging a tree.', 'Go light: it\'s a stretch and squeeze, not a press.'],
    ['Bending the elbows so it turns into a press.', 'Lowering too far and straining the shoulders.', 'Going heavy.', 'Clanking the weights at the top.'],
  ),
  'shoulder-press': c(
    'push-vertical',
    'upper',
    'strength',
    ['Start at shoulder height, forearms vertical.', 'Brace the belly and squeeze the glutes so the back doesn\'t arch.', 'Press straight up until the arms lock, head through at the top.', 'Lower under control back to the shoulders.'],
    ['Leaning back and arching the lower back.', 'Pressing forward instead of straight up.', 'Stopping halfway down.', 'Shrugging the shoulders to the ears.'],
  ),
  'push-press': c(
    'power',
    'full',
    'power',
    ['Weight on the front of the shoulders, elbows slightly forward.', 'Short, straight dip at the knees, torso upright.', 'Drive hard with the legs and press through to locked arms.', 'Finish with the weight over the mid-foot.'],
    ['Dipping too deep or leaning forward in the dip.', 'Pressing before the legs finish.', 'Weight ending in front of the head.', 'Arching the back to finish the lockout.'],
  ),
  'lateral-raise': c(
    'shoulders',
    'upper',
    'strength',
    ['Slight bend in the elbows, lead with the elbows.', 'Raise out to the sides until the arms are level with the shoulders.', 'Thumbs neutral or slightly down, shoulders stay down.', 'Lower slowly; light weights are fine.'],
    ['Swinging the weights up with the body.', 'Shrugging the shoulders up.', 'Lifting above shoulder height.', 'Going too heavy and cutting the range.'],
  ),
  'front-raise': c(
    'shoulders',
    'upper',
    'strength',
    ['Stand tall, arms almost straight.', 'Lift in front to shoulder height.', 'Pause, then lower slowly.', 'Keep the core tight so the body doesn\'t sway.'],
    ['Leaning back to swing the weight up.', 'Lifting far above the shoulders.', 'Shrugging.', 'Dropping the weight on the way down.'],
  ),
  'rear-delt-fly': c(
    'shoulders',
    'upper',
    'strength',
    ['Hinge forward with a flat back (or lie chest-down).', 'Soft elbows; open the arms out wide.', 'Squeeze between the shoulder blades at the top.', 'Light weight, slow and controlled.'],
    ['Rowing with bent arms instead of flying.', 'Swinging the torso up.', 'Shrugging into the neck.', 'Too heavy to reach shoulder height.'],
  ),
  'upright-row': c(
    'shoulders',
    'upper',
    'strength',
    ['Grip about shoulder width.', 'Lead with the elbows, weight close to the body.', 'Stop at about lower-chest height, elbows level with the shoulders.', 'Lower under control.'],
    ['A very narrow grip that pinches the shoulders.', 'Pulling up to the chin.', 'Leaning back and swinging.', 'Wrists higher than the elbows.'],
  ),
  shrug: c(
    'shoulders',
    'upper',
    'strength',
    ['Arms straight, shoulders lift straight up toward the ears.', 'Hold the top for a second.', 'Lower all the way for a full stretch.', 'Keep the head neutral.'],
    ['Rolling the shoulders in circles.', 'Bending the elbows to help.', 'Tiny bouncing reps.', 'Pushing the head forward.'],
  ),
  'triceps-pushdown': c(
    'arms',
    'upper',
    'strength',
    ['Elbows pinned to your sides the whole time.', 'Push down until the arms are straight, squeeze.', 'Let the forearms come back up to about level, slowly.', 'Lean very slightly forward, chest up.'],
    ['Elbows drifting forward and back.', 'Leaning over the weight to push with the body.', 'Letting the stack slam.', 'Short reps.'],
  ),
  'triceps-overhead': c(
    'arms',
    'upper',
    'strength',
    ['Upper arms by the ears, pointing up.', 'Lower the weight behind the head by bending only the elbows.', 'Extend fully overhead.', 'Brace the belly so the back doesn\'t arch.'],
    ['Elbows flaring wide.', 'Upper arms moving forward and back.', 'Arching the lower back.', 'Lowering too fast near the neck.'],
  ),
  'skull-crusher': c(
    'arms',
    'upper',
    'strength',
    ['Upper arms tilted slightly back toward the head and kept still.', 'Bend only at the elbows, lowering toward the forehead or just behind.', 'Extend back up, squeezing the triceps.', 'Control every rep.'],
    ['Elbows flaring out.', 'Turning it into a press with moving shoulders.', 'Dropping the weight fast toward the face.', 'Going too heavy.'],
  ),
  'triceps-kickback': c(
    'arms',
    'upper',
    'strength',
    ['Hinge forward, flat back, upper arm along your side.', 'Only the forearm moves: straighten it back fully.', 'Squeeze at the top, lower slowly.', 'Light weight works.'],
    ['Upper arm dropping down.', 'Swinging the weight.', 'Not reaching full extension.', 'Rounding the back.'],
  ),
  'bench-dip': c(
    'push-vertical',
    'upper',
    'strength',
    ['Hands on the bench edge behind you, fingers forward.', 'Keep the back close to the bench.', 'Lower until the elbows reach about 90°.', 'Press back up to straight arms.'],
    ['Going so deep the shoulders roll forward and hurt.', 'Elbows flaring out.', 'Drifting away from the bench.', 'Pushing with the legs.'],
  ),
  'handstand-pushup': c(
    'push-vertical',
    'upper',
    'strength',
    ['Hands about shoulder width, a hand-length from the wall.', 'Body tight and straight, glutes squeezed.', 'Lower the head to make a triangle with the hands.', 'Press back up to locked arms.'],
    ['Banana back arching off the wall.', 'Elbows flaring straight out.', 'Crashing the head into the floor.', 'Trying them before pike push-ups are solid.'],
  ),
  'press-out': c(
    'push-horizontal',
    'upper',
    'strength',
    ['Stand tall, feet planted, core braced.', 'Press the hands straight out from the chest.', 'Hold a beat with locked arms, then return slowly.', 'With a side cable, don\'t let it twist you.'],
    ['Leaning or twisting toward the cable.', 'Arching the back.', 'Pushing from the shoulders with the chest caved.', 'Rushing the return.'],
  ),
  // ----- pull -----
  'barbell-row': c(
    'pull-horizontal',
    'upper',
    'strength',
    ['Hinge to about 45° or lower with a flat back, knees soft.', 'Pull the weight to the lower ribs, elbows back.', 'Squeeze the shoulder blades together at the top.', 'Lower with control to straight arms.'],
    ['Standing up taller with every rep.', 'Jerking the weight with the hips.', 'Rounding the back.', 'Pulling to the chest with flared elbows.'],
  ),
  'inverted-row': c(
    'pull-horizontal',
    'upper',
    'strength',
    ['Body in one straight line, heels on the floor.', 'Pull the chest to the bar, elbows back.', 'Squeeze the shoulder blades at the top.', 'Bend the knees to make it easier, raise the feet to make it harder.'],
    ['Hips sagging.', 'Reaching with the chin instead of the chest.', 'Half reps without full arm extension.', 'Shrugging the shoulders.'],
  ),
  'lat-pulldown': c(
    'pull-vertical',
    'upper',
    'strength',
    ['Thighs locked under the pad, slight lean back.', 'Start each rep by pulling the shoulders down.', 'Pull the bar to the top of the chest, elbows down and back.', 'Let it rise all the way up with control.'],
    ['Leaning way back and rowing it.', 'Pulling behind the neck.', 'Using momentum from the body.', 'Not letting the arms straighten.'],
  ),
  'seated-row': c(
    'pull-horizontal',
    'upper',
    'strength',
    ['Sit tall, knees soft, chest up.', 'Pull the handle to the belly, elbows close to the body.', 'Squeeze the shoulder blades together.', 'Reach forward with straight arms, letting the shoulders stretch, back still straight.'],
    ['Rocking the torso back and forth.', 'Rounding the back on the return.', 'Shrugging up.', 'Pulling with the arms only.'],
  ),
  'straight-arm-pulldown': c(
    'pull-vertical',
    'upper',
    'strength',
    ['Arms nearly straight, slight hinge at the hips.', 'Sweep the bar down to the thighs in an arc.', 'Feel the lats, squeeze at the bottom.', 'Return slowly to shoulder height.'],
    ['Bending the elbows into a pushdown.', 'Swinging the body.', 'Shoulders rolling forward.', 'Going too heavy to keep the arms straight.'],
  ),
  curl: c(
    'arms',
    'upper',
    'strength',
    ['Elbows stay at your sides.', 'Curl up until the forearms are vertical, squeeze.', 'Lower slowly to straight arms.', 'Stand tall, no swing.'],
    ['Swinging the body to lift.', 'Elbows drifting forward.', 'Half reps without straightening the arm.', 'Bending the wrists back.'],
  ),
  pullover: c(
    'pull-vertical',
    'upper',
    'strength',
    ['Lying on a bench, weight above the chest, slight elbow bend.', 'Lower it back over the head in an arc until the lats stretch.', 'Pull it back over the chest.', 'Ribs down, keep the hips steady.'],
    ['Bending the elbows more and more.', 'Arching the back to go lower.', 'Lowering too far for your shoulders.', 'Going heavy.'],
  ),
  'wrist-curl': c(
    'arms',
    'upper',
    'strength',
    ['Forearms resting on the thighs or a bench, wrists past the edge.', 'Only the wrists move: curl up, then lower fully.', 'Slow reps, light weight.', 'Do both palms-up and palms-down.'],
    ['Lifting the forearms off the support.', 'Jerky, fast reps.', 'Too heavy for the full range.', 'Gripping only with the fingertips.'],
  ),
  carry: c(
    'carry',
    'full',
    'strength',
    ['Stand tall, shoulders back and down.', 'Short, quick steps, look ahead.', 'Grip hard, keep the weights still at your sides.', 'Brace the core so you don\'t lean.'],
    ['Leaning to one side.', 'Shrugging the shoulders up.', 'Long sloppy strides.', 'Letting the weights swing.'],
  ),
  // ----- core -----
  plank: c(
    'core',
    'core',
    'strength',
    ['Elbows under the shoulders, body one straight line.', 'Squeeze the glutes and pull the belly button in.', 'Push the floor away so the upper back doesn\'t sag.', 'Breathe; stop when the form breaks.'],
    ['Hips sagging.', 'Hips piked up high.', 'Holding the breath.', 'Looking up and straining the neck.'],
  ),
  'side-plank': c(
    'core',
    'core',
    'strength',
    ['Elbow under the shoulder, feet stacked or staggered.', 'Lift the hips so the body is one straight line.', 'Don\'t let the top hip roll forward.', 'Bend the knees to make it easier.'],
    ['Hips dropping.', 'Shoulder creeping up to the ear.', 'Rolling forward.', 'Holding the breath.'],
  ),
  crunch: c(
    'core',
    'core',
    'strength',
    ['Knees bent, lower back gently pressed down.', 'Curl the shoulders off the floor, ribs toward the hips.', 'Hands lightly by the head, no pulling.', 'Pause, lower slowly.'],
    ['Yanking on the neck.', 'Coming up too high and using the hips.', 'Bouncing fast reps.', 'Holding the breath.'],
  ),
  'sit-up': c(
    'core',
    'core',
    'strength',
    ['Feet anchored, knees bent.', 'Curl up one vertebra at a time.', 'Sit all the way up, then lower slowly.', 'Arms crossed on the chest makes it harder.'],
    ['Throwing the arms to swing up.', 'Pulling on the neck.', 'Flopping back down.', 'Arching off the floor.'],
  ),
  'leg-raise': c(
    'core',
    'core',
    'strength',
    ['Lower back pressed to the floor the whole time.', 'Lift straight legs up to vertical.', 'Lower slowly, only as far as the back stays down.', 'Bend the knees to make it easier.'],
    ['Lower back arching off the floor.', 'Swinging the legs with momentum.', 'Dropping the legs fast.', 'Pushing hard with the hands.'],
  ),
  'dead-bug': c(
    'core',
    'core',
    'strength',
    ['On your back, arms up, knees over hips at 90°.', 'Reach one arm back and the opposite leg long.', 'Lower back stays glued to the floor.', 'Move slowly and breathe out as you reach.'],
    ['Lower back lifting off the floor.', 'Rushing the reps.', 'Moving the same-side arm and leg.', 'Holding the breath.'],
  ),
  'russian-twist': c(
    'core',
    'core',
    'strength',
    ['Sit back to about 45°, chest up, spine long.', 'Rotate the shoulders, not just the arms.', 'Touch beside each hip with control.', 'Feet down to make it easier.'],
    ['Rounding the back.', 'Only swinging the arms.', 'Going fast and sloppy.', 'Twisting so far the back strains.'],
  ),
  'mountain-climber': c(
    'core',
    'core',
    'cardio',
    ['Start in a strong push-up position, hands under shoulders.', 'Drive one knee toward the chest, then switch.', 'Keep the hips level.', 'Speed only as fast as the form holds.'],
    ['Hips piking up.', 'Shoulders drifting behind the hands.', 'Bouncing the hips.', 'Tiny steps that don\'t reach.'],
  ),
  'ab-rollout': c(
    'core',
    'core',
    'strength',
    ['Start kneeling, hands on the roller under the shoulders.', 'Roll out slowly with a tight core and squeezed glutes.', 'Go only as far as the back stays flat.', 'Pull back with the belly, not the hips.'],
    ['Lower back sagging.', 'Going too far too soon.', 'Pushing the hips back first on the return.', 'Holding the breath.'],
  ),
  'cable-crunch': c(
    'core',
    'core',
    'strength',
    ['Kneel, rope by the head, hips stay still.', 'Curl the ribs down toward the hips.', 'Round the spine on purpose; that\'s the movement.', 'Return slowly.'],
    ['Sitting back on the heels to pull with the hips.', 'Pulling with the arms.', 'Too heavy to curl properly.', 'Fast, jerky reps.'],
  ),
  'side-bend': c(
    'core',
    'core',
    'strength',
    ['Stand tall, weight in one hand.', 'Bend straight to the side, not forward.', 'Come back up past straight using the other side.', 'Do both sides.'],
    ['Leaning forward or back.', 'Holding weights in both hands (they cancel out).', 'Going too heavy.', 'Bouncing at the bottom.'],
  ),
  woodchop: c(
    'core',
    'core',
    'strength',
    ['Feet wide, arms long.', 'Rotate through the hips and torso together.', 'Pivot the back foot as you turn.', 'Control the return.'],
    ['Bending the arms to pull.', 'Twisting only the lower back.', 'Feet glued so the knees twist.', 'Rushing the way back.'],
  ),
  windmill: c(
    'core',
    'full',
    'strength',
    ['Weight locked out overhead, eyes on it.', 'Push the hips out to the side and slide the free hand down the leg.', 'Keep the top arm vertical the whole way.', 'Come back up slowly.'],
    ['Bending the top elbow.', 'Looking away from the weight.', 'Rounding forward instead of hinging.', 'Going heavy before it\'s smooth.'],
  ),
  // ----- power and conditioning -----
  clean: c(
    'power',
    'full',
    'power',
    ['Start like a deadlift: flat back, bar close.', 'Stand up, then explode: hips through, rise onto the toes, shrug.', 'Pull yourself under fast, elbows whip forward.', 'Catch on the front of the shoulders in a quarter squat, then stand.'],
    ['Pulling with the arms too early.', 'Bar swinging away from the body.', 'Catching with low elbows.', 'Learning it heavy instead of from a coach and light.'],
  ),
  snatch: c(
    'power',
    'full',
    'power',
    ['Wide grip, flat back, bar close.', 'Stand up, then explode with the hips and shrug.', 'Pull under and punch the bar to locked arms overhead.', 'Catch in a squat, stand with the bar over the mid-foot.'],
    ['Bar looping away from the body.', 'Pressing it out instead of locking out fast.', 'Arms bending early.', 'Skipping mobility and technique work.'],
  ),
  slam: c(
    'power',
    'full',
    'power',
    ['Ball overhead, rise onto the toes.', 'Slam it down hard in front, hinging at the hips.', 'Bend the knees to pick it up with a flat back.', 'Full effort every rep, then rest.'],
    ['Picking it up with a rounded back.', 'Slamming it onto your feet.', 'Only using the arms.', 'Using a bouncy ball (it comes back at your face).'],
  ),
  'battle-ropes': c(
    'cardio',
    'full',
    'cardio',
    ['Athletic half squat, chest up, core tight.', 'Fast waves from the shoulders, hands at hip height.', 'Keep the waves reaching all the way to the anchor.', 'Short hard rounds with rest.'],
    ['Standing up straight with locked knees.', 'Tiny waves from the wrists.', 'Rounding the back.', 'Going so long the form falls apart.'],
  ),
  'sled-push': c(
    'cardio',
    'full',
    'cardio',
    ['Lean in with straight arms, body at about 45°.', 'Drive with short, powerful steps on the balls of the feet.', 'Keep the back flat.', 'Push for a set distance, then rest.'],
    ['Standing too upright.', 'Long slow strides.', 'Rounding the back.', 'Bending the arms so the sled stalls.'],
  ),
  run: c(
    'cardio',
    'full',
    'cardio',
    ['Stand tall, lean slightly from the ankles.', 'Land under the hips, quick light steps.', 'Relaxed shoulders, arms swing forward and back.', 'Easy pace most days: you can talk while you go.'],
    ['Over-striding with the heel far ahead.', 'Tense shoulders up by the ears.', 'Arms crossing the body.', 'Every run hard.'],
  ),
  bike: c(
    'cardio',
    'lower',
    'cardio',
    ['Seat height: a small bend in the knee at the bottom of the pedal.', 'Push and pull in smooth circles.', 'Relaxed grip, back flat.', 'Pick a steady effort or intervals.'],
    ['Seat too low so the knees ache.', 'Bouncing in the saddle.', 'Gripping the bars hard.', 'Too much resistance to spin smoothly.'],
  ),
  rower: c(
    'cardio',
    'full',
    'cardio',
    ['Order on the drive: legs, then lean back, then arms.', 'On the way back: arms, then body, then knees.', 'Back straight, shoulders down.', 'Power comes from the legs.'],
    ['Pulling with the arms first.', 'Rounding the back at the catch.', 'Bending the knees before the hands pass them.', 'Rushing the slide forward.'],
  ),
  'jump-rope': c(
    'cardio',
    'full',
    'cardio',
    ['Small, light jumps on the balls of the feet.', 'Turn the rope with the wrists, elbows by your sides.', 'Stay tall, look ahead.', 'Start with short rounds.'],
    ['Jumping too high.', 'Swinging the whole arms.', 'Landing on the heels.', 'Bending the knees a lot on every hop.'],
  ),
  'star-jump': c(
    'plyometric',
    'full',
    'cardio',
    ['Feet and arms go out together, then back in.', 'Land softly with bent knees.', 'Arms all the way overhead.', 'Keep a steady rhythm.'],
    ['Landing stiff.', 'Half arm swings.', 'Knees caving in on landing.', 'Holding the breath.'],
  ),
  // ----- stretching and mobility -----
  'reach-stretch': c(
    'stretch',
    'full',
    'stretch',
    ['Move slowly into the stretch until you feel a pull, not pain.', 'Hold 20 to 30 seconds and breathe.', 'Relax a little deeper on each breath out.', 'Do both sides.'],
    ['Bouncing.', 'Holding the breath.', 'Forcing into pain.', 'Rushing through it.'],
  ),
  'toe-touch': c(
    'stretch',
    'lower',
    'stretch',
    ['Soft knees, hinge from the hips.', 'Let the head and arms hang.', 'Breathe and sink a little lower each breath.', 'Roll up slowly.'],
    ['Bouncing to reach further.', 'Locking the knees hard.', 'Standing up fast.', 'Holding the breath.'],
  ),
  'quad-stretch': c(
    'stretch',
    'lower',
    'stretch',
    ['Hold the ankle and bring the heel toward the glute.', 'Knees together, hips pushed slightly forward.', 'Stand tall; hold something for balance.', '20 to 30 seconds each side.'],
    ['Pulling the knee out to the side.', 'Arching the lower back.', 'Leaning forward.', 'Yanking the foot.'],
  ),
  'seated-stretch': c(
    'stretch',
    'lower',
    'stretch',
    ['Sit tall first, then fold forward from the hips.', 'Reach toward the feet with a long spine.', 'Breathe slowly and relax into it.', 'Hold 20 to 30 seconds.'],
    ['Rounding the back to reach further.', 'Bouncing.', 'Locking the knees hard.', 'Holding the breath.'],
  ),
  'knee-hug': c(
    'stretch',
    'lower',
    'stretch',
    ['Lie on your back, pull the knee toward the chest.', 'Keep the other leg relaxed.', 'Shoulders and head stay down.', 'Breathe slowly, 20 to 30 seconds.'],
    ['Lifting the head and straining the neck.', 'Pulling hard into pain.', 'Holding the breath.', 'Rushing.'],
  ),
  'lunge-stretch': c(
    'stretch',
    'lower',
    'stretch',
    ['Back knee down on something soft, front knee over the ankle.', 'Tuck the pelvis and shift the hips forward.', 'Stand tall; feel the front of the back hip.', 'Hold, then switch sides.'],
    ['Arching the lower back instead of tucking.', 'Front knee shooting past the toes.', 'Leaning the chest forward.', 'Bouncing.'],
  ),
  'calf-stretch': c(
    'stretch',
    'lower',
    'stretch',
    ['Hands on the wall, back leg straight, heel down.', 'Lean in until the calf stretches.', 'Back toes point straight ahead.', 'Bend the back knee a little to reach the lower calf.'],
    ['Heel lifting off the floor.', 'Back foot turned out.', 'Bouncing.', 'Rushing the hold.'],
  ),
  'arm-stretch': c(
    'stretch',
    'upper',
    'stretch',
    ['Move gently into the stretch, shoulders down.', 'Hold 20 to 30 seconds, breathing slowly.', 'Stand tall, don\'t arch the back.', 'Both sides.'],
    ['Shrugging up.', 'Forcing into pain.', 'Arching the back.', 'Holding the breath.'],
  ),
  'cat-cow': c(
    'mobility',
    'core',
    'mobility',
    ['On hands and knees, move slowly with the breath.', 'Breathe in: chest forward, back dips. Breathe out: round up tall.', 'Move through the whole spine.', '8 to 10 slow rounds.'],
    ['Moving only the neck.', 'Rushing.', 'Locking the elbows hard.', 'Holding the breath.'],
  ),
  'child-pose': c(
    'stretch',
    'full',
    'stretch',
    ['Knees apart, sit back toward the heels.', 'Arms long in front, forehead down.', 'Breathe into the back.', 'Rest here as long as you like.'],
    ['Forcing the hips down.', 'Shrugging the shoulders up.', 'Holding the breath.', 'Staying tense.'],
  ),
  'foam-roll': c(
    'mobility',
    'full',
    'mobility',
    ['Roll slowly, about an inch a second.', 'Pause on tight spots and breathe for 20 to 30 seconds.', 'Support yourself with the hands to control the pressure.', 'Roll muscles, not joints or the lower back bones.'],
    ['Rolling fast back and forth.', 'Rolling directly over joints.', 'Holding the breath.', 'Pressing so hard you tense up.'],
  ),
  circles: c(
    'mobility',
    'full',
    'mobility',
    ['Start with small circles, get bigger.', 'Smooth and controlled, both directions.', 'Stand tall, core lightly braced.', '10 or so each way as a warm-up.'],
    ['Flinging the limbs fast.', 'Shrugging the shoulders.', 'Only one direction.', 'Forcing the end of the range.'],
  ),
  neck: c(
    'mobility',
    'upper',
    'mobility',
    ['Move slowly and gently.', 'Shoulders relaxed and down.', 'Hold each position a few breaths.', 'Stop if anything tingles or hurts.'],
    ['Rolling the head fast in circles.', 'Pulling hard with the hands.', 'Shrugging.', 'Pushing through pain.'],
  ),
  balance: c(
    'mobility',
    'lower',
    'mobility',
    ['Stand tall on one leg, knee soft.', 'Eyes on a point ahead.', 'Small corrections at the ankle.', 'Switch legs; close the eyes to make it harder.'],
    ['Locking the standing knee.', 'Hip dropping on the free side.', 'Looking down.', 'Holding the breath.'],
  ),
  // ----- the program's moves -----
  'incline-pushup': c(
    'push-horizontal',
    'upper',
    'strength',
    ['Hands on the bench just wider than the shoulders.', 'Body one straight line from heels to head.', 'Lower the chest to the edge, elbows about 45°.', 'Lower the bench to make it harder.'],
    ['Hips sagging or piking.', 'Elbows flared straight out.', 'Head dropping first.', 'Half reps.'],
  ),
  pushup: c(
    'push-horizontal',
    'upper',
    'strength',
    ['Hands under the shoulders, body one straight line.', 'Squeeze the glutes and brace the belly.', 'Lower the chest to fist height, elbows about 45°.', 'Push the floor away to straight arms.'],
    ['Hips sagging.', 'Elbows flared out to the sides.', 'Head poking forward.', 'Half reps.'],
  ),
  'diamond-pushup': c(
    'push-horizontal',
    'upper',
    'strength',
    ['Hands together under the chest, thumbs and fingers touching.', 'Elbows brush the ribs on the way down.', 'Body stays one straight line.', 'Lower to just above the hands.'],
    ['Elbows flaring wide.', 'Hips sagging.', 'Hands too far forward.', 'Short reps.'],
  ),
  dips: c(
    'push-vertical',
    'upper',
    'strength',
    ['Start at straight arms, shoulders pushed down.', 'Lean slightly forward and lower until the elbows reach 90°.', 'Press back up to locked arms.', 'Use the assisted machine or a band until it\'s easy.'],
    ['Shoulders shrugging up to the ears.', 'Going too deep and straining the shoulders.', 'Elbows flaring out.', 'Kicking the legs.'],
  ),
  'archer-pushup': c(
    'push-horizontal',
    'upper',
    'strength',
    ['Hands very wide.', 'Shift over one hand as that arm bends; the other stays straight.', 'Body stays one line.', 'Reps per side.'],
    ['Bending both arms.', 'Hips twisting.', 'Sagging.', 'Rushing the side switch.'],
  ),
  'dead-hang': c(
    'pull-vertical',
    'upper',
    'strength',
    ['Full grip on the bar, thumbs around.', 'Shoulders active: pull them slightly down.', 'Body still, legs together.', 'Breathe.'],
    ['Shoulders creeping up to the ears.', 'Swinging.', 'Half grip with the fingers.', 'Holding the breath.'],
  ),
  'assisted-pullup': c(
    'pull-vertical',
    'upper',
    'strength',
    ['Full hang at the bottom.', 'Pull the chest toward the bar, chin over.', 'Lower slowly.', 'Use less help as you get stronger.'],
    ['Bouncing out of the band.', 'Half reps.', 'Kicking.', 'Not lowering all the way.'],
  ),
  negatives: c(
    'pull-vertical',
    'upper',
    'strength',
    ['Jump or step to the top, chin over the bar.', 'Lower yourself as slowly as you can, about 5 seconds.', 'Stay tight all the way down.', 'Step down and repeat.'],
    ['Dropping fast at the bottom.', 'Swinging.', 'Too many reps when tired.', 'Relaxing the shoulders at the bottom.'],
  ),
  'strict-pullup': c(
    'pull-vertical',
    'upper',
    'strength',
    ['Start from a dead hang, shoulders pulled down.', 'Pull the chest toward the bar, chin over.', 'No kipping or swinging.', 'Many small sets beat one big one.'],
    ['Kipping.', 'Half reps.', 'Craning the chin over.', 'Dropping down without control.'],
  ),
  pullup: c(
    'pull-vertical',
    'upper',
    'strength',
    ['Grip a bit wider than the shoulders.', 'Pull the shoulders down first, then the elbows down.', 'Chest toward the bar, chin over.', 'Lower under control to straight arms.'],
    ['Swinging the body.', 'Half reps.', 'Shrugging at the top.', 'Dropping down.'],
  ),
  'lsit-pullup': c(
    'pull-vertical',
    'full',
    'strength',
    ['Raise the legs to 90° and hold them there.', 'Pull up with the legs level the whole rep.', 'Lower slowly.', 'Bend the knees to make it easier.'],
    ['Legs dropping.', 'Swinging.', 'Half reps.', 'Rushing.'],
  ),
  'knee-raise': c(
    'core',
    'core',
    'strength',
    ['Hang still, shoulders active.', 'Bring the knees to the chest by curling the hips.', 'Lower slowly.', 'No swinging.'],
    ['Swinging.', 'Only lifting the knees to hip height.', 'Dropping the legs.', 'Shrugging.'],
  ),
  'tuck-lsit': c(
    'core',
    'core',
    'strength',
    ['Push the bars away, shoulders down.', 'Knees tucked to the chest.', 'Hold and breathe.', 'Arms locked straight.'],
    ['Shoulders shrugged up.', 'Bent elbows.', 'Holding the breath.', 'Leaning back.'],
  ),
  'one-leg-lsit': c(
    'core',
    'core',
    'strength',
    ['One leg straight and level, the other tucked.', 'Push the bars away, shoulders down.', 'Switch legs each set.', 'Breathe.'],
    ['Straight leg dropping.', 'Shoulders up.', 'Bent elbows.', 'Holding the breath.'],
  ),
  lsit: c(
    'core',
    'core',
    'strength',
    ['Both legs straight and level, toes pointed.', 'Push hard into the bars, shoulders down.', 'Lock the knees.', 'Short holds add up.'],
    ['Legs drooping.', 'Bent knees.', 'Shrugged shoulders.', 'Holding the breath.'],
  ),
  'toes-to-bar': c(
    'core',
    'core',
    'strength',
    ['Hang still, shoulders active.', 'Raise straight legs up to the bar.', 'Lower slowly, no swing.', 'Bend the knees until it\'s strong enough.'],
    ['Swinging to kick up.', 'Bent legs to cheat.', 'Dropping fast.', 'Arching the back at the bottom.'],
  ),
};
