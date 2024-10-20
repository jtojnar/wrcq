# Completely custom website, Australian states instead of countries, categories
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


def state_to_country:
  if . == "NZ" then
    "NZL"
  elif . == "NSW" or . == "WA" or . == "Qld" or . == "Vic" or . == "Tas" or . == "ACT" or . == "SA" then
    "AUS"
  elif . == "unknown" or . == "Int" then
    "???"
  else
    error("Unknown state \(.)")
  end;


def comma_split:
  split(",\\s*"; null);


def zip_members_countries:
  if (.countries | length) == 1 then
    # All members have the same country.
    .countries[0] as $country
    | .members | map(. + { country: $country })
  elif (.countries | length) == (.members | length) then
    # There is the same number of countries as members.
    .countries as $countries
    | .members | to_entries | map(.value + { country: $countries[.key] })
  else
    # The number of countries is different, we are not sure how to match them.
    .countries as $countries
    | .members | to_entries | map(.value += { country: ($countries[.key] + "?" // "???") })
  end;


def normalize_category:
  comma_split
  | map(
    # Drop intervarsity
    select(. != "IV")
    # Add open for gender only categories
    | if test("^[MXW]$") then "\(.)O" else . end
    | sub("U23"; "23")
  )
  | singular
  ;


table
| map(
  # Remove footer
  select(.["Place"] | text_contents != "Place")
  
  | (.["State"] | text_contents | comma_split | map(state_to_country) | unique)
  as $countries

  | (.["Team"] | text_contents | comma_split | map(capture_checked("(?<firstname>.+) (?<lastname>.+)")))
  as $members

  | ({ members: $members, countries: $countries } | zip_members_countries)
  as $members

  | {
    # Team ID not available
    team_id: .["Place"] | text_contents | select(trim != ""),
    category: .["Cat"] | text_contents | normalize_category | extract_gender_age,
    members: $members,
    time: (.["Time"] | text_contents | empty_to("0:00:00")),
    score: (.["Score"] | text_contents | try tonumber catch 0),
  }
)
