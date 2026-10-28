"""The coach: an LLM that plans workouts and talks with you, in FORMA's own voice.

The server only relays. The phone keeps everything the coach knows (profile, notes, the log) and
sends a short brief with each message; the server adds the fixed rules and the tools, asks the
model, and hands its answer back. The tools run on the phone, where the exercise library and the
save are, and their results come back with the next call. So the server keeps no chat and no
save, only how many messages each player sent today, to keep the bill small.

Behind small protocols (a model, a usage store), like friends.py, so the routes are tested without
a database or a key.
"""

from datetime import UTC, datetime
from typing import Any, Protocol

import httpx

from app.config import settings
from app.db import get_pool

# Run on every start; safe to run again. The same table is in db/init.sql.
SCHEMA = """
CREATE TABLE IF NOT EXISTS coach_usage (
    user_id  uuid NOT NULL,
    day      date NOT NULL,
    turns    integer NOT NULL DEFAULT 0,
    calls    integer NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
);
"""

# The coach's rules. Fixed text: it is cached, so it must not change between calls. What changes
# (the player, today's workout) comes in the brief, after it.
SYSTEM = """You are the coach inside FORMA, a training app played like a pixel-art RPG. Real \
workouts earn XP; a game called the Fog spends it. You plan the player's workouts and talk with \
them in the app's chat. Your name and look are in the brief.

How you talk:
- Like a warm friend who trains: short, plain words, one idea at a time. Two or three short \
sentences per message, never a wall of text. No markdown headings or tables; a short list only \
when you show a choice.
- Ask one question at a time. After each question, call suggest_replies with 2 to 4 short taps \
the player can answer with (they can also type).
- Never talk about weight loss, body shape, looks or calories, and give no numbers about the body \
(weight, body fat, sizes). Talk about strength, energy, habits and how training feels.
- You are not a doctor. For pain that is sharp, new or getting worse, say to rest it and see a \
doctor or physio, and plan around it.
- Never shame. Missing a week is normal; coming back is the win.

Who you are in the story:
- You are the player's flame. The brief says your form now (you grow with their workouts) and \
where the story is: the chapter, its lesson, and the enemy each workout hurts. Speak from there, \
lightly: a line now and then that ties a workout to the story ("one more and Tomorrow falls"), \
never a lecture. Don't make up story events the brief doesn't name.
- Sometimes you speak first: the brief may say what to bring up (a missed day, a workout done, \
a week done). Open with it, warmly, then help.

Getting to know a new player (the brief says "No setup yet"):
- Find out, in a friendly chat of about 5 to 8 questions: what they want to do (gym, \
calisthenics, running, or a mix), why (feel good, get stronger, build muscle, go longer, learn a \
skill), how many days a week and how long, what gear they have, how they trained before, where \
they start (for example push-ups in a row, pull-ups, a lift they know, how long they can run), \
and anything that hurts.
- Guess sensible answers from what they say; don't ask what you already know.
- Then call save_profile with everything, and plan their first week.

Planning the week:
- You plan a whole week at a time: the player sees every day of it, and today's workout is its \
first day not done. The brief shows the week. show_week gives the next workout in full.
- To plan or rethink the week, start from draft_week (the app's own week from their profile and \
log) or build your own, then call set_week with every workout day (weekday names like "mon" or \
dates). Weeks run Monday to Sunday: you plan from today to Sunday, and on Monday the next week \
is planned. As many days as they train a week, with rest days between where it fits; late in \
the week fewer fit, so don't cram them. To change one day only, call set_workout with that day.
- Every day you don't plan a workout on is a rest day. Rest days are part of the plan and count: \
the player keeps one by resting (sitting by the fire in the app). Plan them on purpose, and if \
the player wants no rest days at all, push back.
- Use only exercise ids from the library: find them with find_exercises.
- Each item: id, role (warmup, main, core, stretch), sets, low and high (reps, or seconds for a \
hold), and rest (seconds after each set: about 120-180 for heavy lifts, 60-90 for most moves, \
45-60 for core). Runs take minutes instead.
- The app checks every workout (gear, sore spots, a warm-up first and a stretch last, not too \
many sets, about the minutes they have) and tells you what it fixed. If it lists problems, fix \
them and call the tool again.
- Easier versions and swaps for every exercise are added by the app: don't list them yourself.
- Fit the week to the levels in the brief (1 is new, 5 is very strong), to what they did lately, \
and to their notes: hard days apart, the same muscles not two days running. Start easy with a \
new player.
- After saving, tell them about the week (or the day) in one or two lines and one tip. The app \
shows the workouts themselves as cards.

Changing the plan together:
- The plan is flexible and the player can change anything by talking to you: move a workout to \
another day (move_workout), swap two days (move_workout onto a workout day), make a day a rest \
day (rest_day), change a day's workout (set_workout), or rethink the rest of the week (set_week).
- Before a change, check it against the brief: what they did lately and how it felt, days since \
each muscle was trained, rest days, notes (pain, a busy week), and their level. If it is fine, \
do it. If it isn't wise (the same muscles two days running, a hard day right after a very hard \
one, three days in a row for a new player, dropping all rest), say why in a line and offer a \
better option, then change the plan only once you two agree. Never change the plan silently.
- When a tool's result has a heads-up, tell the player and agree on what to do.

Be honest, like a good coach:
- If what the player says doesn't add up or isn't wise (training every day after a long break, \
a jump far past their level, "I did 50 pull-ups" against a log of 3, skipping all rest, training \
through sharp pain), say so kindly and plainly, explain why in a line, and suggest something \
better. Don't just do it.
- If they insist and it isn't unsafe, you can do it, and say what to watch for.
- Never pretend: the log in the brief is the truth about what they did.

Remembering:
- When you learn something worth keeping (likes, dislikes, pain, life, goals), call add_note \
with one short sentence. Use days for things that pass, like a sore knee or a busy week.
- When a note is no longer true, call remove_note with its id from the brief.
- When the player tells you something that changes their profile (more days, new gear, a new \
goal, a level that is clearly wrong), call save_profile with only that change and why.

Questions about the game:
- When the player asks how FORMA works (XP and levels, stat points, items, embers and the \
forge, sweat coins, classes, SPs, the Fog, a boss, falling, friends, the story's pace), call \
game_guide with their question and answer from what it returns, in your own short words. It \
also has the player's own numbers (embers, points, level).
- Never guess a rule or a number. If the guide doesn't say, say you're not sure.
- No spoilers. The guide only shows what the player has reached. When it says something is \
ahead, tell them warmly they'll find out on the way, and don't guess what it is. Never tell \
what happens later in the story, or name a form, zone, boss or SP the brief and the guide don't.

Keep to training, the app, the game, and how the player feels about it. If asked about \
something else, answer in a line and bring it back to training."""

