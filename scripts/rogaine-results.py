from datetime import timedelta
from pathlib import Path
from typing import Any
import argparse
import csv
import json
import re
import sys
import urllib.request

GENDER_MAP = {"M": "men", "W": "women", "X": "mixed"}
AGE_MAP = {
    "18": "under18",
    "20": "under20",
    "23": "under23",
    "J": "junior",
    "Y": "youth",
    "UV": "ultraveteran",
    "SV": "superveteran",
    "V": "veteran",
    "O": "open",
}
# In topological order, less specific first.
AGES = ["O", "V", "SV", "UV", "Y", "J", "23", "20", "18"]
GENDER_PATTERN = "|".join(gender for gender in GENDER_MAP.keys())
AGE_PATTERN = "|".join(gender for gender in AGE_MAP.keys())
CATEGORY_REGEX = re.compile(rf"(?P<gender>{GENDER_PATTERN})(?P<age>{AGE_PATTERN})\d+")


def state_to_ioc(state: str) -> str:
    """
    Converts Australian state to IOC country code.
    """
    match state:
        case "NZ":
            return "NZL"
        case "NSW" | "WA" | "Qld" | "Vic" | "Tas" | "ACT" | "SA":
            return "AUS"
        case other:
            print(f"Unknown country {other}", file=sys.stderr)

    return state


def seconds_to_hms(seconds: int) -> str:
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02}:{minutes:02}:{secs:02}"


def get_results_json_url(url: str) -> str:
    """
    Converts the URL of HTML result listing to a JSON URL.
    For example, if the URL is <https://rogaine-results.com/event/results/2024/australasian-champs/24hr>
    The JSON URL will be <https://rogaine-results.com/2024/australasian-champs/24hr/results.json>
    """
    if (
        match := re.fullmatch(
            r"https://rogaine-results.com/event/results/(?P<event>\d+/[^/]+/[^/]+)", url
        )
    ) is None:
        raise ValueError(f"Unexpected URL format {url}")

    event = match.group("event")
    return f"https://rogaine-results.com/{event}/results.json"


def fetch_json(url: str) -> Any:
    with urllib.request.urlopen(url) as response:
        data = response.read()
        return json.loads(data)


def extract_gender_age(categories: list[str]) -> tuple[str, str] | tuple[None, None]:
    gender = None
    age = None
    most_specific_age = -1

    for category in categories:
        if (category_match := CATEGORY_REGEX.fullmatch(category)) is None:
            continue

        matched_gender = category_match.group("gender")
        matched_age = category_match.group("age")

        age_specificity = AGES.index(matched_age)
        if age_specificity > most_specific_age:
            gender = GENDER_MAP.get(matched_gender, gender)
            age = AGE_MAP.get(matched_age, age)
            most_specific_age = age_specificity

    return gender, age


def extract_team_members(team_name: str) -> list[tuple[str, str, str]]:
    """
    Extracts the team member names and countries.
    The format is `: Name1 Surname1 (State1), Name2 Surname2 (State2)`.
    """
    team_name = team_name.strip(":").strip()
    members = team_name.split(",")

    member_info = []
    for member in members:
        if (match := re.match(r"(.*)\s\((.*)\)", member.strip())) is None:
            print(f"Could not parse member: {member}", file=sys.stderr)
            continue

        firstname, lastname = match.group(1).strip().split(" ", 1)
        state = match.group(2).strip()
        member_info.append((state_to_ioc(state), firstname, lastname))

    return member_info


def generate_csv_from_json(json_data: Any, output_path: Path) -> None:
    base_header = [
        "id",
        "gender",
        "age",
        "time",
        "score",
        "penalty",
        "status",
    ]

    max_members = 0
    for team in json_data.get("teams", []):
        members = extract_team_members(team.get("name", ""))
        max_members = max(max_members, len(members))

    member_columns = []
    for i in range(1, max_members + 1):
        member_columns.extend(
            [f"member{i}country", f"member{i}firstname", f"member{i}lastname"]
        )

    header = base_header + member_columns

    with open(output_path, mode="w", newline="") as file:
        writer = csv.writer(file, lineterminator="\n")

        writer.writerow(header)

        for i, team in enumerate(json_data.get("teams", []), start=1):
            team_name = team.get("name", "")
            score = team.get("points_scored", 0)
            penalty = team.get("points_lost", 0)
            time = seconds_to_hms(team.get("total_time", 0))
            status = "finished"
            categories = team.get("category", [])

            gender, age = extract_gender_age(categories)

            if gender is None:
                print(
                    f"No supported categories for {team_name}: {categories}",
                    file=sys.stderr,
                )
                gender, age = "unknown", "unknown"

            members = extract_team_members(team_name)

            member_data = [info for member_info in members for info in member_info]

            while len(member_data) < 3 * max_members:
                member_data.append("")

            writer.writerow(
                [i, gender, age, time, score, penalty, status] + member_data
            )


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument("url", help="URL of the HTML results")
    parser.add_argument("output", type=Path, help="Output path for CSV")

    args = parser.parse_args()

    json_data = fetch_json(get_results_json_url(args.url))

    generate_csv_from_json(json_data, args.output)


if __name__ == "__main__":
    main()
