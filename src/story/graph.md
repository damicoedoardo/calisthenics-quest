# Story graph

Written by `pnpm story:graph` from `src/story/` and the real story engine. Do not edit by hand; `pnpm test` fails while it is out of date. How it works: `docs/handbook/game/story.md`.

Every scene is a box. A box with pointed sides asks a question; a rounded one ends its chapter. Solid arrows are the order a planned player meets the scenes; dashed arrows carry an answer to the scenes that read it. Every chapter scene catches up before the chapter's ending when its boss falls early, except the optional ones (amber: flavor for a kind of day). Red: a scene lost anyway (the test fails).

## The walks

Each walk plays the story through `scenesToPlay`, day by day: trains Monday, Wednesday and Friday, opens the app every day, every seventh workout a short one, every other one beats last time, first choice on every question. Nobody in a walk goes away, trains days in a row, or walks the Ember Road.

| Walk | Who | Bosses fall at workout | Scenes played |
| --- | --- | --- | --- |
| planned | Beats each boss at the chapter's planned length (12 to 14 workouts), joins every villager | 12, 24, 37, 50, 64, 78 | 91 |
| fast | Beats each boss 4 workouts into its chapter (a strong player), joins every villager | 4, 8, 12, 16, 20, 24 | 85 |
| alone | Planned pace, but walks on from every villager | 12, 24, 37, 50, 64, 78 | 83 |

## The spine

```mermaid
flowchart LR
  opening(["Opening: first Fog, the Wanderer, the class"])
  c1["Chapter 1: The Ashlands<br/>17 scenes"]
  opening -->|"first workout"| c1
  c2["Chapter 2: Mirror Lake<br/>14 scenes"]
  c1 -->|"Tomorrow falls"| c2
  c3["Chapter 3: The Village of Almosts<br/>15 scenes"]
  c2 -->|"The Mirror falls"| c3
  c4["Chapter 4: The Plateau<br/>15 scenes"]
  c3 -->|"The Perfect Knight falls"| c4
  c5["Chapter 5: The Fog<br/>12 scenes"]
  c4 -->|"The Plateau falls"| c5
  c6["Chapter 6: Forma<br/>11 scenes"]
  c5 -->|"The Hollow falls"| c6
  c6 -->|"The Summit falls"| finale(["finale"])
  anytime["Any time: SPs, beating last time, coming back"] -.-> c1
  road["Ember Road: with friends, its own 3 chapters"] -.-> c1
```

## Problem paths

Found by the walks. A scene lost, played after its ending, played before its question, or never reached fails `pnpm test`, so none are left. What is listed here is allowed, to look at.

### Optional scenes the fast walk dropped (4)

- `ch1-small-day`: Optional (4 workouts · in chapter 1 · after a short workout): the fast walk never got that day before Tomorrow fell.
- `ch3-knight-cracks`: Optional (in chapter 3 · after a short workout): the fast walk never got that day before The Perfect Knight fell.
- `ch4-sol-socks`: Optional (5 workouts · in chapter 4 · rest day · sol = yes): the fast walk never got that day before The Plateau fell.
- `ch5-short`: Optional (1 workout · in chapter 5 · after a short workout): the fast walk never got that day before The Hollow fell.

### Flame growth lands in another chapter (4)

- `ch1-candle`: In the fast walk it plays in chapter 2 (workout 6), not in chapter 1 where it is written.
- `ch2-torch`: In the fast walk it plays in chapter 4 (workout 15), not in chapter 2 where it is written.
- `ch5-wings`: In the planned walk it plays in chapter 4 (workout 50), not in chapter 5 where it is written.
- `ch5-wings`: In the alone walk it plays in chapter 4 (workout 50), not in chapter 5 where it is written.

## Answers that carry

Each question, and every scene that reads its answer later. A scene that waits for an answer is skipped without it; lines that read it drop out.

### why, want, forWho, remind (asked in first-letter)

```mermaid
flowchart LR
  first_letter{{"first-letter<br/>asks why, want, forWho, remind"}}
  first_letter -.->|"why (some lines)"| ch1_night_camp{{"ch1-night-camp"}}
  first_letter -.->|"want"| ch2_wanderer_knows["ch2-wanderer-knows"]
  first_letter -.->|"why (some lines), want (some lines), forWho (some lines), remind (some lines)"| finale["finale"]
  first_letter -.->|"remind (some lines)"| return["return"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class first_letter ask
  class ch1_night_camp ask
```

