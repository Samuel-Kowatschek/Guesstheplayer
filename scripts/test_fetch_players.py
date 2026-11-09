"""Offline tests for fetch_players.py (no network, nba_api not required).

Run: python -m unittest discover -s scripts -p "test_*.py"
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import fetch_players as fp  # noqa: E402

TODAY = date(2026, 11, 9)

TEAMS = [
    {"id": 1610612743, "abbreviation": "DEN", "full_name": "Denver Nuggets"},
    {"id": 1610612742, "abbreviation": "DAL", "full_name": "Dallas Mavericks"},
]


def roster_row(pid, name, num="15", pos="C", height="6-11", birth="FEB 19, 1995"):
    return {
        "PLAYER_ID": pid,
        "PLAYER": name,
        "NUM": num,
        "POSITION": pos,
        "HEIGHT": height,
        "BIRTH_DATE": birth,
        "AGE": 31,
    }


ROSTERS = {
    1610612743: [
        roster_row(203999, "Nikola Jokić"),
        roster_row(1, "No Number", num=""),
        roster_row(2, "Weird Country"),
        roster_row(3, "No Bio"),
        roster_row(4, "Bad Position", pos="X"),
    ],
    1610612742: [
        roster_row(1629029, "Luka Dončić", num="77", pos="F-G", height="6-6",
                   birth="1999-02-28T00:00:00"),
        roster_row(203999, "Nikola Jokić"),  # duplicate across rosters
    ],
}  # fmt: skip

BIOS = {
    203999: {"PLAYER_ID": 203999, "COUNTRY": "Serbia", "PLAYER_HEIGHT_INCHES": 83},
    1629029: {"PLAYER_ID": 1629029, "COUNTRY": "Slovenia", "PLAYER_HEIGHT_INCHES": 78},
    1: {"PLAYER_ID": 1, "COUNTRY": "USA"},
    2: {"PLAYER_ID": 2, "COUNTRY": "Atlantis"},
    4: {"PLAYER_ID": 4, "COUNTRY": "USA"},
}


class HelperTests(unittest.TestCase):
    def test_season_detection(self):
        self.assertEqual(fp.season_for(date(2026, 11, 9)), "2026-27")
        self.assertEqual(fp.season_for(date(2026, 10, 1)), "2026-27")
        self.assertEqual(fp.season_for(date(2026, 9, 30)), "2025-26")
        self.assertEqual(fp.season_for(date(1999, 12, 1)), "1999-00")
        self.assertEqual(fp.previous_season("2026-27"), "2025-26")
        self.assertEqual(fp.previous_season("2000-01"), "1999-00")

    def test_parse_height(self):
        self.assertEqual(fp.parse_height("6-9"), 81)
        self.assertEqual(fp.parse_height("7-0"), 84)
        self.assertEqual(fp.parse_height(80), 80)
        self.assertEqual(fp.parse_height("80.0"), 80)
        self.assertIsNone(fp.parse_height(""))
        self.assertIsNone(fp.parse_height(None))
        self.assertIsNone(fp.parse_height("x-y"))

    def test_parse_birth_date(self):
        self.assertEqual(fp.parse_birth_date("MAR 12, 1999"), date(1999, 3, 12))
        self.assertEqual(fp.parse_birth_date("1999-03-12T00:00:00"), date(1999, 3, 12))
        self.assertEqual(fp.parse_birth_date("1999-03-12"), date(1999, 3, 12))
        self.assertIsNone(fp.parse_birth_date(""))
        self.assertIsNone(fp.parse_birth_date("soon"))

    def test_age(self):
        self.assertEqual(fp.age_on(date(2000, 11, 9), TODAY), 26)
        self.assertEqual(fp.age_on(date(2000, 11, 10), TODAY), 25)

    def test_jersey_and_position(self):
        self.assertEqual(fp.parse_jersey("00"), "00")
        self.assertEqual(fp.parse_jersey(" 7 "), "7")
        self.assertIsNone(fp.parse_jersey(""))
        self.assertIsNone(fp.parse_jersey(None))
        self.assertIsNone(fp.parse_jersey("123"))
        self.assertEqual(fp.normalize_position("F-G"), "G-F")
        self.assertEqual(fp.normalize_position("C-F"), "F-C")
        self.assertEqual(fp.normalize_position("Guard"), "G")
        self.assertIsNone(fp.normalize_position("X"))

    def test_every_team_has_meta(self):
        self.assertEqual(len(fp.TEAM_META), 30)
        divisions = {}
        for conf, div in fp.TEAM_META.values():
            divisions.setdefault(div, set()).add(conf)
        self.assertEqual(len(divisions), 6)
        self.assertTrue(all(len(c) == 1 for c in divisions.values()))


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.result = fp.build_players(TEAMS, ROSTERS, BIOS, TODAY)
        self.by_name = {p["name"]: p for p in self.result.players}

    def test_merges_roster_and_bio(self):
        jokic = self.by_name["Nikola Jokić"]
        self.assertEqual(
            jokic,
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
                "continent": "Europe",
            },
        )
        luka = self.by_name["Luka Dončić"]
        self.assertEqual(luka["position"], "G-F")
        self.assertEqual(luka["birthDate"], "1999-02-28")
        self.assertEqual(luka["division"], "Southwest")

    def test_drops_incomplete_players_with_reasons(self):
        self.assertEqual(sorted(self.by_name), ["Luka Dončić", "Nikola Jokić"])
        reasons = dict(self.result.dropped)
        self.assertIn("jersey", reasons["No Number"])
        self.assertIn("unmapped country", reasons["Weird Country"])
        self.assertEqual(reasons["No Bio"], "no country")
        self.assertIn("position", reasons["Bad Position"])
        self.assertEqual(self.result.unmapped_countries["Atlantis"], 1)

    def test_warns_about_duplicates(self):
        self.assertTrue(any("more than one roster" in w for w in self.result.warnings))

    def test_output_validates(self):
        self.assertEqual(fp.validate(self.result.players, TODAY), [])

    def test_height_fallback_and_cross_check(self):
        rosters = {1610612743: [roster_row(203999, "Nikola Jokić", height="")]}
        r = fp.build_players(TEAMS, rosters, BIOS, TODAY)
        self.assertEqual(r.players[0]["heightInches"], 83)
        rosters = {1610612743: [roster_row(203999, "Nikola Jokić", height="6-5")]}
        r = fp.build_players(TEAMS, rosters, BIOS, TODAY)
        self.assertTrue(any("bio height" in w for w in r.warnings))


class ValidateTests(unittest.TestCase):
    def good(self, **kw):
        p = fp.build_players(TEAMS, ROSTERS, BIOS, TODAY).players[0]
        p.update(kw)
        return p

    def test_detects_problems(self):
        players = [
            self.good(),
            self.good(),  # duplicate
            self.good(id=9, name="Tiny", heightInches=50),
            self.good(id=10, name="Old", age=60),
            self.good(id=11, name="Nojersey", jersey=""),
            self.good(id=12, name="Future", birthDate="2030-01-01"),
        ]
        errors = "\n".join(fp.validate(players, TODAY))
        self.assertIn("duplicate id", errors)
        self.assertIn("duplicate name", errors)
        self.assertIn("height 50", errors)
        self.assertIn("age 60", errors)
        self.assertIn("missing jersey", errors)
        self.assertIn("future", errors)


class MainTests(unittest.TestCase):
    """End to end with a fake Fetcher: season fallback, bio gap filling, output file."""

    def test_main_with_mocked_api(self):
        many = {
            t["id"]: [
                roster_row(t["id"] * 100 + i, f"Player {t['abbreviation']} {i}", num=str(i))
                for i in range(60)
            ]
            for t in TEAMS
        }
        calls = []

        class FakeFetcher(fp.Fetcher):
            def teams(self):
                return TEAMS

            def roster(self, team_id, season):
                calls.append(("roster", season))
                return [] if season == "2026-27" else many[team_id]

            def bio_stats(self, season):
                calls.append(("bio", season))
                ids = [r["PLAYER_ID"] for rows in many.values() for r in rows]
                # current season: half the players; previous season: the rest but one
                if season == "2025-26":
                    return {pid: {"COUNTRY": "France"} for pid in ids[: len(ids) // 2]}
                return {pid: {"COUNTRY": "Canada"} for pid in ids[len(ids) // 2 : -1]}

            def player_info(self, player_id):
                calls.append(("info", player_id))
                return {"COUNTRY": "Australia"}

        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "players.json"
            with (
                mock.patch.object(fp, "Fetcher", FakeFetcher),
                mock.patch.object(fp, "date") as fake_date,
                mock.patch.object(fp, "log"),
            ):
                fake_date.today.return_value = TODAY
                fake_date.fromisoformat = date.fromisoformat
                code = fp.main(["--out", str(out), "--min-players", "10"])
            self.assertEqual(code, 0)
            data = json.loads(out.read_text(encoding="utf-8"))

        self.assertEqual(data["season"], "2025-26")
        self.assertEqual(len(data["players"]), 120)
        self.assertIn(("roster", "2026-27"), calls)
        self.assertIn(("bio", "2024-25"), calls)
        self.assertEqual(sum(1 for c in calls if c[0] == "info"), 1)
        countries = {p["country"] for p in data["players"]}
        self.assertEqual(countries, {"France", "Canada", "Australia"})


if __name__ == "__main__":
    unittest.main()
