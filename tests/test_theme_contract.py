import contextlib
import http.server
import json
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
CONTRACT = ROOT / "theme-contract.json"

BASE_WITHOUT_PIXELS = "<html><body>{% block scripts %}{% endblock %}</body></html>"

BASE_WITH_PIXELS = """<html><body>
    {% block side_cart %}{% include 'partials/side_cart.html' %}{% endblock side_cart %}

    {% block pixels %}
        {% pixels %}
    {% endblock pixels %}

    {% block scripts %}{% endblock scripts %}
</body></html>
"""


def run_checker(*arguments, cwd=ROOT, env=None):
    return subprocess.run(
        [sys.executable, str(SCRIPTS / "check-theme-contract.py"), *map(str, arguments)],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )


def write_theme(root, base_html, extra=None):
    """Lay out a minimal derived theme: base layout plus one of each directory."""
    (root / "layouts").mkdir(parents=True, exist_ok=True)
    (root / "templates").mkdir(parents=True, exist_ok=True)
    (root / "partials").mkdir(parents=True, exist_ok=True)
    (root / "layouts" / "base.html").write_text(base_html, encoding="utf-8")
    (root / "templates" / "index.html").write_text(
        (extra or "<p>index</p>"), encoding="utf-8"
    )
    # The runtime hooks the shipped JS resolves by id/attribute, so a stub
    # theme satisfies every requirement except the one a test removes.
    (root / "partials" / "side_cart.html").write_text(
        "<spark-cart-drawer></spark-cart-drawer>", encoding="utf-8"
    )
    (root / "partials" / "header.html").write_text(
        '<button data-toggle="mobile-nav"></button><span id="cart-badge"></span>',
        encoding="utf-8",
    )
    (root / "partials" / "mobile_menu.html").write_text(
        '<div id="mobile-nav"></div>', encoding="utf-8"
    )


class ContractFileTests(unittest.TestCase):
    def test_contract_declares_the_pixels_requirement(self):
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        ids = {requirement["id"] for requirement in contract["requirements"]}

        self.assertIn("pixels", ids)

    def test_contract_declares_the_runtime_hooks_the_js_resolves(self):
        # A negative control showed deleting id="cart-badge" passes every
        # other gate and fails only in the browser.
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        needles = {requirement["must_contain"] for requirement in contract["requirements"]}

        for hook in (
            'id="cart-badge"',
            'data-toggle="mobile-nav"',
            'id="mobile-nav"',
            "</spark-cart-drawer>",
        ):
            self.assertIn(hook, needles)

    def test_every_requirement_carries_an_explanation(self):
        # The failure message is the whole point: whoever trips this gate is
        # usually not the person who knows what the tag does.
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))

        for requirement in contract["requirements"]:
            for field in ("id", "file", "must_contain", "why", "scope"):
                self.assertTrue(requirement.get(field), requirement)

    def test_only_pixels_binds_the_fleet(self):
        # Decided 2026-09-21: the runtime hooks are Spark's own gate. Derived
        # themes are forks that carry the same hook in a different file (four
        # live stores served #mobile-nav without partials/mobile_menu.html), so
        # a file-location rule against the fleet reports forks, not faults.
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        by_scope = {}
        for requirement in contract["requirements"]:
            by_scope.setdefault(requirement["scope"], set()).add(requirement["id"])

        self.assertEqual(by_scope["fleet"], {"pixels"})
        self.assertEqual(
            by_scope["spark"],
            {"cart-badge", "mobile-nav-toggle", "mobile-nav", "cart-drawer"},
        )

    def test_docs_table_lists_every_requirement_with_its_scope(self):
        # docs/theme-contract.md is where a fork author learns which rules bind
        # them; a rule added to the JSON without a row there is undocumented.
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
        docs = (ROOT / "docs" / "theme-contract.md").read_text(encoding="utf-8")

        for requirement in contract["requirements"]:
            row = f"| `{requirement['id']}` | {requirement['scope']} | `{requirement['file']}` |"
            self.assertIn(row, docs, requirement["id"])


def write_contract(root, requirements):
    path = root / "contract.json"
    path.write_text(json.dumps({"requirements": requirements}), encoding="utf-8")
    return path


