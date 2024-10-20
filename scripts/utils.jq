# Splits the array into chunks based on separator predicate.
def chunks(separator):
  reduce .[] as $item (
    [];
    if $item | separator then
      . + [[]]
    else
      if length > 0 then
        .[length - 1] += [$item]
      else
        . + [[$item]]
      end
    end
  );


# Asserts the list contains only a single element and returns it.
def singular:
  if length == 1 then
    .[0]
  elif length == 0 then
    error("No value found")
  else
    error("More than one value found \(.)")
  end;


# Trims spaces from both ends of the string.
def trim:
  gsub("^\\s|\\s*$"; "");


# Replaces an empty string with a fallback value.
def empty_to($fallback):
  if . == "" then
    $fallback
  else
    .
  end;

# Just multiplying `0 * -1` produces a `-0`.
def negative:
if . != 0 then
  -1 * .
else
  .
end;

# Like capture but will fail on error.
def capture_checked($regex):
  if . == "" then
    empty
  else
    capture($regex) // error("Regex “\($regex)” did not match “\(.)”")
  end;
