# Based off of erc2024
include "categories";
include "dom";
include "utils";


table(.attrs.class != "info")
| map(
  (.["Laiks Punkti Soda punkti"] | lines)
  as $time_points_penalty

  | {
    team_id: .["KN"] | text_contents,
    team_name: .["Komanda"] | find_elements_by_name("a") | text_contents,
    category: .["Vieta grupā(s)"] | text_contents,
    members: .["Komanda"] | find_elements_by_name("li") | map(text_contents | capture_checked("(?<firstname>.+) (?<lastname>.+)") + {"country": "LAT"}),
    time: ($time_points_penalty[0] | empty_to("0:00:00")),
    score: (.["Rezultāts"] | text_contents | try tonumber catch 0),
    penalty: ($time_points_penalty[2] // "" | empty_to(0) | tonumber | negative)
  }
)
