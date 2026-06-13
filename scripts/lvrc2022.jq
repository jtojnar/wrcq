# Based off of erc2024
include "categories";
include "dom";
include "utils";


# The categories are only avaliable as ranking.
def categories:
  capture_checked("[0-9]+\\. \\[\\s*(?<categories>.+?)\\s*\\]")
  | .categories
  | split("\\s+"; null)
  | map(capture_checked("(?<category>[A-Z]+):[0-9]+") | .category);


# When multiple categories are printed, juniors are before open, which are before veterans and so on.
def find_primary_category:
  if any(match("J$", "g")) then
    first
  else
    last
  end;


table(.attrs.class != "info")
| map(select(.["Vieta grupā(s)"] | text_contents != "DNS"))
| map(
  (.["Laiks Punkti Soda punkti"] | lines)
  as $time_points_penalty

  | {
    team_id: .["KN"] | text_contents,
    team_name: .["Komanda"] | find_elements_by_name("a") | text_contents,
    category: .["Vieta grupā(s)"] | text_contents | categories | find_primary_category | extract_gender_age,
    members: .["Komanda"] | find_elements_by_name("li") | map(text_contents | capture_checked("(?<firstname>.+) (?<lastname>.+)") + {"country": "LAT"}),
    time: ($time_points_penalty[1] | empty_to("0:00:00")),
    score: (.["Rezultāts"] | text_contents | try tonumber catch 0),
    penalty: ($time_points_penalty[2] // "" | empty_to(0) | tonumber | negative),
  }
)
