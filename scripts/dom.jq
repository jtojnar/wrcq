# Utilities for XML processing.
#
# Expects the following format:
#
# ```json
# {
#    tag: "p",
#    attrs: { class: "foo" },
#    children: [
#      "Hello",
#      { tag: "br" },
#      "world",
#    ],
# }
# ```


# Finds all elements matching given predicate.
# Though it will only extract the ancestor if matched elements are nested.
def find_elements(pred):
  def _find:
    if type == "object" then
      if pred then
        .
      else
        .children | _find
      end
    elif type == "array" then
      map(_find)
    else
      empty
    end;

  _find
  | flatten
  ;


# Finds all elements with given tag name.
# Though it will only extract the ancestor if matched elements are nested.
def find_elements_by_name($tag):
  find_elements(.tag? == $tag)
  ;


# Extracts text nodes recursively and joins them.
def text_contents:
  def _text:
    if type == "object" then
      .children | _text
    elif type == "array" then
      map(_text)
    elif type == "string" then
      .
    else
      error("Cannot extract text from unsupported element " + type)
    end;

  _text
  | flatten
  | join("")
  ;


# Asserts the list contains only a single element and returns it.
def singular:
  if length == 1 then
    .[0]
  elif length == 0 then
    error("No value found")
  else
    error("More than one value found")
  end;


# Extracts table cells.
def cells:
  find_elements(.tag? == "td" or .tag? == "th");


# Returns rows of the specified table as objects indexed by text of cell in the first row.
def table_to_object:
  find_elements_by_name("tr")
  as $rows

  | ($rows[0] | cells | map(text_contents))
  as $heading

  | $rows[1:]
  as $body

  | $body
  | map(
    (. | cells) as $row
    | $heading
    | with_entries({
      key: .value,
      value: $row[.key]
    })
  )
  ;


# Finds the single table matching a predicate and returns its rows as objects indexed by text of cell in the first row.
def table(pred):
  find_elements_by_name("table")
  | map(select(pred))
  | singular
  | table_to_object
  ;


# Finds the single table and returns its rows as objects indexed by text of cell in the first row.
def table:
  find_elements_by_name("table")
  | singular
  | table_to_object
  ;