def requirement(**overrides):
    """A well-formed fleet requirement; a test overrides only what it varies."""
    return {
        "id": "pixels",
        "file": "layouts/base.html",
        "must_contain": "{% pixels %}",
        "why": "events",
        "scope": "fleet",
        **overrides,
    }


STUB_THEME_ID = "34"
STUB_APIKEY = "k"


@contextlib.contextmanager
def serve_theme(templates, payload=None, redirect_to=None, requests=None):
    """Stand up a stub store admin API serving one theme's templates.

    Yields the store's base URL and shuts the server down on exit. Like the
    real API it serves /api/admin/themes/<id>/templates/ and ignores the query
    string; unlike a permissive stub it answers 404 to any other path and 401
    without the Bearer key, so a regression in the checker's URL or header
    surfaces as "could not read theme" rather than a pass.

    `payload` replaces the list body verbatim; `redirect_to` answers the
    templates path with a 302 to that location instead. When `requests` is a
    list, every request the stub receives is appended to it as (path, auth).
    """
    if payload is None:
        payload = [{"name": name, "content": content} for name, content in templates.items()]
    body = json.dumps(payload).encode("utf-8")
    templates_path = f"/api/admin/themes/{STUB_THEME_ID}/templates/"
    if requests is None:
        requests = []

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            requests.append((self.path, self.headers.get("Authorization")))
            if redirect_to and self.path.split("?", 1)[0] == templates_path:
                self.send_response(302)
                self.send_header("Location", redirect_to)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if self.path.split("?", 1)[0] != templates_path:
                self.send_error(404)
                return
            if self.headers.get("Authorization") != f"Bearer {STUB_APIKEY}":
                self.send_error(401)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    # serve_forever polls at 0.5s by default and shutdown() waits for the next
    # tick, which put half a second of idle wait on every remote-mode test.
    threading.Thread(
        target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True
    ).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


# A fork with the tracker block and nothing else Spark's runtime hooks expect:
# the mobile menu lives inline in the header, as measured on live stores.
FORK_WITHOUT_SPARK_HOOKS = {
    "layouts/base.html": BASE_WITH_PIXELS,
    "partials/header.html": "<nav>menu</nav>",
}