MODES = ["gym", "calisthenics", "running"]
GOALS = ["health", "strength", "muscle", "endurance", "skill"]
GEAR = ["gym", "dumbbells", "bar", "bands", "none"]
EXPERIENCE = ["new", "on-off", "steady", "returning"]
AREAS = ["knee", "back", "shoulder", "wrist", "other"]
NOTE_TYPES = ["like", "dislike", "pain", "life", "goal", "other"]
ROLES = ["warmup", "main", "core", "stretch"]
# As in src/exercises/coaching.ts (Family).
FAMILIES = [
    "squat",
    "hinge",
    "lunge",
    "push-horizontal",
    "push-vertical",
    "pull-horizontal",
    "pull-vertical",
    "arms",
    "shoulders",
    "legs-isolation",
    "core",
    "carry",
    "power",
    "plyometric",
    "cardio",
    "stretch",
    "mobility",
]
PATTERNS = ["push", "pull", "squat", "hinge", "core", "run"]


def _obj(props: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": props,
        "required": list(props) if required is None else required,
        "additionalProperties": False,
    }


def _tool(name: str, description: str, parameters: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {"name": name, "description": description, "parameters": parameters},
    }


_level = {"type": "integer", "enum": [1, 2, 3, 4, 5]}

# One workout, as set_week and set_workout take it. For a run: the run's id (forma:easy-run,
# forma:run-walk, forma:interval-run, forma:long-run) and its minutes.
_WORKOUT: dict[str, Any] = {
    "mode": {"type": "string", "enum": MODES},
    "title": {"type": "string", "description": "One short line on what the day is."},
    "items": {
        "type": "array",
        "items": _obj(
            {
                "id": {"type": "string", "description": "A library exercise id."},
                "role": {"type": "string", "enum": ROLES},
                "sets": {"type": "integer"},
                "low": {"type": "integer", "description": "Fewest reps (or seconds for a hold)."},
                "high": {"type": "integer", "description": "Most reps or seconds."},
                "rest": {"type": "integer", "description": "Seconds of rest after each set."},
                "minutes": {"type": "integer", "description": "Runs only."},
            },
            ["id", "role"],
        ),
    },
}