### lia (asked in ch2-lia)

```mermaid
flowchart LR
  ch2_lia{{"ch2-lia<br/>asks lia"}}
  ch2_lia -.->|"lia = yes"| ch2_mira_lia["ch2-mira-lia"]
  ch2_lia -.->|"lia = yes"| ch2_lia_dance["ch2-lia-dance"]
  ch2_lia -.->|"lia = yes"| ch4_lia_bird["ch4-lia-bird"]
  ch2_lia -.->|"lia, lia = yes (some lines)"| ch5_gathering{{"ch5-gathering"}}
  ch2_lia -.->|"lia"| ch5_gathering_alone{{"ch5-gathering-alone"}}
  ch2_lia -.->|"lia = yes (some lines)"| ch6_kid["ch6-kid"]
  ch2_lia -.->|"lia = yes (some lines)"| finale["finale"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch2_lia ask
  class ch5_gathering ask
  class ch5_gathering_alone ask
```

### heart2 (asked in ch2-heart)

```mermaid
flowchart LR
  ch2_heart{{"ch2-heart<br/>asks heart2"}}
  ch2_heart -.->|"heart2 (some lines)"| ch2_grief["ch2-grief"]
  ch2_heart -.->|"heart2 (some lines)"| ch5_victory(["ch5-victory"])
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch2_heart ask
  class ch5_victory done
```

### sol (asked in ch3-sol)

```mermaid
flowchart LR
  ch3_sol{{"ch3-sol<br/>asks sol"}}
  ch3_sol -.->|"sol = yes"| ch3_sol_stops["ch3-sol-stops"]
  ch3_sol -.->|"sol = yes"| ch3_sol_rest["ch3-sol-rest"]
  ch3_sol -.->|"sol = yes"| ch4_sol_socks["ch4-sol-socks"]
  ch3_sol -.->|"sol, sol = yes (some lines)"| ch5_gathering{{"ch5-gathering"}}
  ch3_sol -.->|"sol"| ch5_gathering_alone{{"ch5-gathering-alone"}}
  ch3_sol -.->|"sol = yes (some lines)"| ch6_kid["ch6-kid"]
  ch3_sol -.->|"sol = yes (some lines)"| finale["finale"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch3_sol ask
  class ch4_sol_socks only
  class ch5_gathering ask
  class ch5_gathering_alone ask
```

### vela (asked in ch4-vela)

```mermaid
flowchart LR
  ch4_vela{{"ch4-vela<br/>asks vela"}}
  ch4_vela -.->|"vela = yes"| ch4_vela_letter["ch4-vela-letter"]
  ch4_vela -.->|"vela = yes"| ch4_vela_down["ch4-vela-down"]
  ch4_vela -.->|"vela = yes (some lines)"| ch4_tracks["ch4-tracks"]
  ch4_vela -.->|"vela = yes (some lines)"| ch4_victory(["ch4-victory"])
  ch4_vela -.->|"vela, vela = yes (some lines)"| ch5_gathering{{"ch5-gathering"}}
  ch4_vela -.->|"vela"| ch5_gathering_alone{{"ch5-gathering-alone"}}
  ch4_vela -.->|"vela = yes (some lines)"| ch6_kid["ch6-kid"]
  ch4_vela -.->|"vela = yes (some lines)"| ch6_last_camp["ch6-last-camp"]
  ch4_vela -.->|"vela = yes (some lines)"| finale["finale"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch4_vela ask
  class ch4_victory done
  class ch5_gathering ask
  class ch5_gathering_alone ask
```

### heart4 (asked in ch4-heart)

```mermaid
flowchart LR
  ch4_heart{{"ch4-heart<br/>asks heart4"}}
  ch4_heart -.->|"heart4 (some lines)"| ch5_nothing_changed["ch5-nothing-changed"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch4_heart ask
```

### heart3 (asked in ch3-knight-kneels)

```mermaid
flowchart LR
  ch3_knight_kneels(["ch3-knight-kneels<br/>asks heart3"])
  ch3_knight_kneels -.->|"heart3 (some lines)"| ch5_nothing_changed["ch5-nothing-changed"]
  ch3_knight_kneels -.->|"heart3 (some lines)"| ch6_kid["ch6-kid"]
  ch3_knight_kneels -.->|"heart3 (some lines)"| finale["finale"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch3_knight_kneels done
```

