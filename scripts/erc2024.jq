include "categories";
include "dom";
include "utils";


def status:
  if . == "W/D" then
    "withdrawn"
  elif . == "DNS" then
    "not started"
  else
    "finished"
  end;


table
| map(
  (.["TimePointsPenalty"] | lines)
  as $time_points_penalty

  | {
    team_id: .["NR"] | text_contents,
    team_name: .["Name"] | text_contents,
    category: .["Class"] | text_contents | extract_gender_age,
    members: .["Members"] | lines | map(capture_checked("(?<firstname>.+) (?<lastname>.+) [MN] (?<age>\\d+) (?<country>[A-Z]{3})")),
    time: ($time_points_penalty[0] | empty_to("0:00:00")),
    score: (.["Result"] | text_contents | try tonumber catch 0),
    status: (.["Result"] | text_contents | status),
    # The penalties are listed as negative
    penalty: ($time_points_penalty[2] | empty_to(0) | tonumber | negative)
  }
)
