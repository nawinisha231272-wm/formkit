import { test, expect } from "@playwright/test";

test("retained selection chrome does not rewrite unchanged CSP stylesheet declarations", async ({
  page,
}) => {
  await page.goto("/builder.html?approved");
  const field = page.locator('#canvas [data-field-id="email"]');
  await field.focus();
  const work = await page.evaluate(async () => {
    const original = CSSStyleDeclaration.prototype.setProperty;
    let redundant = 0;
    let writes = 0;
    CSSStyleDeclaration.prototype.setProperty = function (
      property,
      value,
      priority,
    ) {
      if (this.parentRule) {
        writes++;
        if (this.getPropertyValue(property) === value) redundant++;
      }
      return original.call(this, property, value, priority);
    };
    try {
      for (const id of ["customerType", "email", "customerType", "email"]) {
        document
          .querySelector<HTMLElement>(`#canvas [data-field-id="${id}"]`)!
          .focus();
        await new Promise(requestAnimationFrame);
      }
      return { redundant, writes };
    } finally {
      CSSStyleDeclaration.prototype.setProperty = original;
    }
  });
  expect(work.redundant).toBe(0);
  // Actual selection placement still updates CSS when its dimensions change.
  expect(work.writes).toBeGreaterThan(0);
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("data-of-selected", "true");
});