### heart5 (asked in ch5-heart)

```mermaid
flowchart LR
  ch5_heart{{"ch5-heart<br/>asks heart5"}}
  ch5_heart -.->|"heart5 (some lines)"| ch6_summit_speaks["ch6-summit-speaks"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch5_heart ask
```

### heart1 (asked in ch1-night-camp)

```mermaid
flowchart LR
  ch1_night_camp{{"ch1-night-camp<br/>asks heart1"}}
  ch1_night_camp -.->|"heart1 (some lines)"| ch6_remembering["ch6-remembering"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch1_night_camp ask
```

### heart6 (asked in ch6-heart)

```mermaid
flowchart LR
  ch6_heart{{"ch6-heart<br/>asks heart6"}}
  ch6_heart -.->|"heart6 (some lines)"| finale["finale"]
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch6_heart ask
```

## Chapter 1: The Ashlands

Ends when Tomorrow falls in the Fog. Planned length 12 workouts. `workouts` below count from the chapter's start.

```mermaid
flowchart TD
  first_quest["first-quest<br/>1 workout"]
  first_letter{{"first-letter<br/>1 workout · no letter yet"}}
  flame_name{{"flame-name<br/>1 workout"}}
  first_rest_day["first-rest-day<br/>1 workout · rest day"]
  ch1_kept["ch1-kept<br/>2 workouts · chapter 1 started"]
  class_choice{{"class-choice<br/>3 workouts · no class yet"}}
  ch1_breath["ch1-breath<br/>3 workouts · chapter 1 started"]
  perfect_week["perfect-week<br/>a full week"]
  ch1_wanderer_first["ch1-wanderer-first<br/>4 workouts · chapter 1 started"]
  ch1_tomorrow_splits["ch1-tomorrow-splits<br/>5 workouts"]
  mira_forge["mira-forge<br/>6 workouts · up to chapter 2"]
  ch1_candle["ch1-candle<br/>flame grown to candle"]
  ch1_small_day["ch1-small-day<br/>4 workouts · in chapter 1 · after a short workout"]
  ch1_night_camp{{"ch1-night-camp<br/>8 workouts"}}
  ch1_tomorrow_begs["ch1-tomorrow-begs<br/>10 workouts"]
  ch1_proof["ch1-proof<br/>11 workouts · chapter 1 started"]
  ch1_victory(["ch1-victory<br/>boss 1 beaten"])
  first_quest --> first_letter
  first_letter --> flame_name
  flame_name --> first_rest_day
  first_rest_day --> ch1_kept
  ch1_kept --> class_choice
  class_choice --> ch1_breath
  ch1_breath --> perfect_week
  perfect_week --> ch1_wanderer_first
  ch1_wanderer_first --> ch1_tomorrow_splits
  ch1_tomorrow_splits --> mira_forge
  mira_forge --> ch1_candle
  ch1_candle --> ch1_small_day
  ch1_small_day --> ch1_night_camp
  ch1_night_camp --> ch1_tomorrow_begs
  ch1_tomorrow_begs --> ch1_proof
  ch1_proof --> ch1_victory
  first_letter -.->|"why"| ch1_night_camp
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class first_letter ask
  class flame_name ask
  class class_choice ask
  class first_rest_day only
  class perfect_week only
  class ch1_small_day only
  class ch1_night_camp ask
  class ch1_victory done
```

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `first-quest` | 1 workout |  |  | yes | yes | yes |
| `first-letter` | 1 workout · no letter yet | letter |  | yes | yes | yes |
| `flame-name` | 1 workout | name |  | yes | yes | yes |
| `first-rest-day` | 1 workout · rest day |  | optional | yes | yes | yes |
| `ch1-kept` | 2 workouts · chapter 1 started |  |  | yes | yes | yes |
| `class-choice` | 3 workouts · no class yet | class |  | yes | yes | yes |
| `ch1-breath` | 3 workouts · chapter 1 started |  |  | yes | yes | yes |
| `perfect-week` | a full week |  | optional | yes | yes | yes |
| `ch1-wanderer-first` | 4 workouts · chapter 1 started |  |  | yes | yes | yes |
| `ch1-tomorrow-splits` | 5 workouts |  |  | yes | yes | yes |
| `mira-forge` | 6 workouts · up to chapter 2 |  |  | yes | yes | yes |
| `ch1-candle` | flame grown to candle |  |  | yes | yes | yes |
| `ch1-small-day` | 4 workouts · in chapter 1 · after a short workout |  | optional | yes | **no** | yes |
| `ch1-night-camp` | 8 workouts | heart1 | reads why (first-letter) | yes | yes | yes |
| `ch1-tomorrow-begs` | 10 workouts |  |  | yes | yes | yes |
| `ch1-proof` | 11 workouts · chapter 1 started |  |  | yes | yes | yes |
| `ch1-victory` | boss 1 beaten |  | ends the chapter | yes | yes | yes |

