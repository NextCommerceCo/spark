# PDP Customization Safety

Spark product detail pages are not just visual templates. A custom PDP must preserve the platform behavior that selects child products, updates price, submits cart lines, renders app surfaces, and handles unavailable products.

Use this runbook before changing `templates/catalogue/product.html` for a static design, Figma handoff, or merchant-specific product page.

## Preservation Contract

Keep these surfaces working unless the task explicitly removes them:

| Surface | Required markup or behavior | Why it matters |
| --- | --- | --- |
| Product data JSON | `{{ product.data|json_script:"product-data" }}` in `extrascripts`, before inline variant initialization | `SparkVariantState` needs child products, purchase info, images, and attributes after PDP component scripts have loaded. |
| Variant controls | Real controls named `attr_<code>` using values from `variant_form` | Child-product matching depends on form names and option values, not the visual labels. |
| Purchase info session | `{% purchase_info_for_product request product as session %}` before price and availability branches | `session.price` and `session.availability` are the source for initial price, compare-at, and sold-out state. |
| Price bindings | Visible price node with `data-price`; compare-at node with `data-price-retail` | Variant changes update these nodes from child `purchase_info`. |
| Add-to-cart form | `id="add-to-cart"`, POST action to `{% url 'cart:add' pk=product.pk %}`, CSRF token, hidden cart fields, submit button | No-JS fallback, GraphQL enhancement, and variant form-action updates all rely on this form. |
| Quantity | Real `quantity` field or `<spark-quantity name="quantity">` inside the form | Cart line quantity must submit through both fallback POST and GraphQL enhancement. |
| Subscription | `<spark-subscription>` rendered when `product.get_interval` and `interval_count_choices` exist | Subscription product data must reach `spark-add-to-cart`. |
| Inventory states | `session.availability.is_available_to_buy` branch and selected-variant availability updates | Sold-out products should not submit, and sold-out variants should disable the CTA. |
| App hooks | PDP hooks such as `product_rating_summary`, `product_info`, `product_footer`, `product_reviews`, `product_review_cta`, `view_product`, and `add_to_cart` | Reviews, tracking, and merchant apps extend the PDP through these hooks. |
| Sticky/mobile CTA | Sticky CTA mirrors the real submit button instead of owning separate cart logic | Mobile conversion UI should not bypass variant, quantity, subscription, or validation state. |
| Fallbacks | Missing images, missing product data, empty reviews, and no-JS form submission still render usable UI | Theme work should degrade cleanly on incomplete catalogue data. |

Missing product data, variant controls, price bindings, the add-to-cart form, CSRF, quantity, app hooks, or sold-out handling is a hard stop before upload unless the merchant explicitly accepts the behavior change.

## Implementation Pattern

Start from the existing Spark PDP and wrap or restyle behavior-critical controls instead of replacing them with purely decorative markup.

Keep PDP component scripts in `component_scripts` and the product data JSON plus initialization script in `extrascripts`. In `layouts/base.html`, `component_scripts` run before `extrascripts`; the product template relies on that order so `SparkVariantState` exists before the inline initializer reads `#product-data`.

Variant pickers can be dropdowns, radios, swatches, or custom buttons. The visual layer is flexible; the form controls are not. Every picker option must drive a real input/select name from `field.html_name` and a value from `field.field.choices`.

```django
{% for field in variant_form %}
    {% if 'attr' in field.id_for_label %}
        <label>{{ field.label }}</label>
        {% for choice in field.field.choices %}
            <label>
                <input type="radio" name="{{ field.html_name }}" value="{{ choice.0 }}">
                <span>{{ choice.1 }}</span>
            </label>
        {% endfor %}
    {% endif %}
{% endfor %}
```

Keep price nodes addressable:

```django
<span data-price>{{ session.price.price|currency:session.price.currency }}</span>
{% if session.price.price_retail > session.price.price %}
    <del data-price-retail>{{ session.price.price_retail|currency:session.price.currency }}</del>
{% else %}
    <del data-price-retail hidden></del>
{% endif %}
```

Keep the cart form intact and let Spark enhance it:

```django
<spark-add-to-cart product-id="{{ product.pk }}" graphql-url="{% url 'storefrontapi:graphql' %}">
<form id="add-to-cart" action="{% url 'cart:add' pk=product.pk %}" method="post">
    {% csrf_token %}
    {% for field in cart_form %}
        {% if field.is_hidden %}
            {{ field }}
        {% elif field.name == 'quantity' %}
            <spark-quantity name="quantity" value="1" min="1" max="{{ max_cart_quantity_per_line|default:15 }}"></spark-quantity>
        {% else %}
            {{ field }}
        {% endif %}
    {% endfor %}
    <button type="submit" id="add-to-cart-btn">{% t "store.catalogue.add_to_cart" %}</button>
</form>
</spark-add-to-cart>
```

