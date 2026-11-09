#!/usr/bin/env python3
"""Build public/data/players.json for HOOPDLE from stats.nba.com via nba_api.

Run this LOCALLY (stats.nba.com blocks most cloud / CI IP ranges):

    python -m venv .venv
    .venv/bin/pip install -r scripts/requirements.txt
    .venv/bin/python scripts/fetch_players.py            # current season
    .venv/bin/python scripts/fetch_players.py --season 2025-26 --out /tmp/players.json

Pipeline:
  1. nba_api.stats.static.teams.get_teams()            -> 30 teams
  2. CommonTeamRoster (per team)                       -> jersey, position, height, birth date
  3. LeagueDashPlayerBioStats (whole league)           -> country (+ height cross-check)
     Early in a season this only lists players who already played, so the
     previous season's bio stats and, as a last resort, CommonPlayerInfo fill gaps.
  4. Hardcoded team -> conference/division and country -> continent mappings.
  5. Validation + summary, then the JSON is written.

The network part (fetch_*) is separate from the pure merge/validation part
(build_players, validate), which is unit tested with mocked data in
scripts/test_fetch_players.py.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterable, TypeVar

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "public" / "data" / "players.json"

# --------------------------------------------------------------------------
# Static mappings
# --------------------------------------------------------------------------

# Team abbreviation -> (conference, division)
TEAM_META: dict[str, tuple[str, str]] = {
    "BOS": ("East", "Atlantic"),
    "BKN": ("East", "Atlantic"),
    "NYK": ("East", "Atlantic"),
    "PHI": ("East", "Atlantic"),
    "TOR": ("East", "Atlantic"),
    "CHI": ("East", "Central"),
    "CLE": ("East", "Central"),
    "DET": ("East", "Central"),
    "IND": ("East", "Central"),
    "MIL": ("East", "Central"),
    "ATL": ("East", "Southeast"),
    "CHA": ("East", "Southeast"),
    "MIA": ("East", "Southeast"),
    "ORL": ("East", "Southeast"),
    "WAS": ("East", "Southeast"),
    "DEN": ("West", "Northwest"),
    "MIN": ("West", "Northwest"),
    "OKC": ("West", "Northwest"),
    "POR": ("West", "Northwest"),
    "UTA": ("West", "Northwest"),
    "GSW": ("West", "Pacific"),
    "LAC": ("West", "Pacific"),
    "LAL": ("West", "Pacific"),
    "PHX": ("West", "Pacific"),
    "SAC": ("West", "Pacific"),
    "DAL": ("West", "Southwest"),
    "HOU": ("West", "Southwest"),
    "MEM": ("West", "Southwest"),
    "NOP": ("West", "Southwest"),
    "SAS": ("West", "Southwest"),
}

NA, SA, EU, AF, AS, OC = (
    "North America",
    "South America",
    "Europe",
    "Africa",
    "Asia",
    "Oceania",
)

# Country (as spelled by stats.nba.com) -> continent.
# Unmapped countries are reported and the player is dropped (or the script
# fails with --strict). Add new spellings here when warnings appear.
COUNTRY_CONTINENT: dict[str, str] = {
    # North America (incl. Central America & Caribbean)
    "USA": NA, "United States": NA, "Canada": NA, "Mexico": NA, "Puerto Rico": NA,
    "Dominican Republic": NA, "Bahamas": NA, "The Bahamas": NA, "Jamaica": NA,
    "Haiti": NA, "Cuba": NA, "Panama": NA, "Saint Lucia": NA, "St. Lucia": NA,
    "Trinidad and Tobago": NA, "U.S. Virgin Islands": NA, "US Virgin Islands": NA,
    "Virgin Islands": NA, "Guadeloupe": NA, "Martinique": NA, "Belize": NA,
    "Honduras": NA, "Costa Rica": NA, "Barbados": NA,
    # South America
    "Brazil": SA, "Argentina": SA, "Venezuela": SA, "Uruguay": SA, "Colombia": SA,
    "Chile": SA, "Paraguay": SA, "Peru": SA, "Ecuador": SA, "French Guiana": SA,
    # Europe
    "France": EU, "Serbia": EU, "Slovenia": EU, "Greece": EU, "Germany": EU,
    "Spain": EU, "Italy": EU, "Croatia": EU, "Lithuania": EU, "Latvia": EU,
    "Estonia": EU, "Montenegro": EU, "Bosnia and Herzegovina": EU, "Bosnia": EU,
    "North Macedonia": EU, "Macedonia": EU, "Turkey": EU, "Turkiye": EU, "Türkiye": EU,
    "Finland": EU, "Sweden": EU, "Norway": EU, "Denmark": EU, "Iceland": EU,
    "Austria": EU, "Switzerland": EU, "Czech Republic": EU, "Czechia": EU,
    "Slovakia": EU, "Poland": EU, "Hungary": EU, "Romania": EU, "Bulgaria": EU,
    "Ukraine": EU, "Russia": EU, "Belarus": EU, "Georgia": EU, "Netherlands": EU,
    "Belgium": EU, "Luxembourg": EU, "Portugal": EU, "United Kingdom": EU,
    "Great Britain": EU, "England": EU, "Scotland": EU, "Ireland": EU, "Israel": EU,
    "Albania": EU, "Kosovo": EU, "Cyprus": EU, "Malta": EU,
    # Africa
    "Cameroon": AF, "Nigeria": AF, "Senegal": AF, "South Sudan": AF, "Sudan": AF,
    "DRC": AF, "Democratic Republic of the Congo": AF, "Congo": AF,
    "Republic of the Congo": AF, "Mali": AF, "Guinea": AF, "Angola": AF, "Egypt": AF,
    "Gabon": AF, "Cape Verde": AF, "Cabo Verde": AF, "Ghana": AF, "Tanzania": AF,
    "Uganda": AF, "Kenya": AF, "Morocco": AF, "Tunisia": AF, "South Africa": AF,
    "Central African Republic": AF, "Ivory Coast": AF, "Cote d'Ivoire": AF,
    "Côte d'Ivoire": AF, "Benin": AF, "Burkina Faso": AF, "Chad": AF, "Ethiopia": AF,
    "Rwanda": AF, "Zimbabwe": AF, "Algeria": AF, "Libya": AF,
    # Asia
    "Japan": AS, "China": AS, "Philippines": AS, "South Korea": AS, "Korea": AS,
    "Lebanon": AS, "Iran": AS, "Taiwan": AS, "Chinese Taipei": AS, "India": AS,
    "Jordan": AS, "Qatar": AS, "Indonesia": AS, "Kazakhstan": AS,
    # Oceania
    "Australia": OC, "New Zealand": OC, "Fiji": OC, "Guam": OC, "Samoa": OC,
}  # fmt: skip

# Raw POSITION strings -> canonical G, F, C, G-F, F-C
POSITION_MAP: dict[str, str] = {
    "G": "G", "PG": "G", "SG": "G", "GUARD": "G",
    "F": "F", "SF": "F", "PF": "F", "FORWARD": "F",
    "C": "C", "CENTER": "C",
    "G-F": "G-F", "F-G": "G-F", "GUARD-FORWARD": "G-F", "FORWARD-GUARD": "G-F",
    "F-C": "F-C", "C-F": "F-C", "FORWARD-CENTER": "F-C", "CENTER-FORWARD": "F-C",
}  # fmt: skip

REQUIRED_FIELDS = (
    "id", "name", "teamId", "teamAbbr", "teamName", "conference", "division",
    "position", "heightInches", "birthDate", "age", "jersey", "country", "continent",
)  # fmt: skip

# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def season_for(today: date) -> str:
    """NBA seasons start in October: 2026-11-09 -> '2026-27', 2026-05-01 -> '2025-26'."""
    start = today.year if today.month >= 10 else today.year - 1
    return f"{start}-{(start + 1) % 100:02d}"


def previous_season(season: str) -> str:
    start = int(season[:4]) - 1
    return f"{start}-{(start + 1) % 100:02d}"


def parse_height(value: Any) -> int | None:
    """'6-9' -> 81, '7-0' -> 84. Returns None for empty/invalid values."""
    if value is None:
        return None
    text = str(value).strip()
    if "-" in text:
        feet, _, inches = text.partition("-")
        if feet.isdigit() and inches.isdigit():
            return int(feet) * 12 + int(inches)
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    return int(round(number)) if number > 0 else None


_DATE_FORMATS = ("%b %d, %Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%m/%d/%Y")


def parse_birth_date(value: Any) -> date | None:
    """Accepts 'MAR 12, 1999', '1999-03-12T00:00:00', '1999-03-12'."""
    if not value:
        return None
    text = str(value).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text.title() if "%b" in fmt else text, fmt).date()
        except ValueError:
            continue
    return None


def age_on(birth: date, today: date) -> int:
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))


def parse_jersey(value: Any) -> str | None:
    """Keeps '0' and '00' distinct. Returns None for empty / non-numeric jerseys."""
    if value is None:
        return None
    text = str(value).strip()
    return text if text.isdigit() and len(text) <= 2 else None


def normalize_position(value: Any) -> str | None:
    if not value:
        return None
    return POSITION_MAP.get(str(value).strip().upper().replace(" ", ""))


def clean_country(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


# --------------------------------------------------------------------------
# Pure merge + validation (unit tested)
# --------------------------------------------------------------------------


@dataclass
class BuildResult:
    players: list[dict[str, Any]]
    dropped: list[tuple[str, str]] = field(default_factory=list)  # (name, reason)
    warnings: list[str] = field(default_factory=list)
    unmapped_countries: Counter[str] = field(default_factory=Counter)


def build_players(
    teams: Iterable[dict[str, Any]],
    rosters: dict[int, list[dict[str, Any]]],
    bios: dict[int, dict[str, Any]],
    today: date,
) -> BuildResult:
    """Merge roster rows with bio rows (on PLAYER_ID) into the output schema.

    teams:   rows from nba_api.stats.static.teams.get_teams()
    rosters: team_id -> CommonTeamRoster rows
    bios:    player_id -> merged bio row (needs COUNTRY; PLAYER_HEIGHT_INCHES optional)
    """
    result = BuildResult(players=[])
    seen: set[int] = set()

    for team in teams:
        abbr = team["abbreviation"]
        meta = TEAM_META.get(abbr)
        if meta is None:
            result.warnings.append(f"No conference/division for team {abbr}; team skipped")
            continue
        conference, division = meta

        for row in rosters.get(team["id"], []):
            pid = int(row["PLAYER_ID"])
            name = str(row.get("PLAYER") or "").strip()

            def drop(reason: str) -> None:
                result.dropped.append((name or f"#{pid}", reason))

            if pid in seen:
                result.warnings.append(f"{name} ({pid}) appears on more than one roster")
                continue
            if not name:
                drop("missing name")
                continue

            jersey = parse_jersey(row.get("NUM"))
            position = normalize_position(row.get("POSITION"))
            birth = parse_birth_date(row.get("BIRTH_DATE"))
            bio = bios.get(pid, {})
            height = parse_height(row.get("HEIGHT"))
            bio_height = parse_height(bio.get("PLAYER_HEIGHT_INCHES"))
            if height is None:
                height = bio_height
            elif bio_height is not None and abs(height - bio_height) > 1:
                result.warnings.append(
                    f"{name}: roster height {height} vs bio height {bio_height}, using roster"
                )
            country = clean_country(bio.get("COUNTRY"))

            if jersey is None:
                drop(f"no jersey number ({row.get('NUM')!r})")
                continue
            if position is None:
                drop(f"unknown position ({row.get('POSITION')!r})")
                continue
            if height is None:
                drop(f"no height ({row.get('HEIGHT')!r})")
                continue
            if birth is None:
                drop(f"no birth date ({row.get('BIRTH_DATE')!r})")
                continue
            if country is None:
                drop("no country")
                continue
            continent = COUNTRY_CONTINENT.get(country)
            if continent is None:
                result.unmapped_countries[country] += 1
                drop(f"unmapped country {country!r}")
                continue

            seen.add(pid)
            result.players.append(
                {
                    "id": pid,
                    "name": name,
                    "teamId": int(team["id"]),
                    "teamAbbr": abbr,
                    "teamName": team["full_name"],
                    "conference": conference,
                    "division": division,
                    "position": position,
                    "heightInches": height,
                    "birthDate": birth.isoformat(),
                    "age": age_on(birth, today),
                    "jersey": jersey,
                    "country": country,
                    "continent": continent,
                }
            )

    result.players.sort(key=lambda p: (p["name"], p["id"]))
    return result


def validate(players: list[dict[str, Any]], today: date) -> list[str]:
    """Return a list of problems (empty list = valid)."""
    errors: list[str] = []
    ids = Counter(p.get("id") for p in players)
    errors += [f"duplicate id {pid}" for pid, n in ids.items() if n > 1]
    names = Counter(p.get("name") for p in players)
    errors += [f"duplicate name {name!r}" for name, n in names.items() if n > 1]

    for p in players:
        label = p.get("name", p.get("id"))
        missing = [f for f in REQUIRED_FIELDS if p.get(f) in (None, "")]
        if missing:
            errors.append(f"{label}: missing {', '.join(missing)}")
            continue
        if not 66 <= p["heightInches"] <= 92:
            errors.append(f"{label}: height {p['heightInches']} out of range")
        if not 17 <= p["age"] <= 45:
            errors.append(f"{label}: age {p['age']} out of range")
        if not 0 <= int(p["jersey"]) <= 99:
            errors.append(f"{label}: jersey {p['jersey']} out of range")
        if p["position"] not in {"G", "F", "C", "G-F", "F-C"}:
            errors.append(f"{label}: position {p['position']!r} invalid")
        if p["conference"] not in {"East", "West"}:
            errors.append(f"{label}: conference {p['conference']!r} invalid")
        try:
            if date.fromisoformat(p["birthDate"]) >= today:
                errors.append(f"{label}: birth date in the future")
        except ValueError:
            errors.append(f"{label}: invalid birth date {p['birthDate']!r}")
    return errors


def to_json(players: list[dict[str, Any]], season: str, generated_at: str) -> str:
    """One player per line: small file, readable git diffs."""
    lines = [json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in players]
    body = ",\n    ".join(lines)
    return (
        "{\n"
        f'  "season": {json.dumps(season)},\n'
        f'  "generatedAt": {json.dumps(generated_at)},\n'
        f'  "players": [\n    {body}\n  ]\n'
        "}\n"
    )


def print_summary(result: BuildResult, season: str) -> None:
    log("")
    log(f"=== Summary for {season} ===")
    per_team = Counter(p["teamAbbr"] for p in result.players)
    for abbr in sorted(TEAM_META):
        log(f"  {abbr}: {per_team.get(abbr, 0):>2} players")
    log(f"  TOTAL: {len(result.players)} players")
    if result.dropped:
        log(f"\nDropped {len(result.dropped)} players:")
        for name, reason in result.dropped:
            log(f"  - {name}: {reason}")
    if result.unmapped_countries:
        log("\nUnmapped countries (add them to COUNTRY_CONTINENT):")
        for country, n in result.unmapped_countries.most_common():
            log(f"  - {country!r} ({n} players)")
    if result.warnings:
        log(f"\n{len(result.warnings)} warnings:")
        for w in result.warnings:
            log(f"  ! {w}")


# --------------------------------------------------------------------------
# Network (nba_api)
# --------------------------------------------------------------------------

T = TypeVar("T")


@dataclass
class Fetcher:
    sleep: float = 1.0
    timeout: int = 30
    retries: int = 4

    def call(self, desc: str, fn: Callable[[], T]) -> T:
        """Call fn with retries + exponential backoff and a polite pause afterwards."""
        delay = 2.0
        for attempt in range(1, self.retries + 1):
            try:
                value = fn()
                time.sleep(self.sleep)
                return value
            except Exception as exc:  # noqa: BLE001 - nba_api raises many types
                if attempt == self.retries:
                    raise RuntimeError(f"{desc} failed after {attempt} attempts: {exc}") from exc
                log(f"    {desc}: {type(exc).__name__}: {exc} - retry {attempt} in {delay:.0f}s")
                time.sleep(delay)
                delay *= 2
        raise AssertionError("unreachable")

    def teams(self) -> list[dict[str, Any]]:
        from nba_api.stats.static import teams

        return sorted(teams.get_teams(), key=lambda t: t["abbreviation"])

    def roster(self, team_id: int, season: str) -> list[dict[str, Any]]:
        from nba_api.stats.endpoints import commonteamroster

        endpoint = self.call(
            f"CommonTeamRoster {team_id}",
            lambda: commonteamroster.CommonTeamRoster(
                team_id=team_id, season=season, timeout=self.timeout
            ),
        )
        return endpoint.get_normalized_dict()["CommonTeamRoster"]

    def bio_stats(self, season: str) -> dict[int, dict[str, Any]]:
        from nba_api.stats.endpoints import leaguedashplayerbiostats

        endpoint = self.call(
            f"LeagueDashPlayerBioStats {season}",
            lambda: leaguedashplayerbiostats.LeagueDashPlayerBioStats(
                season=season, timeout=self.timeout
            ),
        )
        rows = endpoint.get_normalized_dict()["LeagueDashPlayerBioStats"]
        return {int(r["PLAYER_ID"]): r for r in rows}

    def player_info(self, player_id: int) -> dict[str, Any] | None:
        from nba_api.stats.endpoints import commonplayerinfo

        endpoint = self.call(
            f"CommonPlayerInfo {player_id}",
            lambda: commonplayerinfo.CommonPlayerInfo(player_id=player_id, timeout=self.timeout),
        )
        rows = endpoint.get_normalized_dict()["CommonPlayerInfo"]
        return rows[0] if rows else None


def fetch_rosters(
    fetcher: Fetcher, teams: list[dict[str, Any]], season: str
) -> dict[int, list[dict[str, Any]]]:
    rosters: dict[int, list[dict[str, Any]]] = {}
    for i, team in enumerate(teams, 1):
        rows = fetcher.roster(team["id"], season)
        rosters[team["id"]] = rows
        log(f"  [{i:>2}/{len(teams)}] {team['abbreviation']}: {len(rows)} players")
    return rosters


def fetch_bios(
    fetcher: Fetcher, season: str, player_ids: set[int], max_player_info: int
) -> dict[int, dict[str, Any]]:
    """Bio stats for the season, then fill gaps (rookies, no games yet)."""
    log(f"Fetching LeagueDashPlayerBioStats {season} ...")
    bios = fetcher.bio_stats(season)
    log(f"  {len(bios)} rows")

    missing = player_ids - bios.keys()
    if missing:
        prev = previous_season(season)
        log(f"{len(missing)} players without bio row, trying {prev} ...")
        try:
            older = fetcher.bio_stats(prev)
            for pid in missing & older.keys():
                bios[pid] = older[pid]
        except RuntimeError as exc:
            log(f"  {exc}")

    missing = sorted(player_ids - bios.keys())
    if missing:
        todo = missing[:max_player_info]
        log(f"{len(missing)} still missing, CommonPlayerInfo for {len(todo)} of them ...")
        for i, pid in enumerate(todo, 1):
            try:
                info = fetcher.player_info(pid)
            except RuntimeError as exc:
                log(f"  {exc}")
                continue
            if info:
                bios[pid] = {"PLAYER_ID": pid, "COUNTRY": info.get("COUNTRY")}
            log(f"  [{i}/{len(todo)}] {pid}: {info.get('COUNTRY') if info else '-'}")
    return bios


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--season", help="Season like 2025-26 (default: current season)")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output JSON path")
    parser.add_argument("--sleep", type=float, default=1.0, help="Pause between API calls (s)")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout per call (s)")
    parser.add_argument("--retries", type=int, default=4, help="Attempts per API call")
    parser.add_argument(
        "--min-players",
        type=int,
        default=300,
        help="If the auto-detected season has fewer roster players, use the previous one",
    )
    parser.add_argument(
        "--max-player-info",
        type=int,
        default=80,
        help="Max CommonPlayerInfo calls to fill missing countries",
    )
    parser.add_argument(
        "--strict", action="store_true", help="Exit non-zero on unmapped countries"
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    today = date.today()
    fetcher = Fetcher(sleep=args.sleep, timeout=args.timeout, retries=args.retries)

    try:
        teams = fetcher.teams()
    except ImportError:
        log("nba_api is not installed. Run: pip install -r scripts/requirements.txt")
        return 2
    log(f"{len(teams)} teams loaded")

    season = args.season or season_for(today)
    log(f"Fetching rosters for {season} ...")
    rosters = fetch_rosters(fetcher, teams, season)
    total = sum(len(r) for r in rosters.values())
    if not args.season and total < args.min_players:
        prev = previous_season(season)
        log(f"Only {total} roster players in {season}, falling back to {prev}")
        season = prev
        rosters = fetch_rosters(fetcher, teams, season)

    player_ids = {int(r["PLAYER_ID"]) for rows in rosters.values() for r in rows}
    bios = fetch_bios(fetcher, season, player_ids, args.max_player_info)

    result = build_players(teams, rosters, bios, today)
    print_summary(result, season)

    errors = validate(result.players, today)
    if errors:
        log(f"\nValidation FAILED ({len(errors)} problems):")
        for e in errors:
            log(f"  x {e}")
        return 1
    if args.strict and result.unmapped_countries:
        log("\n--strict: unmapped countries found, not writing output")
        return 1
    if len(result.players) < 100:
        log(f"\nOnly {len(result.players)} players - refusing to overwrite {args.out}")
        return 1

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(to_json(result.players, season, generated_at), encoding="utf-8")
    log(f"\nWrote {len(result.players)} players to {args.out}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as exc:
        log(f"\nERROR: {exc}")
        log(
            "stats.nba.com did not answer. It often blocks cloud/VPN/CI IP ranges; "
            "run this script from a home connection and try --sleep 2 --timeout 60."
        )
        sys.exit(1)
    except KeyboardInterrupt:
        sys.exit(130)
