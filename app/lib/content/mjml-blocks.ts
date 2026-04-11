/**
 * MJML template blocks and constants.
 *
 * Safe to import from both server and client contexts.
 */

/** Pre-built MJML block snippets */
export const DEFAULT_EMAIL_BLOCKS: Array<{
  name: string;
  label: string;
  mjml: string;
}> = [
  {
    name: "header",
    label: "Header with Logo",
    mjml: `<mj-section background-color="#ffffff" padding="20px 0">
  <mj-column>
    <mj-text align="center" font-size="24px" font-weight="bold" color="#1E293B">
      {{ shop.name }}
    </mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    name: "text",
    label: "Text Block",
    mjml: `<mj-section background-color="#ffffff">
  <mj-column>
    <mj-text font-size="16px" color="#374151" line-height="1.6">
      Hi {{ contact.first_name }},
    </mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    name: "cta",
    label: "CTA Button",
    mjml: `<mj-section background-color="#ffffff">
  <mj-column>
    <mj-button background-color="#0ACDBC" color="#ffffff" font-size="16px" border-radius="6px" href="{{ shop.url }}">
      Shop Now
    </mj-button>
  </mj-column>
</mj-section>`,
  },
  {
    name: "product-grid",
    label: "Product Grid (2-col)",
    mjml: `<mj-section background-color="#ffffff">
  <mj-column>
    <mj-image src="https://placehold.co/260x260" alt="Product" width="260px" border-radius="8px" />
    <mj-text align="center" font-size="14px" font-weight="bold" color="#1E293B">Product Name</mj-text>
    <mj-text align="center" font-size="14px" color="#64748B">$29.99</mj-text>
  </mj-column>
  <mj-column>
    <mj-image src="https://placehold.co/260x260" alt="Product" width="260px" border-radius="8px" />
    <mj-text align="center" font-size="14px" font-weight="bold" color="#1E293B">Product Name</mj-text>
    <mj-text align="center" font-size="14px" color="#64748B">$29.99</mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    name: "footer",
    label: "Footer with Unsubscribe",
    mjml: `<mj-section background-color="#f8fafc" padding="20px 0">
  <mj-column>
    <mj-text align="center" font-size="12px" color="#94A3B8">
      {{ shop.name }} · 123 Main St, Anytown, US 12345
    </mj-text>
    <mj-text align="center" font-size="12px" color="#94A3B8">
      <a href="#" style="color: #64748B;">Unsubscribe</a> · <a href="#" style="color: #64748B;">Preferences</a>
    </mj-text>
  </mj-column>
</mj-section>`,
  },
  {
    name: "spacer",
    label: "Spacer",
    mjml: `<mj-section>
  <mj-column>
    <mj-spacer height="20px" />
  </mj-column>
</mj-section>`,
  },
];

/** Default starter email template */
export const DEFAULT_EMAIL_TEMPLATE = `<mjml>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="24px" font-weight="bold" color="#1E293B">
          {{ shop.name }}
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="16px" color="#374151" line-height="1.6">
          Hi {{ contact.first_name | default: "there" }},
        </mj-text>
        <mj-text font-size="16px" color="#374151" line-height="1.6">
          Your message goes here.
        </mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-button background-color="#0ACDBC" color="#ffffff" font-size="16px" border-radius="6px" href="{{ shop.url }}">
          Shop Now
        </mj-button>
      </mj-column>
    </mj-section>

    <mj-section background-color="#f8fafc" padding="20px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#94A3B8">
          {{ shop.name }} · 123 Main St, Anytown, US 12345
        </mj-text>
        <mj-text align="center" font-size="12px" color="#94A3B8">
          <a href="#" style="color: #64748B;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