## Chapter 2: Mirror Lake

Ends when The Mirror falls in the Fog. Planned length 12 workouts. `workouts` below count from the chapter's start.

```mermaid
flowchart TD
  ch2_intro["ch2-intro<br/>chapter 2 started"]
  ch2_lake_rest["ch2-lake-rest<br/>in chapter 2 · rest day"]
  ch2_reflection["ch2-reflection<br/>2 workouts · chapter 2 started"]
  ch2_torch["ch2-torch<br/>flame grown to torch"]
  ch2_echo_counts["ch2-echo-counts<br/>4 workouts"]
  ch2_wanderer_knows["ch2-wanderer-knows<br/>5 workouts · needs want"]
  ch2_lia{{"ch2-lia<br/>6 workouts"}}
  ch2_heart{{"ch2-heart<br/>7 workouts"}}
  ch2_mira_lia["ch2-mira-lia<br/>8 workouts · lia = yes"]
  ch2_shore["ch2-shore<br/>8 workouts · chapter 2 started"]
  ch2_friend["ch2-friend<br/>9 workouts · chapter 2 started"]
  ch2_lia_dance["ch2-lia-dance<br/>10 workouts · lia = yes"]
  ch2_grief["ch2-grief<br/>11 workouts · chapter 2 started"]
  ch2_victory(["ch2-victory<br/>boss 2 beaten"])
  ch2_intro --> ch2_lake_rest
  ch2_lake_rest --> ch2_reflection
  ch2_reflection --> ch2_torch
  ch2_torch --> ch2_echo_counts
  ch2_echo_counts --> ch2_wanderer_knows
  ch2_wanderer_knows --> ch2_lia
  ch2_lia --> ch2_heart
  ch2_heart --> ch2_mira_lia
  ch2_mira_lia --> ch2_shore
  ch2_shore --> ch2_friend
  ch2_friend --> ch2_lia_dance
  ch2_lia_dance --> ch2_grief
  ch2_grief --> ch2_victory
  ch2_lia -.->|"lia = yes"| ch2_mira_lia
  ch2_lia -.->|"lia = yes"| ch2_lia_dance
  ch2_heart -.->|"heart2"| ch2_grief
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch2_lia ask
  class ch2_heart ask
  class ch2_lake_rest only
  class ch2_victory done
```

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `ch2-intro` | chapter 2 started |  |  | yes | yes | yes |
| `ch2-lake-rest` | in chapter 2 · rest day |  | optional | yes | yes | yes |
| `ch2-reflection` | 2 workouts · chapter 2 started |  |  | yes | yes | yes |
| `ch2-torch` | flame grown to torch |  |  | yes | yes | yes |
| `ch2-echo-counts` | 4 workouts |  |  | yes | yes | yes |
| `ch2-wanderer-knows` | 5 workouts · needs {want} |  | reads want (first-letter) | yes | yes | yes |
| `ch2-lia` | 6 workouts | lia |  | yes | yes | yes |
| `ch2-heart` | 7 workouts | heart2 |  | yes | yes | yes |
| `ch2-mira-lia` | 8 workouts · lia = yes |  | reads lia (ch2-lia) | yes | yes | **no** |
| `ch2-shore` | 8 workouts · chapter 2 started |  |  | yes | yes | yes |
| `ch2-friend` | 9 workouts · chapter 2 started |  |  | yes | yes | yes |
| `ch2-lia-dance` | 10 workouts · lia = yes |  | reads lia (ch2-lia) | yes | yes | **no** |
| `ch2-grief` | 11 workouts · chapter 2 started |  | reads heart2 (ch2-heart) | yes | yes | yes |
| `ch2-victory` | boss 2 beaten |  | ends the chapter | yes | yes | yes |

## Chapter 3: The Village of Almosts

