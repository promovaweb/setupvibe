/**
 * Module declarations for the text imports used by Bun.
 * Markdown files enter the binary with `with { type: "text" }` and reach the
 * code as strings. TypeScript needs this declaration to accept the import.
 */
declare module "*.md" {
  const content: string;
  export default content;
}

declare module "*.sh" {
  const content: string;
  export default content;
}

declare module "*.conf" {
  const content: string;
  export default content;
}
