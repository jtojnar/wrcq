"""
Converts results JSON format as produced by jq scripts to CSV.
"""

from pathlib import Path
from typing import TypedDict
import argparse
import csv
import json
import sys


class Category(TypedDict):
    gender: str
    age: str


class Member(TypedDict):
    country: str
    firstname: str
    lastname: str


class TeamResult(TypedDict):
  team_id: int
  team_name: str | None
  category: Category
  members: Member
  time: str
  score: int
  penalty: int | None


def write_to_csv(results: list[TeamResult], output_path: Path) -> None:
    base_header = [
        "id",
        "name",
        "gender",
        "age",
        "time",
        "score",
        "penalty",
        "status",
    ]

    max_members = max(len(result["members"]) for result in results)

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
            member_data = [
                info
                for member_info in result["members"]
                for info in [
                    member_info["country"],
                    member_info["firstname"],
                    member_info["lastname"],
                ]
            ]

            while len(member_data) < 3 * max_members:
                member_data.append("")

            writer.writerow(
                [
                    result["team_id"],
                    result.get("team_name", ""),
                    result["category"]["gender"],
                    result["category"]["age"],
                    result.get("time", "0:00:00"),
                    result.get("score", 0),
                    result.get("penalty", 0),
                    result.get("status", "finished"),
                ]
                + member_data
            )


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument("output", type=Path, help="Output path for CSV")

    args = parser.parse_args()

    json_input = json.loads(sys.stdin.read())

    write_to_csv(json_input, args.output)


if __name__ == "__main__":
    main()