Ends when The Perfect Knight falls in the Fog. Planned length 13 workouts. `workouts` below count from the chapter's start.

```mermaid
flowchart TD
  ch3_intro["ch3-intro<br/>chapter 3 started"]
  ch3_rest["ch3-rest<br/>in chapter 3 · rest day"]
  ch3_knight["ch3-knight<br/>2 workouts · chapter 3 started"]
  ch3_apprentice["ch3-apprentice<br/>3 workouts · chapter 3 started"]
  ch3_sol{{"ch3-sol<br/>4 workouts · chapter 3 started"}}
  ch3_knight_cracks["ch3-knight-cracks<br/>in chapter 3 · after a short workout"]
  ch3_knight_voice["ch3-knight-voice<br/>5 workouts · chapter 3 started"]
  ch3_bonfire["ch3-bonfire<br/>flame grown to bonfire"]
  ch3_song["ch3-song<br/>7 workouts · chapter 3 started"]
  ch3_mira_story["ch3-mira-story<br/>8 workouts"]
  ch3_first_steel["ch3-first-steel<br/>9 workouts · chapter 3 started"]
  ch3_sol_stops["ch3-sol-stops<br/>10 workouts · sol = yes"]
  ch3_sol_rest["ch3-sol-rest<br/>11 workouts · sol = yes"]
  ch3_last_stand["ch3-last-stand<br/>12 workouts · chapter 3 started"]
  ch3_knight_kneels(["ch3-knight-kneels<br/>boss 3 beaten"])
  ch3_intro --> ch3_rest
  ch3_rest --> ch3_knight
  ch3_knight --> ch3_apprentice
  ch3_apprentice --> ch3_sol
  ch3_sol --> ch3_knight_cracks
  ch3_knight_cracks --> ch3_knight_voice
  ch3_knight_voice --> ch3_bonfire
  ch3_bonfire --> ch3_song
  ch3_song --> ch3_mira_story
  ch3_mira_story --> ch3_first_steel
  ch3_first_steel --> ch3_sol_stops
  ch3_sol_stops --> ch3_sol_rest
  ch3_sol_rest --> ch3_last_stand
  ch3_last_stand --> ch3_knight_kneels
  ch3_sol -.->|"sol = yes"| ch3_sol_stops
  ch3_sol -.->|"sol = yes"| ch3_sol_rest
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch3_sol ask
  class ch3_knight_cracks only
  class ch3_rest only
  class ch3_knight_kneels done
```

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `ch3-intro` | chapter 3 started |  |  | yes | yes | yes |
| `ch3-rest` | in chapter 3 · rest day |  | optional | yes | yes | yes |
| `ch3-knight` | 2 workouts · chapter 3 started |  |  | yes | yes | yes |
| `ch3-apprentice` | 3 workouts · chapter 3 started |  |  | yes | yes | yes |
| `ch3-sol` | 4 workouts · chapter 3 started | sol |  | yes | yes | yes |
| `ch3-knight-cracks` | in chapter 3 · after a short workout |  | optional | yes | **no** | yes |
| `ch3-knight-voice` | 5 workouts · chapter 3 started |  |  | yes | yes | yes |
| `ch3-bonfire` | flame grown to bonfire |  |  | yes | **no** | yes |
| `ch3-song` | 7 workouts · chapter 3 started |  |  | yes | yes | yes |
| `ch3-mira-story` | 8 workouts |  |  | yes | yes | yes |
| `ch3-first-steel` | 9 workouts · chapter 3 started |  |  | yes | yes | yes |
| `ch3-sol-stops` | 10 workouts · sol = yes |  | reads sol (ch3-sol) | yes | yes | **no** |
| `ch3-sol-rest` | 11 workouts · sol = yes |  | reads sol (ch3-sol) | yes | yes | **no** |
| `ch3-last-stand` | 12 workouts · chapter 3 started |  |  | yes | yes | yes |
| `ch3-knight-kneels` | boss 3 beaten | heart3 | ends the chapter | yes | yes | yes |

## Chapter 4: The Plateau

Ends when The Plateau falls in the Fog. Planned length 13 workouts. `workouts` below count from the chapter's start.

