"""
Converts results HTML pages generated Rogain Manager to CSV format.
"""

from bs4 import BeautifulSoup
from dataclasses import dataclass, field
from datetime import timedelta
from pathlib import Path
from typing import Any
import argparse
import csv
import json
import re
import requests
import sys


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
CATEGORY_REGEX = re.compile(
    rf"(?:24 H )?(?P<gender>{GENDER_PATTERN})(?P<age>{AGE_PATTERN})(?:24)?"
)


@dataclass
class Member:
    country: str
    firstname: str
    lastname: str


@dataclass
class TeamResult:
    nr: str
    team_class: str
    team_name: str
    members: list[Member] = field(default_factory=list)
    time: str = ""
    points: str = ""
    penalty: str = ""


def parse_html(html_content: str) -> tuple[list[str], list[list[str]]]:
    soup = BeautifulSoup(html_content, "html.parser")

    table = soup.find("table")
    if table is None:
        raise ValueError("Table not found in the HTML content")

    header_row = table.find("tr", class_="resultheader")
    if header_row is None:
        raise ValueError("Header row not found in the table")

    headers = [th.get_text(strip=True) for th in header_row.find_all("td")]
    check_headers(headers)

    data_rows = []
    for row in table.find_all(
        "tr",
        class_=lambda value: value and value.startswith("team"),
    ):
        columns = [td.decode_contents() for td in row.find_all("td")]
        data_rows.append(columns)

    return headers, data_rows


def check_headers(headers: list[str]) -> None:
    expected_headers = [
        "NR",
        "Class",
        "Name",
        "Members",
        "TimePointsPenalty",
    ]

    for expected in expected_headers:
        if expected not in headers:
            raise ValueError(
                f"Table missing “{expected}” header, only have the following: {headers}"
            )


def process_results(rows: list[list[str]], headers: list[str]) -> list[TeamResult]:
    results = []

    nr_idx = headers.index("NR")
    class_idx = headers.index("Class")
    name_idx = headers.index("Name")
    members_idx = headers.index("Members")
    time_idx = headers.index("TimePointsPenalty")

    for row in rows:
        nr = row[nr_idx]
        team_class = row[class_idx]
        team_name = row[name_idx]
        members_raw = row[members_idx].split("<br/>")
        time_points_penalty = row[time_idx].split("<br/>")

        time = time_points_penalty[0]
        points = time_points_penalty[1]
        penalty = time_points_penalty[2]

        members = [m for member in members_raw if (m := parse_member(member))]

        result = TeamResult(
            nr=nr,
            team_class=team_class,
            team_name=team_name,
            members=members,
            time=time,
            points=points,
            penalty=penalty,
        )
        results.append(result)
    return results


def fetch_html(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text


def extract_gender_age(category: str) -> tuple[str, str]:
    if (category_match := CATEGORY_REGEX.fullmatch(category)) is None:
        print(f"Unknown category {category}", file=sys.stderr)
        return "unknown", "unknown"

    gender = GENDER_MAP.get(category_match.group("gender"))
    age = AGE_MAP.get(category_match.group("age"))

    return gender, age


def parse_member(member: str) -> Member | None:
    """
    Extracts the team member name and country.
    The format is `Name1 Surname1 XYZ`, where `XYZ` is a country code.
    """
    member = member.strip()

    if member == "":
        return None

    if (match := re.fullmatch(r"(.*)\s([A-Z]{3})", member)) is None:
        print(f"Could not parse member: {member}", file=sys.stderr)
        return None

    firstname, lastname = match.group(1).strip().split(" ", 1)
    country = match.group(2).strip()

    return Member(
        country=country,
        firstname=firstname,
        lastname=lastname,
    )


def write_to_csv(results: list[TeamResult], output_path: Path) -> None:
    base_header = [
        "id",
        "gender",
        "age",
        "time",
        "score",
        "penalty",
        "status",
    ]

    max_members = max(len(result.members) for result in results)

    member_columns = []
    for i in range(1, max_members + 1):
        member_columns.extend(
            [f"member{i}country", f"member{i}firstname", f"member{i}lastname"]
        )

    header = base_header + member_columns

    with open(output_path, mode="w", newline="") as file:
        writer = csv.writer(file, lineterminator="\n")

        writer.writerow(header)

        for result in results:
            team_name = result.team_name
            status = "finished"

            gender, age = extract_gender_age(result.team_class)

            member_data = [
                info
                for member_info in result.members
                for info in [
                    member_info.country,
                    member_info.firstname,
                    member_info.lastname,
                ]
            ]

            while len(member_data) < 3 * max_members:
                member_data.append("")

            writer.writerow(
                [
                    result.nr,
                    gender,
                    age,
                    result.time,
                    result.points,
                    result.penalty,
                    status,
                ]
                + member_data
            )


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument("url", help="URL of the HTML results")
    parser.add_argument("output", type=Path, help="Output path for CSV")

    args = parser.parse_args()

    html_data = fetch_html(args.url)

    headers, parsed_data = parse_html(html_data)

    check_headers(headers)

    processed_results = process_results(parsed_data, headers)

    write_to_csv(processed_results, args.output)


if __name__ == "__main__":
    main()
