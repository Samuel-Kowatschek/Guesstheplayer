# HOOPDLE

A Wordle-style NBA player guessing game with an 8-bit handheld look.
Guess the secret NBA player in **8 tries**. Every guess shows how close you are across six attributes.

Fully static (Vite + vanilla TypeScript): no backend, no live API calls in the browser.

## Web app (mobile + desktop)

HOOPDLE is a Progressive Web App:

- **Mobile first**: tested from 320px (iPhone SE) up to tablets, portrait and landscape, with no horizontal scrolling. Touch targets are at least 40px, there are no sticky hover states on touch screens, it respects notches and the home indicator (`viewport-fit=cover` + safe-area insets), and the guess field scrolls up so the on-screen keyboard does not cover the suggestions.
- **Installable**: "Add to Home Screen" on iOS/Android, or the install button in desktop Chrome/Edge. It then runs full screen in its own window (`manifest.webmanifest`, icons in `public/icons/`).
- **Offline**: a small service worker (`public/sw.js`, production builds only) caches the app shell, font and data. Pages and `data/*.json` load network first, so new deployments and data refreshes show up as soon as you are online.
- **Desktop**: wider board, full country names, mouse hover states, and you can start typing anywhere to jump into the guess field.

## How to play

Type at least two letters of a player's name, pick a player from the list and submit.
Each guess becomes a row of six tiles:

| Tile     | GREEN (check mark) | YELLOW (tilde)               | DARK (no symbol)                                |
| -------- | ------------------ | ---------------------------- | ----------------------------------------------- |
| **TEAM** | same team          | same division                | otherwise (the small text shows the conference) |
| **POS**  | same position      | shares a position (G vs G-F) | otherwise                                       |
| **HT**   | same height        | within 2 inches              | otherwise                                       |
| **AGE**  | same age           | within 2 years               | otherwise                                       |
| **NO.**  | same jersey        | within 3 (also `0` vs `00`)  | otherwise                                       |
| **NAT**  | same country       | same continent               | otherwise                                       |

On numeric tiles (HT, AGE, NO.) a pixel arrow shows whether the **secret** value is higher (up) or lower (down).

### Modes

- **DAILY**: the same player for everyone on a given local date. Progress survives reloads. Stats (played, win %, streak, max streak, guess distribution) are tracked for daily games only.
- **FREE PLAY**: random player, unlimited rounds, "NEW GAME" button.

When a game ends, a dialog shows the player and a **SHARE** button that copies a spoiler-free grid:

```
HOOPDLE #9 3/8

⬛🟩🟨⬛⬛🟨
⬛🟩🟩⬛⬛🟨
🟩🟩🟩🟩🟩🟩
```

## Run locally

Requirements: Node 20+ (22 recommended).

```bash
npm install
```

```bash
npm run dev
```

| Script              | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                        |
| `npm run build`     | Type check + production build into `dist/`        |
| `npm run preview`   | Serve the production build                        |
| `npm test`          | Vitest unit tests for the game logic              |
| `npm run lint`      | ESLint + Prettier check (`npm run format` to fix) |
| `npm run data`      | Refresh `public/data/players.json` (see below)    |
| `npm run data:test` | Offline unit tests for the Python data script     |

## Player data

The browser loads `public/data/players.json`. If that file is missing, it falls back to
`public/data/players.sample.json` (39 hand-made players, one or more per team) and logs a warning in the console.
The footer then shows `DATA: SEASON ... (SAMPLE)`.

### Refreshing the data

