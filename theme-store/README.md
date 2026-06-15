# Spark Theme Store Assets

This directory contains the source and rendered asset used for Spark's listing in the NEXT theme dashboard.

| File | Purpose |
| --- | --- |
| `thumbnail.html` | Source markup for the dashboard thumbnail. |
| `source-gadget.jpg` | Original generated product image. Keep this committed so the thumbnail crops are reproducible from a fresh clone. |
| `source-gadget-wide.jpg` | Cropped source for the wide hero product image. |
| `source-gadget-front.jpg` | Cropped source for the product-front tile. |
| `source-gadget-shelf.jpg` | Cropped source for the shelf/product tile. |
| `theme-spark-thumb.png` | Rendered `600x450` dashboard thumbnail. |

When changing `thumbnail.html` or `source-gadget.jpg`, regenerate `theme-spark-thumb.png` at `600x450` and commit all changed source assets with the rendered PNG.

The current thumbnail was rendered with a headless browser viewport of `600x450`.