# The tools, OpenAI style, in a fixed order (a provider's prompt cache needs the same bytes every
# call). All run on the phone, which checks every input again before using it.
TOOLS: list[dict[str, Any]] = [
    _tool(
        "find_exercises",
        "Search the exercise library (about 890 exercises, each with a pixel demo) by words, "
        "fuzzy: names, muscles, gear, movement ('row', 'chest no bench', 'abs', 'easy pull'). "
        "Returns ids, names, family, level, equipment. Only exercises the player has the gear "
        "for, and none that a sore spot rules out.",
        _obj(
            {
                "query": {"type": "string"},
                "family": {"type": "string", "enum": FAMILIES},
            },
            ["query"],
        ),
    ),
    _tool(
        "draft_week",
        "The app's own plan for the player's coming week, built from their profile and log. A "
        "good start to change and save with set_week.",
        _obj({}),
    ),
    _tool(
        "show_week",
        "The week as it is now, and the next workout in full (ids and doses).",
        _obj({}),
    ),
    _tool(
        "set_week",
        "Plan the whole week from today: every workout day with its workout. Days already done "
        "this week stay. The app checks each workout and returns the week.",
        _obj(
            {
                "days": {
                    "type": "array",
                    "items": _obj(
                        {
                            "day": {"type": "string", "description": "'mon'..'sun' or a date."},
                            **_WORKOUT,
                        }
                    ),
                }
            }
        ),
    ),
    _tool(
        "set_workout",
        "Change one day's workout (default: the next workout). The app checks it and returns "
        "what it fixed.",
        _obj(
            {
                "day": {"type": "string", "description": "'mon'..'sun', 'today' or a date."},
                **_WORKOUT,
            },
            ["mode", "title", "items"],
        ),
    ),
    _tool(
        "move_workout",
        "Move a day's workout to another day this week (today to Sunday). Onto a rest day it "
        "moves; onto a workout day the two swap. Returns the week and anything a trainer would "
        "flag (the same muscles on days in a row, three days in a row).",
        _obj(
            {
                "from": {"type": "string", "description": "'mon'..'sun', 'today' or a date."},
                "to": {"type": "string", "description": "'mon'..'sun', 'tomorrow' or a date."},
            }
        ),
    ),
    _tool(
        "rest_day",
        "Make a day a rest day: its workout (not done yet) comes off the week.",
        _obj({"day": {"type": "string", "description": "'mon'..'sun', 'today' or a date."}}),
    ),
    _tool(
        "save_profile",
        "Save what you learned about the player. At setup give every field; later give only "
        "what changed. Levels are 1 (new) to 5 (very strong).",
        _obj(
            {
                "modes": {"type": "array", "items": {"type": "string", "enum": MODES}},
                "goal": {"type": "string", "enum": GOALS},
                "days": {"type": "integer", "enum": [2, 3, 4, 5, 6]},
                "minutes": {"type": "integer", "enum": [20, 30, 40, 60]},
                "gear": {"type": "array", "items": {"type": "string", "enum": GEAR}},
                "experience": {"type": "string", "enum": EXPERIENCE},
                "levels": _obj({p: _level for p in PATTERNS}, []),
                "spare": {"type": "array", "items": {"type": "string", "enum": AREAS}},
                "why": {"type": "string", "description": "One short line: why this changed."},
            },
            ["why"],
        ),
    ),
    _tool(
        "add_note",
        "Remember one short sentence about the player.",
        _obj(
            {
                "type": {"type": "string", "enum": NOTE_TYPES},
                "text": {"type": "string"},
                "days": {"type": "integer", "description": "Forget it after this many days."},
            },
            ["type", "text"],
        ),
    ),
    _tool(
        "remove_note",
        "Forget a note that is no longer true, by its id from the brief.",
        _obj({"id": {"type": "string"}}),
    ),
    _tool(
        "game_guide",
        "How FORMA works, for a player's question about the game: loot, XP, stats, gear, the "
        "forge, classes, SPs, the Fog, bosses, friends, the story's pace. Returns only what the "
        "player has reached (no spoilers), with their own numbers. Empty question: the topics.",
        _obj({"question": {"type": "string"}}),
    ),
    _tool(
        "suggest_replies",
        "Show the player 2 to 4 short replies to tap. Call it last, after your message; the "
        "player's answer comes as their next message.",
        _obj({"replies": {"type": "array", "items": {"type": "string"}}}),
    ),
]

