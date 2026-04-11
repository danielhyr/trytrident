/**
 * MJML server-side compilation.
 *
 * Uses the `mjml` package (server-safe, not `mjml-browser`).
 * For client-side compilation, use lib/content/mjml-client.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mjml2html = require("mjml");

/** Compile MJML source to HTML (server-side only) */
export function compileMjml(source: string): {
  html: string;
  errors: Array<{ message: string; line: number }>;
} {
  try {
    const result = mjml2html(source, {
      validationLevel: "soft",
      minify: false,
    });
    return {
      html: result.html,
      errors: (result.errors ?? []).map(
        (e: { message: string; line: number }) => ({
          message: e.message,
          line: e.line,
        })
      ),
    };
  } catch (err) {
    return {
      html: "",
      errors: [
        {
          message:
            err instanceof Error ? err.message : "MJML compilation failed",
          line: 0,
        },
      ],
    };
  }
}

/** Wrap body content in a minimal MJML document */
export function wrapInMjmlDocument(body: string): string {
  return `<mjml>
  <mj-body>
    ${body}
  </mj-body>
</mjml>`;
}

// Re-export blocks for server-side consumers
export {
  DEFAULT_EMAIL_BLOCKS,
  DEFAULT_EMAIL_TEMPLATE,
} from "./mjml-blocks";
