# Spark Theme Store Assets

This directory contains the source and rendered asset used for Spark's listing in the NEXT theme dashboard.

| File | Purpose |
| --- | --- |
| `thumbnail.html` | Source markup for the dashboard thumbnail. |
| `source-gadget.jpg` | Source product image used by `thumbnail.html`. Keep this committed so the thumbnail is reproducible from a fresh clone. |
| `theme-spark-thumb.png` | Rendered `600x450` dashboard thumbnail. |

When changing `thumbnail.html` or `source-gadget.jpg`, regenerate `theme-spark-thumb.png` at `600x450` and commit all changed source assets with the rendered PNG.

The current thumbnail was rendered with a headless browser viewport of `600x450`.