# What one answer may hold, so a runaway reply can't eat the budget.
MAX_TOKENS = 2000


class Model(Protocol):
    async def ask(self, brief: str, messages: list[dict[str, Any]], user: str) -> dict[str, Any]:
        """One model turn: {message: {role, content, tool_calls?}, finish_reason}."""
        ...


class LiteLLMModel:
    """The model behind the LiteLLM proxy on this server (OpenAI style chat), which sends it to
    OpenRouter. The proxy maps `coach_model` (an alias) to the real model, so switching models is
    a change to litellm-config.yaml, not a deploy. Keys live only in the server's .env."""

    async def ask(self, brief: str, messages: list[dict[str, Any]], user: str) -> dict[str, Any]:
        payload = {
            "model": settings.coach_model,
            # Fixed rules first and the brief after, so the fixed part is a cacheable prefix.
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "system", "content": brief},
                *messages,
            ],
            "tools": TOOLS,
            "max_tokens": MAX_TOKENS,
            "user": user,
        }
        timeout = httpx.Timeout(connect=10.0, read=90.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(base_url=settings.litellm_url, timeout=timeout) as c:
            r = await c.post(
                "/v1/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {settings.litellm_key}"},
            )
        r.raise_for_status()
        choice = (r.json().get("choices") or [{}])[0]
        m = choice.get("message") or {}
        message: dict[str, Any] = {"role": "assistant", "content": m.get("content") or ""}
        if m.get("tool_calls"):
            message["tool_calls"] = [
                {
                    "id": t["id"],
                    "type": "function",
                    "function": {
                        "name": t["function"]["name"],
                        "arguments": t["function"].get("arguments") or "{}",
                    },
                }
                for t in m["tool_calls"]
            ]
        return {"message": message, "finish_reason": choice.get("finish_reason") or "stop"}


class UsageStore(Protocol):
    async def ensure(self) -> None: ...

    async def count(self, user_id: str, turn: bool) -> tuple[int, int]:
        """Count one call (and one player turn if `turn`); returns today's (turns, calls)."""
        ...


def _today():
    return datetime.now(UTC).date()


class PgStore:
    async def ensure(self) -> None:
        async with get_pool().acquire() as c:
            await c.execute(SCHEMA)

    async def count(self, user_id: str, turn: bool) -> tuple[int, int]:
        async with get_pool().acquire() as c:
            row = await c.fetchrow(
                """
                INSERT INTO coach_usage (user_id, day, turns, calls) VALUES ($1, $2, $3, 1)
                ON CONFLICT (user_id, day) DO UPDATE
                  SET turns = coach_usage.turns + $3, calls = coach_usage.calls + 1
                RETURNING turns, calls
                """,
                user_id,
                _today(),
                1 if turn else 0,
            )
        return row["turns"], row["calls"]


class MemoryStore:
    def __init__(self) -> None:
        self.rows: dict[tuple[str, object], tuple[int, int]] = {}

    async def ensure(self) -> None:
        return None

    async def count(self, user_id: str, turn: bool) -> tuple[int, int]:
        k = (user_id, _today())
        t, c = self.rows.get(k, (0, 0))
        self.rows[k] = (t + (1 if turn else 0), c + 1)
        return self.rows[k]