```mermaid
flowchart TD
  ch4_intro["ch4-intro<br/>chapter 4 started"]
  ch4_rest["ch4-rest<br/>in chapter 4 · rest day"]
  ch4_wake["ch4-wake<br/>2 workouts · chapter 4 started"]
  ch4_lia_bird["ch4-lia-bird<br/>3 workouts · chapter 4 started · lia = yes"]
  ch4_vela{{"ch4-vela<br/>4 workouts · chapter 4 started"}}
  ch4_small_step["ch4-small-step<br/>1 workout · in chapter 4 · after a short workout"]
  ch4_sol_socks["ch4-sol-socks<br/>5 workouts · in chapter 4 · rest day · sol = yes"]
  ch4_heart{{"ch4-heart<br/>6 workouts · chapter 4 started"}}
  ch4_vela_letter["ch4-vela-letter<br/>7 workouts · chapter 4 started · vela = yes"]
  ch4_boring["ch4-boring<br/>8 workouts · chapter 4 started"]
  ch4_vela_down["ch4-vela-down<br/>9 workouts · chapter 4 started · vela = yes"]
  ch4_stone["ch4-stone<br/>10 workouts · chapter 4 started"]
  ch4_tracks["ch4-tracks<br/>11 workouts · chapter 4 started"]
  ch4_kid_quits["ch4-kid-quits<br/>12 workouts · chapter 4 started"]
  ch4_victory(["ch4-victory<br/>boss 4 beaten"])
  ch4_intro --> ch4_rest
  ch4_rest --> ch4_wake
  ch4_wake --> ch4_lia_bird
  ch4_lia_bird --> ch4_vela
  ch4_vela --> ch4_small_step
  ch4_small_step --> ch4_sol_socks
  ch4_sol_socks --> ch4_heart
  ch4_heart --> ch4_vela_letter
  ch4_vela_letter --> ch4_boring
  ch4_boring --> ch4_vela_down
  ch4_vela_down --> ch4_stone
  ch4_stone --> ch4_tracks
  ch4_tracks --> ch4_kid_quits
  ch4_kid_quits --> ch4_victory
  ch4_vela -.->|"vela = yes"| ch4_vela_letter
  ch4_vela -.->|"vela = yes"| ch4_vela_down
  ch4_vela -.->|"vela = yes"| ch4_tracks
  ch4_vela -.->|"vela = yes"| ch4_victory
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch4_vela ask
  class ch4_sol_socks only
  class ch4_heart ask
  class ch4_small_step only
  class ch4_rest only
  class ch4_victory done
```

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `ch4-intro` | chapter 4 started |  |  | yes | yes | yes |
| `ch4-rest` | in chapter 4 · rest day |  | optional | yes | yes | yes |
| `ch4-wake` | 2 workouts · chapter 4 started |  |  | yes | yes | yes |
| `ch4-lia-bird` | 3 workouts · chapter 4 started · lia = yes |  | reads lia (ch2-lia) | yes | yes | **no** |
| `ch4-vela` | 4 workouts · chapter 4 started | vela |  | yes | yes | yes |
| `ch4-small-step` | 1 workout · in chapter 4 · after a short workout |  | optional | yes | yes | yes |
| `ch4-sol-socks` | 5 workouts · in chapter 4 · rest day · sol = yes |  | optional, reads sol (ch3-sol) | yes | **no** | **no** |
| `ch4-heart` | 6 workouts · chapter 4 started | heart4 |  | yes | yes | yes |
| `ch4-vela-letter` | 7 workouts · chapter 4 started · vela = yes |  | reads vela (ch4-vela) | yes | yes | **no** |
| `ch4-boring` | 8 workouts · chapter 4 started |  |  | yes | yes | yes |
| `ch4-vela-down` | 9 workouts · chapter 4 started · vela = yes |  | reads vela (ch4-vela) | yes | yes | **no** |
| `ch4-stone` | 10 workouts · chapter 4 started |  |  | yes | yes | yes |
| `ch4-tracks` | 11 workouts · chapter 4 started |  | reads vela (ch4-vela) | yes | yes | yes |
| `ch4-kid-quits` | 12 workouts · chapter 4 started |  |  | yes | yes | yes |
| `ch4-victory` | boss 4 beaten |  | ends the chapter, reads vela (ch4-vela) | yes | yes | yes |

## Chapter 5: The Fog

Ends when The Hollow falls in the Fog. Planned length 14 workouts. `workouts` below count from the chapter's start.

