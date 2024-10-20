test:
	python3 -m unittest scripts/html2json.py

	jq -L scripts --run-tests scripts/tests/chunks.test.jq

	jq -L scripts --run-tests scripts/tests/categories.test.jq

	(echo 'include "dom"; table' && cat scripts/tests/table.html | python3 scripts/html2json.py | jq --compact-output && cat scripts/tests/table.json | jq --compact-output) | jq -L scripts --run-tests

	(echo 'include "dom"; lines' && cat scripts/tests/lines.html | python3 scripts/html2json.py | jq --compact-output && cat scripts/tests/lines.json | jq --compact-output) | jq -L scripts --run-tests

	# Check that the following build.
	cat scripts/samples/rogain-manager/erc2024.html | python3 scripts/html2json.py | jq -L scripts --from-file scripts/erc2024.jq > /dev/null

	cat scripts/samples/rogain-manager/lvrc2022.html | python3 scripts/html2json.py | jq -L scripts --from-file scripts/lvrc2022.jq > /dev/null

	cat scripts/samples/rogain-manager/lvrc2024.html | tidy -q | python3 scripts/html2json.py | jq -L scripts --from-file scripts/lvrc2024.jq > /dev/null

	cat scripts/samples/rogain-manager/frc2024.html | tidy -q | python3 scripts/html2json.py | jq -L scripts --from-file scripts/lvrc2024.jq > /dev/null

	cat scripts/samples/aurc2023.html | python3 scripts/html2json.py | jq -L scripts --from-file scripts/aurc2023.jq > /dev/null
