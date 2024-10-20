# Helpers for processing categories.


include "utils";


# Maps sex part of category abbreviation to the corresponding enum name.
def _gender_map:
  {"M": "men", "W": "women", "X": "mixed"};


# Maps age part of category abbreviation to the corresponding enum name.
def _age_map:
  {
    "18": "under18",
    "20": "under20",
    "23": "under23",
    "J": "junior",
    "Y": "youth",
    "UV": "ultraveteran",
    "SV": "superveteran",
    "V": "veteran",
    "O": "open",
  };


# Variant of `extract_gender_age` that allows modifying the regex pattern (e.g. adding a suffix or prefix).
def extract_gender_age(tweak_pattern):
  (_gender_map | keys | join("|"))
  as $gender_pattern

  | (_age_map | keys | join("|"))
  as $age_pattern

  | (("(?<gender>" + $gender_pattern + ")(?<age>" + $age_pattern + ")")
    | tweak_pattern)
  as $category_regex

  | trim
  | capture_checked($category_regex)
  | {
    gender: _gender_map[.gender],
    age: _age_map[.age]
  }
  ;


# Extracts a sex and age parts from a category string.
#
# ```jq
# jq extract_gender_age
#    "XSV"
# => { "gender": "mixed", "age": "superveteran" }
# ```
def extract_gender_age:
  extract_gender_age(.);