```mermaid
flowchart TD
  ch5_wings["ch5-wings<br/>flame grown to fairy"]
  ch5_intro["ch5-intro<br/>chapter 5 started"]
  ch5_rest["ch5-rest<br/>in chapter 5 · rest day"]
  ch5_fairy_heals["ch5-fairy-heals<br/>3 workouts · chapter 5 started"]
  ch5_next_step["ch5-next-step<br/>5 workouts · chapter 5 started"]
  ch5_short["ch5-short<br/>1 workout · in chapter 5 · after a short workout"]
  ch5_hollow_knows["ch5-hollow-knows<br/>7 workouts · chapter 5 started"]
  ch5_heart{{"ch5-heart<br/>9 workouts · chapter 5 started"}}
  ch5_nothing_changed["ch5-nothing-changed<br/>11 workouts · chapter 5 started"]
  ch5_gathering{{"ch5-gathering<br/>13 workouts · chapter 5 started · helped a villager"}}
  ch5_victory(["ch5-victory<br/>boss 5 beaten"])
  ch5_gathering_alone{{"ch5-gathering-alone<br/>13 workouts · chapter 5 started · helped no villager"}}
  ch5_wings --> ch5_intro
  ch5_intro --> ch5_rest
  ch5_rest --> ch5_fairy_heals
  ch5_fairy_heals --> ch5_next_step
  ch5_next_step --> ch5_short
  ch5_short --> ch5_hollow_knows
  ch5_hollow_knows --> ch5_heart
  ch5_heart --> ch5_nothing_changed
  ch5_nothing_changed --> ch5_gathering
  ch5_gathering --> ch5_victory
  ch5_victory --> ch5_gathering_alone
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch5_heart ask
  class ch5_gathering ask
  class ch5_gathering_alone ask
  class ch5_short only
  class ch5_rest only
  class ch5_victory done
```

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `ch5-wings` | flame grown to fairy |  |  | yes | **no** | yes |
| `ch5-intro` | chapter 5 started |  |  | yes | yes | yes |
| `ch5-rest` | in chapter 5 · rest day |  | optional | yes | yes | yes |
| `ch5-fairy-heals` | 3 workouts · chapter 5 started |  |  | yes | yes | yes |
| `ch5-next-step` | 5 workouts · chapter 5 started |  |  | yes | yes | yes |
| `ch5-short` | 1 workout · in chapter 5 · after a short workout |  | optional | yes | **no** | yes |
| `ch5-hollow-knows` | 7 workouts · chapter 5 started |  |  | yes | yes | yes |
| `ch5-heart` | 9 workouts · chapter 5 started | heart5 |  | yes | yes | yes |
| `ch5-nothing-changed` | 11 workouts · chapter 5 started |  | reads heart4 (ch4-heart), reads heart3 (ch3-knight-kneels) | yes | yes | yes |
| `ch5-gathering` | 13 workouts · chapter 5 started · helped a villager | call | reads lia (ch2-lia), reads sol (ch3-sol), reads vela (ch4-vela), reads lia (ch2-lia), reads sol (ch3-sol), reads vela (ch4-vela) | yes | yes | **no** |
| `ch5-victory` | boss 5 beaten |  | ends the chapter, reads heart2 (ch2-heart) | yes | yes | yes |
| `ch5-gathering-alone` | 13 workouts · chapter 5 started · helped no villager | call | reads lia (ch2-lia), reads sol (ch3-sol), reads vela (ch4-vela) | **no** | **no** | yes |

## Chapter 6: Forma

Ends when The Summit falls in the Fog. Planned length 14 workouts. `workouts` below count from the chapter's start.

