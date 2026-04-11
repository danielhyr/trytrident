/**
 * Client-side MJML compilation using mjml-browser.
 *
 * This module is ONLY for use in "use client" components.
 * For server-side compilation, use lib/content/mjml.ts
 */

export function compileMjmlClient(source: string): {
  html: string;
  errors: Array<{ message: string; line: number }>;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mjml2html = require("mjml-browser");
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
