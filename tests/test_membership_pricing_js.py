import shutil
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NODE_TEST = ROOT / "tests" / "js" / "membership-pricing.test.js"


class MembershipPricingJsTests(unittest.TestCase):
    def test_membership_pricing_module(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node is required for membership pricing JS tests")

        result = subprocess.run(
            [node, str(NODE_TEST)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )

        self.assertEqual(
            result.returncode,
            0,
            result.stdout + result.stderr,
        )


if __name__ == "__main__":
    unittest.main()
