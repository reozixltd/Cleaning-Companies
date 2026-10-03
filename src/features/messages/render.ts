/**
 * Fills {variables} in a message template. Unknown keys are left as written so a typo shows in the preview.
 * Only the object's own keys count, so `{constructor}` or `{toString}` stay as typed.
 */
export function render(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (whole, key: string) => (Object.hasOwn(vars, key) ? vars[key] : whole));
}
