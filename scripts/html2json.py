from __future__ import annotations
from html.parser import HTMLParser
from typing import TypedDict
import json
import sys
import unittest


# https://developer.mozilla.org/en-US/docs/Glossary/Void_element
VOID_ELEMENTS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}


class Element(TypedDict):
    tag: str
    attrs: dict[str, str | bool]
    children: list[Element | str]


class HTMLtoJSONParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.stack: list[Element] = []
        self.root: Element | None = None

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
        self_closing: bool = False,
    ) -> None:
        attrs_dict = {
            key: (value if value is not None else True) for key, value in attrs
        }
        element: Element = {"tag": tag, "attrs": attrs_dict, "children": []}

        if self.root is None:
            self.root = element

        if len(self.stack) > 0:
            self.stack[-1]["children"].append(element)

        self.stack.append(element)

        if tag in VOID_ELEMENTS or self_closing:
            self.handle_endtag(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        # The default implementation calls `handle_starttag` and `handle_endtag`.
        # This would result in `handle_endtag` being called twice when a void element was using the XML self-closing syntax.
        self.handle_starttag(tag, attrs, True)

    def handle_endtag(self, tag: str) -> None:
        if len(self.stack) == 0:
            raise ValueError(f"Unexpected closing tag “{tag}”, no open tags")

        current = self.stack[-1]
        if current["tag"] != tag:
            raise ValueError(
                f"Unexpected closing tag {tag}, currently open {current['tag']}"
            )

        self.stack.pop()

    def handle_data(self, data: str) -> None:
        if len(self.stack) > 0:
            self.stack[-1]["children"].append(data)

    def get_json(self) -> str:
        return json.dumps(self.root, indent=4)


def html_to_json(html: str) -> str:
    parser = HTMLtoJSONParser()
    parser.feed(html)
    return parser.get_json()


class TestHTMLtoJSON(unittest.TestCase):
    def test_simple(self) -> None:
        html_code = "<html><body><h1>Title</h1></body></html>"
        expected_json = json.dumps(
            {
                "tag": "html",
                "attrs": {},
                "children": [
                    {
                        "tag": "body",
                        "attrs": {},
                        "children": [
                            {
                                "tag": "h1",
                                "attrs": {},
                                "children": [
                                    "Title",
                                ],
                            }
                        ],
                    }
                ],
            },
            indent=4,
        )
        self.assertEqual(html_to_json(html_code), expected_json)

    def test_attributes(self) -> None:
        html_code = '<a href="https://example.com">Click Here</a>'
        expected_json = json.dumps(
            {
                "tag": "a",
                "attrs": {"href": "https://example.com"},
                "children": [
                    "Click Here",
                ],
            },
            indent=4,
        )
        self.assertEqual(html_to_json(html_code), expected_json)

    def test_nested(self) -> None:
        html_code = "<div><p>Nested <b>bold</b> text</p></div>"
        expected_json = json.dumps(
            {
                "tag": "div",
                "attrs": {},
                "children": [
                    {
                        "tag": "p",
                        "attrs": {},
                        "children": [
                            "Nested ",
                            {
                                "tag": "b",
                                "attrs": {},
                                "children": [
                                    "bold",
                                ],
                            },
                            " text",
                        ],
                    }
                ],
            },
            indent=4,
        )
        self.assertEqual(html_to_json(html_code), expected_json)

    def test_empty(self) -> None:
        html_code = ""
        expected_json = "null"
        self.assertEqual(html_to_json(html_code), expected_json)

    def test_self_void(self) -> None:
        html_code = "<div>Hello<br>World</div>"
        expected_json = json.dumps(
            {
                "tag": "div",
                "attrs": {},
                "children": [
                    "Hello",
                    {"tag": "br", "attrs": {}, "children": []},
                    "World",
                ],
            },
            indent=4,
        )
        self.assertEqual(html_to_json(html_code), expected_json)

    def test_self_closing(self) -> None:
        html_code = "<div>Hello<br />World</div>"
        expected_json = json.dumps(
            {
                "tag": "div",
                "attrs": {},
                "children": [
                    "Hello",
                    {"tag": "br", "attrs": {}, "children": []},
                    "World",
                ],
            },
            indent=4,
        )
        self.assertEqual(html_to_json(html_code), expected_json)

    def test_attribute_without_value(self) -> None:
        html_code = '<input type="checkbox" checked>'
        expected_json = json.dumps(
            {
                "tag": "input",
                "attrs": {
                    "type": "checkbox",
                    "checked": True,
                },
                "children": [],
            },
            indent=4,
        )
        self.assertEqual(html_to_json(html_code), expected_json)


def main() -> None:
    html_input = sys.stdin.read()

    json_output = html_to_json(html_input)
    print(json_output)


if __name__ == "__main__":
    main()
