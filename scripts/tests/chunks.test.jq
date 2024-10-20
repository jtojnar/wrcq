# Single items
include "utils"; chunks(. == null)
["foo", null, "bar", null, "baz"]
[["foo"], ["bar"], ["baz"]]

# Multiple items
include "utils"; chunks(. == null)
[1, 2, null, 3, 4, 5, null, 6, 7]
[[1, 2], [3, 4, 5], [6, 7]]

# Separator at the start
include "utils"; chunks(. == null)
[null, 3, 4, 5, null, 6, 7]
[[3, 4, 5], [6, 7]]

# Separator at the end
include "utils"; chunks(. == null)
[1, 2, null, 3, 4, 5, null]
[[1, 2], [3, 4, 5], []]

# Consecutive separators
include "utils"; chunks(. == null)
[1, 2, null, null, null, 3, 4]
[[1, 2], [], [], [3, 4]]