## QA Runbook

Test on the `.29next.store` domain or use `?preview_theme={theme_id}&skip_cache=1` when previewing unpublished changes.

1. Load a PDP with multiple variants. Select each option. Confirm price, compare-at price, gallery image, add-to-cart form action, and button disabled state update.
2. Select every variant option combination that the product exposes. Confirm unavailable variants do not submit and available variants can be added.
3. Add to cart with quantity greater than 1. Confirm the side cart or cart page receives the selected child product and quantity.
4. If the product supports subscriptions, choose subscribe and a delivery interval. Confirm add-to-cart sends subscription data.
5. Test a sold-out product and a product with no image. Confirm the page renders a usable sold-out or fallback state.
6. On mobile widths around 375-430px, scroll past the main CTA. Confirm sticky CTA appears, does not cover important content at rest, and triggers the real submit button.
7. Confirm no horizontal overflow: `document.documentElement.scrollWidth <= window.innerWidth`.
8. Confirm review and app hook surfaces still render or remain present for apps to target.

Run this console audit as a quick smoke check:

```js
(function() {
  var form = document.getElementById('add-to-cart');
  var controls = Array.prototype.slice.call(document.querySelectorAll('[name^="attr_"]'));
  var report = {
    productData: !!document.getElementById('product-data'),
    variantControls: controls.length,
    variantNames: Array.from(new Set(controls.map(function(control) { return control.name; }))).join(', '),
    selectedVariantValues: controls.filter(function(control) {
      return control.tagName === 'SELECT' || control.checked;
    }).map(function(control) {
      return control.name + '=' + control.value;
    }).join(', '),
    priceNode: !!document.querySelector('[data-price]'),
    retailPriceNode: !!document.querySelector('[data-price-retail]'),
    addToCartForm: !!form,
    csrf: !!(form && form.querySelector('[name="csrfmiddlewaretoken"]')),
    quantity: !!(form && form.querySelector('[name="quantity"], spark-quantity[name="quantity"]')),
    submitButton: !!(form && form.querySelector('button[type="submit"]')),
    subscription: !!document.querySelector('spark-subscription'),
    stickyCta: !!document.getElementById('sticky-atc'),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
  };
  console.table(report);
  return report;
})();
```

This audit does not replace a real add-to-cart test. It only catches missing DOM contracts.

## Settings Data

`configs/settings_schema.json` defines editor controls. `configs/settings_data.json` is merchant state.

For PDP redesigns:

- Add new controls to `settings_schema.json` and make templates handle missing values with `|default` or explicit fallback branches.
- Do not push `settings_data.json` just because a schema field was added.
- Change `settings_data.json` only for an intentional store-state update, an initial fixture/default install, or an explicit design decision for the target store.
- Call out any `settings_data.json` push in the handoff or PR summary.

RelievCore is the example case: setting `variant_picker` to `radio` was design-relevant because the PDP needed button-like size choices, but it still changed merchant Theme Editor state and should be pushed only intentionally.

## Override-Friendly Structure

Spark's current PDP is one template plus helper scripts. When repeated custom PDP work justifies splitting it, prefer partials that keep behavior-critical contracts in predictable files:

| Candidate partial | Responsibility |
| --- | --- |
| `partials/product_gallery.html` | Media gallery, thumbnails, image fallbacks, and gallery hook points. |
| `partials/product_buy_box.html` | Title, rating summary hook, price, benefits, and purchase panel shell. |
| `partials/product_variant_picker.html` | `variant_form` controls named `attr_*` plus visual picker variants. |
| `partials/product_cart_form.html` | `cart_form`, quantity, subscription, CSRF, and submit button. |
| `partials/product_trust_strip.html` | Trust, guarantees, shipping notes, and merchant proof points. |
| `partials/product_description.html` | Product description content and `product_description_placement` layout behavior. |
| `partials/product_size_guide.html` | Size guide content, ideally backed by product/category metadata or settings. |
| `partials/product_reviews.html` | Native reviews and app review hooks. |
| `partials/product_related.html` | Recommended and related products. |

Do not split the PDP just to satisfy one custom design. Split when the same behavior-preserving modules will be reused across multiple stores or when an app integration needs a stable override surface.
