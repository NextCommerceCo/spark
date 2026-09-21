"""Keep docs/qa-fixtures.md and tests/fixtures/qa-fixtures.json in step.

The doc is the human catalogue of QA fixture states; the JSON is the
machine-readable companion a seeding script consumes. Every state must
appear in both under the same id and slug, and every `FX-` id referenced
from another doc must exist in the catalogue.
"""

import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "qa-fixtures.md"
DATA = ROOT / "tests" / "fixtures" / "qa-fixtures.json"
DOCS_DIR = ROOT / "docs"

HEADING = re.compile(r"^### (FX-[A-Z]\d{2}) ([a-z0-9-]+)$", re.MULTILINE)
REFERENCE = re.compile(r"\bFX-[A-Z]\d{2}\b")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def load_doc_states():
    return dict(HEADING.findall(DOC.read_text(encoding="utf-8")))


def load_json():
    return json.loads(DATA.read_text(encoding="utf-8"))


class QaFixtureCatalogueTests(unittest.TestCase):
    def setUp(self):
        self.doc_states = load_doc_states()
        self.data = load_json()
        self.json_states = {state["id"]: state for state in self.data["states"]}

    def test_doc_has_states(self):
        self.assertGreater(len(self.doc_states), 0, "no '### FX-xxx slug' headings found in the doc")

    def test_every_json_state_has_a_doc_heading(self):
        missing = sorted(set(self.json_states) - set(self.doc_states))
        self.assertEqual(missing, [], f"states in JSON but not in {DOC.name}: {missing}")

    def test_every_doc_heading_has_a_json_state(self):
        missing = sorted(set(self.doc_states) - set(self.json_states))
        self.assertEqual(missing, [], f"states in {DOC.name} but not in {DATA.name}: {missing}")

    def test_names_match_between_doc_and_json(self):
        mismatched = {
            fixture_id: (self.doc_states[fixture_id], state["name"])
            for fixture_id, state in self.json_states.items()
            if fixture_id in self.doc_states and self.doc_states[fixture_id] != state["name"]
        }
        self.assertEqual(mismatched, {}, f"doc heading slug != JSON name: {mismatched}")

    def test_json_ids_are_unique_and_well_formed(self):
        ids = [state["id"] for state in self.data["states"]]
        self.assertEqual(len(ids), len(set(ids)), "duplicate ids in JSON")
        pattern = re.compile(self.data["id_pattern"])
        for fixture_id in ids:
            self.assertRegex(fixture_id, pattern)

    def test_doc_ids_are_unique(self):
        text = DOC.read_text(encoding="utf-8")
        ids = [match.group(1) for match in HEADING.finditer(text)]
        self.assertEqual(len(ids), len(set(ids)), "duplicate '### FX-xxx' headings in the doc")

    def test_json_group_matches_id_letter(self):
        groups = self.data["groups"]
        for fixture_id, state in self.json_states.items():
            letter = fixture_id[3]
            self.assertIn(letter, groups, f"{fixture_id}: unknown group letter")
            self.assertEqual(
                state["group"], groups[letter], f"{fixture_id}: group does not match id letter"
            )

    def test_json_states_carry_required_keys(self):
        for fixture_id, state in self.json_states.items():
            for key in ("id", "group", "name", "description", "fields", "exercises"):
                self.assertIn(key, state, f"{fixture_id}: missing {key}")
            self.assertRegex(state["name"], SLUG, f"{fixture_id}: name is not a slug")
            self.assertTrue(state["description"].strip(), f"{fixture_id}: empty description")
            self.assertIsInstance(state["fields"], dict, f"{fixture_id}: fields must be an object")
            self.assertTrue(state["exercises"], f"{fixture_id}: list at least one template or script")

    def test_exercised_files_exist(self):
        for fixture_id, state in self.json_states.items():
            for relative in state["exercises"]:
                self.assertTrue(
                    (ROOT / relative).is_file(), f"{fixture_id}: exercises missing file {relative}"
                )

    def test_docs_reference_only_known_ids(self):
        known = set(self.json_states)
        unknown = {}
        for path in sorted(DOCS_DIR.rglob("*.md")):
            if path == DOC:
                continue
            found = set(REFERENCE.findall(path.read_text(encoding="utf-8"))) - known
            if found:
                unknown[str(path.relative_to(ROOT))] = sorted(found)
        self.assertEqual(unknown, {}, f"docs reference fixture ids that do not exist: {unknown}")

    def test_section_specs_reference_fixtures(self):
        specs = sorted((DOCS_DIR / "section-specs").glob("*.md"))
        specs = [path for path in specs if path.name != "README.md"]
        self.assertTrue(specs)
        for path in specs:
            self.assertTrue(
                REFERENCE.search(path.read_text(encoding="utf-8")),
                f"{path.relative_to(ROOT)} QA checklist references no fixture id",
            )


if __name__ == "__main__":
    unittest.main()