class ContractScopeTests(unittest.TestCase):
    def test_requirement_without_scope_is_a_load_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            contract = write_contract(root, [
                {k: v for k, v in requirement().items() if k != "scope"},
            ])

            result = run_checker("--root", root, "--contract", contract)

        self.assertEqual(result.returncode, 1)
        self.assertIn("is missing 'scope'", result.stderr)

    def test_unknown_scope_is_a_load_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            contract = write_contract(root, [
                requirement(scope="everywhere"),
            ])

            result = run_checker("--root", root, "--contract", contract)

        self.assertEqual(result.returncode, 1)
        self.assertIn("has scope 'everywhere'", result.stderr)

    def test_working_copy_defaults_to_the_spark_scope(self):
        # Local mode is Spark's own CI gate, so every rule applies.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            (root / "partials" / "mobile_menu.html").unlink()

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("[mobile-nav] partials/mobile_menu.html is missing", result.stderr)
        self.assertIn("spark scope, 5 of 5 requirement(s)", result.stderr)

    def test_fleet_scope_on_a_working_copy_checks_only_fleet_rules(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            (root / "partials" / "mobile_menu.html").unlink()

            result = run_checker(
                "--root", root, "--contract", CONTRACT, "--scope", "fleet"
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("fleet scope, 1 of 5 requirement(s)", result.stdout)

    def test_fleet_scope_still_fails_a_missing_fleet_rule(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITHOUT_PIXELS)

            result = run_checker(
                "--root", root, "--contract", CONTRACT, "--scope", "fleet"
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)

    def test_live_theme_defaults_to_the_fleet_scope(self):
        # The measured case: a derived theme with the tracker block and none of
        # Spark's runtime-hook files. The live check must pass it.
        with serve_theme(FORK_WITHOUT_SPARK_HOOKS) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
                "--contract", CONTRACT,
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("theme 34 on", result.stdout)
        self.assertIn("fleet scope, 1 of 5 requirement(s)", result.stdout)

    def test_live_theme_can_opt_into_the_spark_scope(self):
        with serve_theme(FORK_WITHOUT_SPARK_HOOKS) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
                "--contract", CONTRACT, "--scope", "spark",
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("[mobile-nav] partials/mobile_menu.html is missing", result.stderr)
        self.assertIn("[cart-drawer]", result.stderr)

    def test_live_theme_missing_the_fleet_rule_still_fails(self):
        with serve_theme({
            "layouts/base.html": BASE_WITHOUT_PIXELS,
        }) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
                "--contract", CONTRACT,
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("[pixels] layouts/base.html does not contain {% pixels %}", result.stderr)

    def test_scope_with_no_requirements_fails_rather_than_passing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            contract = write_contract(root, [
                requirement(scope="spark"),
            ])

            result = run_checker(
                "--root", root, "--contract", contract, "--scope", "fleet"
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("no requirement carries scope 'fleet'", result.stderr)

    def test_empty_scope_is_a_load_error_not_a_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            contract = write_contract(root, [
                requirement(scope=""),
            ])

            result = run_checker("--root", root, "--contract", contract)

        self.assertEqual(result.returncode, 1)
        self.assertIn("is missing 'scope'", result.stderr)

    def test_unknown_scope_error_names_the_valid_scopes(self):
        # Scopes are exact: "Fleet" is not "fleet", and the message must say
        # what would have been accepted.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            contract = write_contract(root, [
                requirement(scope="Fleet"),
            ])

            result = run_checker("--root", root, "--contract", contract)

        self.assertEqual(result.returncode, 1)
        self.assertIn("has scope 'Fleet'; expected one of fleet, spark", result.stderr)

    def test_scope_flag_rejects_values_outside_the_two_scopes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)

            result = run_checker(
                "--root", root, "--contract", CONTRACT, "--scope", "everywhere"
            )

        self.assertEqual(result.returncode, 2)
        self.assertIn("invalid choice: 'everywhere'", result.stderr)

    def test_spark_scope_on_a_working_copy_matches_the_default(self):
        # The override that restates the local default must behave identically.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            (root / "partials" / "mobile_menu.html").unlink()

            result = run_checker(
                "--root", root, "--contract", CONTRACT, "--scope", "spark"
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("[mobile-nav] partials/mobile_menu.html is missing", result.stderr)
        self.assertIn("spark scope, 5 of 5 requirement(s)", result.stderr)

    def test_fleet_scope_on_a_live_theme_matches_the_default(self):
        with serve_theme(FORK_WITHOUT_SPARK_HOOKS) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
                "--contract", CONTRACT, "--scope", "fleet",
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("fleet scope, 1 of 5 requirement(s)", result.stdout)

    def test_fleet_sweep_invocation_uses_env_key_and_sparks_own_contract(self):
        # A fleet sweep runs exactly this: --store and --theme-id,
        # the key in $NTK_APIKEY, no --contract and no --scope. It must land on
        # Spark's shipped contract at the fleet scope and pass a fork.
        with serve_theme(FORK_WITHOUT_SPARK_HOOKS) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID,
                env={"NTK_APIKEY": STUB_APIKEY, "PATH": "/usr/bin:/bin"},
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("fleet scope, 1 of 5 requirement(s)", result.stdout)

    def test_fleet_sweep_sees_only_fleet_violations_on_stderr(self):
        # The sweep parses stderr lines starting "- [" as violations. A theme
        # missing every Spark file must report the one fleet rule, not five.
        with serve_theme({
            "layouts/base.html": BASE_WITHOUT_PIXELS,
        }) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
                "--contract", CONTRACT,
            )

        violations = [
            line.strip() for line in result.stderr.splitlines()
            if line.strip().startswith("- [")
        ]
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(violations), 1, result.stderr)
        self.assertTrue(violations[0].startswith("- [pixels] "), violations)
        self.assertIn("(fleet scope, 1 of 5 requirement(s)) with 1 violation(s)", result.stderr)
        self.assertNotIn("[cart-drawer]", result.stderr)

    def test_live_theme_child_override_dropping_pixels_fails_at_fleet_scope(self):
        # The block-override rule rides on the requirement list, so it must
        # still fire for the fleet rule when the spark rules are filtered out.
        with serve_theme({
            "layouts/base.html": BASE_WITH_PIXELS,
            "templates/index.html": "{% block pixels %}{% endblock pixels %}",
        }) as base_url:
            result = run_checker(
                "--store", base_url, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
                "--contract", CONTRACT,
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("[pixels] templates/index.html overrides block 'pixels'", result.stderr)

    def test_live_theme_with_no_fleet_rules_refuses_before_reading_the_store(self):
        # Nothing listens on this port. If the scope check ran after the fetch,
        # the failure would be a connection error instead.
        with tempfile.TemporaryDirectory() as tmp:
            contract = write_contract(Path(tmp), [
                requirement(scope="spark"),
            ])

            result = run_checker(
                "--store", "http://127.0.0.1:9", "--theme-id", STUB_THEME_ID,
                "--apikey", STUB_APIKEY, "--contract", contract,
            )

        self.assertEqual(result.returncode, 1)
        self.assertIn("no requirement carries scope 'fleet'", result.stderr)
        self.assertNotIn("could not read theme", result.stderr)


class LiveTransportTests(unittest.TestCase):
    def check_live(self, store, *extra):
        return run_checker(
            "--store", store, "--theme-id", STUB_THEME_ID, "--apikey", STUB_APIKEY,
            "--contract", CONTRACT, *extra,
        )

    def test_store_url_over_plain_http_is_refused_before_any_request(self):
        # Port 9 has no listener; a refusal that came from a connection attempt
        # would say "could not read theme" instead.
        result = self.check_live("http://store.example:9")

        self.assertEqual(result.returncode, 1)
        self.assertIn("--store must use https://", result.stderr)
        self.assertNotIn("could not read theme", result.stderr)

    def test_store_url_with_another_scheme_is_refused(self):
        for store in ("ftp://store.example", "file:///etc"):
            with self.subTest(store=store):
                result = self.check_live(store)

                self.assertEqual(result.returncode, 1)
                self.assertIn("--store must", result.stderr)
                self.assertNotIn("could not read theme", result.stderr)

    def test_store_url_without_a_scheme_is_refused(self):
        result = self.check_live("store.example")

        self.assertEqual(result.returncode, 1)
        self.assertIn("--store must be a full URL", result.stderr)

    def test_malformed_store_url_is_refused_without_a_traceback(self):
        for store in ("https://[bad", "https://store.example:notaport"):
            with self.subTest(store=store):
                result = self.check_live(store)

                self.assertEqual(result.returncode, 1)
                self.assertIn("--store is not a valid URL", result.stderr)
                self.assertNotIn("Traceback", result.stderr)

    def test_plain_http_is_accepted_for_a_local_store(self):
        with serve_theme({"layouts/base.html": BASE_WITH_PIXELS}) as base_url:
            result = self.check_live(base_url.replace("127.0.0.1", "localhost"))

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_redirect_is_reported_not_followed(self):
        # The second stub would pass the theme. Reaching it would mean the
        # checker followed the redirect.
        target_requests = []
        with serve_theme(
            {"layouts/base.html": BASE_WITH_PIXELS}, requests=target_requests
        ) as target_url:
            location = f"{target_url}/api/admin/themes/{STUB_THEME_ID}/templates/"
            with serve_theme({}, redirect_to=location) as base_url:
                result = self.check_live(base_url)

        self.assertEqual(result.returncode, 1)
        self.assertIn("could not read theme", result.stderr)
        self.assertIn("302", result.stderr)
        self.assertIn("not following", result.stderr)
        self.assertEqual(target_requests, [])

    def test_unpaginated_results_envelope_is_read(self):
        payload = {
            "next": None,
            "results": [{"name": "layouts/base.html", "content": BASE_WITH_PIXELS}],
        }
        with serve_theme({}, payload=payload) as base_url:
            result = self.check_live(base_url)

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_paginated_response_is_refused_rather_than_partly_checked(self):
        # Page one alone would pass. Checking it as if it were the whole theme
        # would miss an override on a later page.
        payload = {
            "next": "https://store.example/api/admin/themes/34/templates/?cursor=2",
            "results": [{"name": "layouts/base.html", "content": BASE_WITH_PIXELS}],
        }
        with serve_theme({}, payload=payload) as base_url:
            result = self.check_live(base_url)

        self.assertEqual(result.returncode, 1)
        self.assertIn("paginated response", result.stderr)
        self.assertNotIn("gate passed", result.stdout)

    def test_malformed_entries_are_skipped_not_a_traceback(self):
        payload = [
            "not an object",
            {"name": None, "content": "x"},
            {"name": "partials/a.html", "content": None},
            {"name": "layouts/base.html", "content": BASE_WITH_PIXELS},
        ]
        with serve_theme({}, payload=payload) as base_url:
            result = self.check_live(base_url)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_non_list_body_fails_cleanly(self):
        with serve_theme({}, payload={"detail": "nope"}) as base_url:
            result = self.check_live(base_url)

        self.assertEqual(result.returncode, 1)
        self.assertIn("did not return a list", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_template_name_with_a_newline_cannot_add_a_violation_line(self):
        # One real violation: the override drops the tag. The name tries to
        # print a second, fabricated one.
        name = "templates/x.html\n- [cart-badge] forged.html"
        with serve_theme({
            "layouts/base.html": BASE_WITH_PIXELS,
            name: "{% block pixels %}{% endblock pixels %}",
        }) as base_url:
            result = self.check_live(base_url)

        violations = [
            line for line in result.stderr.splitlines() if line.strip().startswith("- [")
        ]
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(violations), 1, result.stderr)
        self.assertIn("[pixels] 'templates/x.html\\n- [cart-badge] forged.html'", violations[0])
        self.assertIn("with 1 violation(s)", result.stderr)

    def test_ordinary_template_names_are_shown_unquoted(self):
        with serve_theme({
            "layouts/base.html": BASE_WITH_PIXELS,
            "templates/index.html": "{% block pixels %}{% endblock pixels %}",
        }) as base_url:
            result = self.check_live(base_url)

        self.assertIn("- [pixels] templates/index.html overrides block", result.stderr)


class ThemeContractGateTests(unittest.TestCase):
    def test_spark_itself_satisfies_its_own_contract(self):
        result = run_checker()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Theme contract gate passed", result.stdout)
        self.assertIn("spark scope, 5 of 5 requirement(s)", result.stdout)

    def test_missing_tag_fails_with_the_reason(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITHOUT_PIXELS)

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)
        self.assertIn("Why it matters", result.stderr)

    def test_missing_runtime_hook_fails_naming_the_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITH_PIXELS)
            (root / "partials" / "header.html").write_text(
                '<button data-toggle="mobile-nav"></button>', encoding="utf-8"
            )

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("[cart-badge]", result.stderr)
        self.assertIn('partials/header.html does not contain id="cart-badge"', result.stderr)
        self.assertNotIn("[mobile-nav-toggle]", result.stderr)

    def test_commented_out_tag_does_not_satisfy_the_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, "<html><body>{# {% pixels %} #}</body></html>")

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)

    def test_child_override_that_drops_the_tag_fails(self):
        # The tag is present in the base layout, so a text search passes while
        # every page this template renders is missing the frames.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(
                root,
                BASE_WITH_PIXELS,
                extra="{% block pixels %}{% endblock pixels %}",
            )

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("overrides block 'pixels'", result.stderr)

    def test_child_override_that_keeps_the_tag_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(
                root,
                BASE_WITH_PIXELS,
                extra="{% block pixels %}{% pixels %}{% endblock pixels %}",
            )

            result = run_checker("--root", root, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_empty_theme_fails_rather_than_reporting_success(self):
        # A gate that passes when it read nothing is worse than no gate.
        with tempfile.TemporaryDirectory() as tmp:
            result = run_checker("--root", tmp, "--contract", CONTRACT)

        self.assertEqual(result.returncode, 1)
        self.assertIn("nothing was actually checked", result.stderr)

    def test_remote_mode_requires_credentials(self):
        result = run_checker(
            "--store", "https://example.29next.store", "--theme-id", "1",
            "--apikey", "",
        )

        self.assertEqual(result.returncode, 1)
        self.assertIn("required to check a live theme", result.stderr)

    def test_default_contract_is_sparks_own_not_the_checked_theme(self):
        # A derived theme carries no contract of its own, and remote mode has
        # no local theme at all. Defaulting to the theme directory made the
        # gate unusable in exactly the case it exists for.
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_theme(root, BASE_WITHOUT_PIXELS)

            result = run_checker("--root", root)

        self.assertEqual(result.returncode, 1)
        self.assertIn("does not contain {% pixels %}", result.stderr)

    def test_unreadable_contract_fails(self):
        result = run_checker("--contract", ROOT / "does-not-exist.json")

        self.assertEqual(result.returncode, 1)
        self.assertIn("Theme contract gate failed", result.stderr)


if __name__ == "__main__":
    unittest.main()