`scripts/fetch_players.py` uses [`nba_api`](https://github.com/swar/nba_api) to build `players.json`.
**Run it locally.** stats.nba.com blocks most cloud, VPN and CI IP ranges, so it is deliberately not part of any GitHub Actions workflow.

```bash
python3 -m venv .venv
```

```bash
.venv/bin/pip install -r scripts/requirements.txt
```

```bash
npm run data
```

(On Windows: `.venv\Scripts\pip install -r scripts\requirements.txt`. `npm run data` picks up the venv automatically.)

Then commit `public/data/players.json`.

CLI flags (`python scripts/fetch_players.py --help`):

| Flag                   | Default                                                     | Meaning                                                                           |
| ---------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--season 2025-26`     | current season from today's date (seasons start in October) | season to fetch                                                                   |
| `--out PATH`           | `public/data/players.json`                                  | output file                                                                       |
| `--sleep 1.0`          | 1 s                                                         | pause between API calls                                                           |
| `--timeout 30`         | 30 s                                                        | HTTP timeout per call                                                             |
| `--retries 4`          | 4                                                           | attempts per call (exponential backoff 2, 4, 8 s)                                 |
| `--min-players 300`    | 300                                                         | if the auto-detected season has fewer roster players, the previous season is used |
| `--max-player-info 80` | 80                                                          | max `CommonPlayerInfo` calls to fill in missing countries                         |
| `--strict`             | off                                                         | fail if a country has no continent mapping                                        |

Pipeline:

1. `stats.static.teams.get_teams()` for the 30 teams.
2. `stats.endpoints.CommonTeamRoster` per team: jersey (`NUM`), `POSITION`, `HEIGHT`, `BIRTH_DATE`.
3. `stats.endpoints.leaguedashplayerbiostats.LeagueDashPlayerBioStats`: `COUNTRY` (plus height cross-check), merged on `PLAYER_ID`.
   Early in a season this endpoint only lists players who already played, so missing players are filled from the previous season and, as a last resort, from `CommonPlayerInfo`.
4. Hardcoded maps: team -> conference + division, country -> continent. Unmapped countries are reported; add them to `COUNTRY_CONTINENT` in the script.
5. Validation (duplicates, required fields, ranges) and a summary with players per team and every dropped player with the reason.

Players with any missing attribute (e.g. no jersey number yet) are dropped completely, so every player in the file can be both a guess and a secret.

Output (one player per line for readable diffs):

```json
{
  "season": "2026-27",
  "generatedAt": "2026-11-09T12:00:00+00:00",
  "players": [
    {
      "id": 203999,
      "name": "Nikola Jokić",
      "teamId": 1610612743,
      "teamAbbr": "DEN",
      "teamName": "Denver Nuggets",
      "conference": "West",
      "division": "Northwest",
      "position": "C",
      "heightInches": 83,
      "birthDate": "1995-02-19",
      "age": 31,
      "jersey": "15",
      "country": "Serbia",
      "continent": "Europe"
    }
  ]
}
```

`age` is stored for convenience, but the game computes the age from `birthDate` at runtime so it never goes stale.

## Tuning

All thresholds and timings live in [`src/config.ts`](src/config.ts):

- `maxGuesses` (8)
- `thresholds.heightInches` (2), `thresholds.ageYears` (2), `thresholds.jersey` (3), all inclusive
- `autocomplete.minChars` (2), `autocomplete.maxSuggestions` (8)
- `animation.*` reveal / flip / typewriter speeds
- `dailyEpoch` (day #1) and `dailySalt` (change it to reshuffle all daily players)

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` runs lint, tests and the Vite build on every push to `main` and publishes `dist/` to GitHub Pages.
The Vite `base` is set from the repository name (`BASE_PATH=/<repo>/`), so the site works at `https://<user>.github.io/<repo>/`.

One-time setup: in the repository go to **Settings -> Pages -> Build and deployment -> Source** and choose **GitHub Actions**.

`.github/workflows/ci.yml` runs the same checks plus the offline Python tests on pull requests and other branches.

## Project structure

```
src/
  config.ts          tunable constants
  game/              pure, framework-free logic (unit tested)
    compare.ts       the six attribute comparators
    daily.ts         date key, day number, deterministic daily pick
    search.ts        accent/case-insensitive name search
    share.ts         spoiler-free share text
    stats.ts         stats + streak logic
    session.ts       game state transitions
    a11y.ts          screen reader descriptions of a guess
  ui/                DOM components (autocomplete, grid, dialogue box, modal, pixel sprites)
  app.ts             screens and game flow
  data.ts            loads players.json with sample fallback
  sound.ts           WebAudio chiptune effects
scripts/
  fetch_players.py   data pipeline (run locally)
  test_fetch_players.py
public/data/         players.json (generated) and players.sample.json
public/sw.js         service worker (offline + install)
public/manifest.webmanifest, public/icons/   PWA manifest and app icons
tests/               Vitest tests
```

## Design notes and decisions

- **Look**: inspired by early handheld RPG menus, with all art drawn by hand as inline SVG pixel sprites (ball, arrows, cursor, speaker, silhouette). No logos, sprites or other third-party assets. Font: "Press Start 2P", self-hosted via `@fontsource/press-start-2p`.
- **Themes**: classic 4-shade green (default) and a brighter colour palette (palette button in the top bar, remembered in localStorage).
- **Colour blindness**: besides colour, green tiles carry a check mark and yellow tiles a tilde; the three states also differ clearly in lightness.
- **Rows**: the newest guess is always on top.
- **Headshots** (`cdn.nba.com`) are only shown in the end dialog, drawn into a 52x38 canvas and scaled up for a pixel look. If the image fails to load, a pixel silhouette is shown.
- **Sound**: muted by default; the audio context is only created after the speaker toggle is clicked.
- **Reduced motion**: with `prefers-reduced-motion`, flips, bounce, blink and the typewriter effect are turned off.
- **Accessibility**: ARIA combobox for the input, a live region announcing every guess in plain text (e.g. "Team LAL: wrong, same division. Height 6 feet 9: higher."), native `<dialog>` modals, visible pixel focus outlines, everything keyboard operable.
- **Daily puzzle**: `cyrb53(dailySalt + ":" + YYYY-MM-DD) mod n` over the ascending player-id list, using the player's local date. The chosen secret is saved with the day's progress, so refreshing the data file mid-day does not change a game in progress. Different data files (sample vs full) give different daily players.
- **Jersey numbers** are strings so `0` and `00` stay distinct; they count as yellow without an arrow.
- **Israel** is mapped to Europe (it competes in European basketball).
- **Sample data** is hand-made for development and may not reflect current rosters.

Fan project. Not affiliated with or endorsed by the NBA or any team. Player data comes from stats.nba.com via nba_api.
