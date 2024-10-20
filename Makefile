test:
	python3 -m unittest scripts/html2json.py

	(echo 'include "dom"; table' && cat scripts/tests/table.html | python3 scripts/html2json.py | jq --compact-output && cat scripts/tests/table.json | jq --compact-output) | jq -L scripts --run-tests