```mermaid
flowchart TD
  ch6_intro["ch6-intro<br/>chapter 6 started"]
  ch6_rest["ch6-rest<br/>in chapter 6 · rest day"]
  ch6_summit_speaks["ch6-summit-speaks<br/>2 workouts · chapter 6 started"]
  ch6_kid["ch6-kid<br/>4 workouts · chapter 6 started"]
  ch6_remembering["ch6-remembering<br/>6 workouts · chapter 6 started"]
  ch6_short["ch6-short<br/>1 workout · in chapter 6 · after a short workout"]
  ch6_book["ch6-book<br/>8 workouts · chapter 6 started"]
  ch6_fall["ch6-fall<br/>9 workouts · chapter 6 started"]
  ch6_heart{{"ch6-heart<br/>10 workouts · chapter 6 started"}}
  ch6_last_camp["ch6-last-camp<br/>12 workouts · chapter 6 started"]
  finale["finale<br/>story finished"]
  ch6_intro --> ch6_rest
  ch6_rest --> ch6_summit_speaks
  ch6_summit_speaks --> ch6_kid
  ch6_kid --> ch6_remembering
  ch6_remembering --> ch6_short
  ch6_short --> ch6_book
  ch6_book --> ch6_fall
  ch6_fall --> ch6_heart
  ch6_heart --> ch6_last_camp
  ch6_last_camp --> finale
  ch6_heart -.->|"heart6"| finale
  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12
  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305
  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d
  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19
  class ch6_heart ask
  class ch6_short only
  class ch6_rest only
```

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `ch6-intro` | chapter 6 started |  |  | yes | yes | yes |
| `ch6-rest` | in chapter 6 · rest day |  | optional | yes | yes | yes |
| `ch6-summit-speaks` | 2 workouts · chapter 6 started |  | reads heart5 (ch5-heart) | yes | yes | yes |
| `ch6-kid` | 4 workouts · chapter 6 started |  | reads heart3 (ch3-knight-kneels), reads lia (ch2-lia), reads sol (ch3-sol), reads vela (ch4-vela) | yes | yes | yes |
| `ch6-remembering` | 6 workouts · chapter 6 started |  | reads heart1 (ch1-night-camp) | yes | yes | yes |
| `ch6-short` | 1 workout · in chapter 6 · after a short workout |  | optional | yes | yes | yes |
| `ch6-book` | 8 workouts · chapter 6 started |  |  | yes | yes | yes |
| `ch6-fall` | 9 workouts · chapter 6 started |  |  | yes | yes | yes |
| `ch6-heart` | 10 workouts · chapter 6 started | heart6 |  | yes | yes | yes |
| `ch6-last-camp` | 12 workouts · chapter 6 started |  | reads vela (ch4-vela) | yes | yes | yes |
| `finale` | story finished |  | reads why (first-letter), reads want (first-letter), reads forWho (first-letter), reads remind (first-letter), reads heart6 (ch6-heart), reads lia (ch2-lia), reads sol (ch3-sol), reads vela (ch4-vela), reads heart3 (ch3-knight-kneels) | yes | yes | yes |

## Any time

Scenes from `anytime.ts`: `workouts` count every workout, whatever the chapter.

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `sp-gift` | 3 workouts · has a class | sp |  | yes | yes | yes |
| `sp-awake` | SP trial done |  |  | yes | yes | yes |
| `sp-second` | boss 2 beaten · has a class | sp |  | yes | yes | yes |
| `sp-third` | boss 4 beaten · has a class | sp |  | yes | yes | yes |
| `sp-fourth` | boss 5 beaten · has a class | sp |  | yes | yes | yes |
| `first-better` | beat last time in 1 workout |  |  | yes | yes | yes |
| `good-steel` | boss 3 beaten · beat last time in 8 workouts |  |  | yes | yes | yes |
| `teach-me` | boss 3 beaten · beat last time in 4 workouts |  |  | yes | yes | yes |
| `smoky` | 4 days in a row |  |  | **no** | **no** | **no** |
| `heavy-days` | 6 workouts · last 3 workouts short |  |  | **no** | **no** | **no** |
| `return` | away 8+ days |  | reads remind (first-letter) | **no** | **no** | **no** |

## The Ember Road

Walked with friends (`road.ts`); no walk plays it.

| Scene | Plays when | Asks | Notes | planned | fast | alone |
| --- | --- | --- | --- | --- | --- | --- |
| `road-1-open` | Ember Road open 1 |  |  | **no** | **no** | **no** |
| `road-1-note` | Ember Road note 1 |  |  | **no** | **no** | **no** |
| `road-1-won` | Ember Road won 1 | road1 |  | **no** | **no** | **no** |
| `road-2-open` | Ember Road open 2 |  |  | **no** | **no** | **no** |
| `road-2-note` | Ember Road note 2 |  |  | **no** | **no** | **no** |
| `road-2-won` | Ember Road won 2 | road2 |  | **no** | **no** | **no** |
| `road-3-open` | Ember Road open 3 |  |  | **no** | **no** | **no** |
| `road-3-note` | Ember Road note 3 |  |  | **no** | **no** | **no** |
| `road-3-won` | Ember Road won 3 | road3 |  | **no** | **no** | **no** |
| `road-end` | Ember Road end |  |  | **no** | **no** | **no** |
