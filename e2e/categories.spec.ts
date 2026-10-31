import { expect, test, type Page } from "@playwright/test";

const LIVE = process.env.E2E_LIVE === "1";

// Which classifier the suite expects to answer (see playwright.config.ts).
const SOURCE = LIVE
  ? { code: "CLAUDE", label: "Claude (Anthropic)", key: "anthropic" }
  : { code: "KEYWORDS", label: "keyword matching", key: "keywords" };

// Tickets are worded so the keyword fallback and Claude agree on the category.
const CATEGORIES = [
  {
    name: "Account",
    code: "ACC",
    tickets: [
      "I forgot my password and can't log in.",
      "Please close my account and delete my profile.",
    ],
  },
  {
    name: "Billing",
    code: "BIL",
    tickets: [
      "I was charged twice this month, please refund the duplicate payment.",
      "Where can I download the invoice for my last order?",
    ],
  },
  {
    name: "Technical",
    code: "TEC",
    tickets: [
      "The app crashes every time I open the settings page.",
      "Saving a report shows error 500 on the dashboard.",
    ],
  },
  {
    name: "Other",
    code: "OTH",
    tickets: [
      "Do you have an office in Berlin I could visit?",
      "Are you hiring for remote positions?",
    ],
  },
] as const;

const ticketField = (page: Page) => page.getByRole("textbox", { name: "Ticket" });
const classifyButton = (page: Page) => page.getByRole("button", { name: "Classify", exact: true });
const outcome = (page: Page) => page.locator(".detail");
const board = (page: Page) => page.getByRole("region", { name: "This session" });
const rows = (page: Page) => board(page).locator("tbody tr:not(:has(td.empty))");
const filter = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Filter by category" })
    .getByRole("button", { name: new RegExp(`^([A-Z]{3} )?${name} \\d+$`) });
const count = (page: Page, name: string) => filter(page, name).locator(".filter-count");

async function classify(page: Page, text: string, via: "button" | "keyboard" = "button") {
  await ticketField(page).fill(text);
  if (via === "button") {
    await classifyButton(page).click();
  } else {
    await ticketField(page).press("ControlOrMeta+Enter");
  }
  // The field clears only once the analyzer has answered.
  await expect(ticketField(page)).toHaveValue("");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("Backend online");
});

for (const category of CATEGORIES) {
  test.describe(category.name, () => {
    test(`classifies "${category.tickets[0]}" from the Classify button`, async ({ page }) => {
      const text = category.tickets[0];
      await classify(page, text, "button");

      await expect(outcome(page).locator(".detail-category")).toHaveText(category.name);
      await expect(outcome(page).locator(".detail-via")).toHaveText(`via ${SOURCE.label}`);
      await expect(outcome(page).locator(".flaps")).toHaveText(category.code);
      await expect(outcome(page).locator(".flaps")).toHaveAttribute("data-source", SOURCE.key);
      // Only a keyword guess carries the "check it before routing" warning.
      await expect(outcome(page).getByText("keyword guess")).toHaveCount(LIVE ? 0 : 1);

      await expect(rows(page)).toHaveCount(1);
      const cells = rows(page).first().getByRole("cell");
      await expect(cells.nth(1)).toContainText(text);
      await expect(cells.nth(1)).toContainText("NEW");
      await expect(cells.nth(2).locator(".category-word")).toHaveText(category.name);
      await expect(cells.nth(3)).toContainText(SOURCE.code);
      await expect(cells.nth(5)).toHaveText(String(text.length));

      await expect(count(page, "All")).toHaveText("1");
      for (const other of CATEGORIES) {
        await expect(count(page, other.name)).toHaveText(other.name === category.name ? "1" : "0");
      }
    });

    test(`classifies "${category.tickets[1]}" with the keyboard shortcut`, async ({ page }) => {
      const text = category.tickets[1];
      await classify(page, text, "keyboard");

      await expect(outcome(page).locator(".detail-category")).toHaveText(category.name);
      await expect(rows(page).first().locator(".category-word")).toHaveText(category.name);
      await expect(rows(page).first()).toContainText(text);
      await expect(count(page, category.name)).toHaveText("1");
    });

    test("is answered by the API with the expected category", async ({ request }) => {
      for (const text of category.tickets) {
        const response = await request.post("/api/analyze", { data: { text } });
        expect(response.ok()).toBe(true);
        expect(await response.json()).toEqual({
          original: text,
          character_count: text.length,
          category: category.name,
          source: SOURCE.key,
        });
      }
    });
  });
}

test.describe("board with all four categories", () => {
  test.beforeEach(async ({ page }) => {
    for (const category of CATEGORIES) {
      await classify(page, category.tickets[0]);
    }
    await expect(rows(page)).toHaveCount(CATEGORIES.length);
  });

  test("lists tickets newest first and counts each category once", async ({ page }) => {
    const newestFirst = [...CATEGORIES].reverse();
    for (const [index, category] of newestFirst.entries()) {
      await expect(rows(page).nth(index).locator(".category-word")).toHaveText(category.name);
    }
    await expect(rows(page).first()).toContainText("NEW");
    await expect(board(page).getByText("NEW", { exact: true })).toHaveCount(1);

    await expect(count(page, "All")).toHaveText(String(CATEGORIES.length));
    for (const category of CATEGORIES) {
      await expect(count(page, category.name)).toHaveText("1");
    }
  });

  test("filters the board by each category with the filter buttons", async ({ page }) => {
    for (const category of CATEGORIES) {
      await filter(page, category.name).click();
      await expect(filter(page, category.name)).toHaveAttribute("aria-pressed", "true");
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator(".category-word")).toHaveText(category.name);
      await expect(rows(page).first()).toContainText(category.tickets[0]);
    }

    await filter(page, "All").click();
    await expect(rows(page)).toHaveCount(CATEGORIES.length);
  });

  test("filters the board by each category with Alt+2…5 and resets with Alt+1", async ({ page }) => {
    for (const [index, category] of CATEGORIES.entries()) {
      await page.keyboard.press(`Alt+Digit${index + 2}`);
      await expect(filter(page, category.name)).toHaveAttribute("aria-pressed", "true");
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first().locator(".category-word")).toHaveText(category.name);
    }

    await page.keyboard.press("Alt+Digit1");
    await expect(filter(page, "All")).toHaveAttribute("aria-pressed", "true");
    await expect(rows(page)).toHaveCount(CATEGORIES.length);
  });

  test("shows an empty state for a category with no tickets after clearing", async ({ page }) => {
    await board(page).getByRole("button", { name: "Clear board" }).click();
    await expect(rows(page)).toHaveCount(0);
    for (const category of CATEGORIES) {
      await expect(count(page, category.name)).toHaveText("0");
    }

    await classify(page, CATEGORIES[0].tickets[0]);
    await filter(page, "Other").click();
    await expect(rows(page)).toHaveCount(0);
    await expect(board(page).getByText("No Other tickets this session.")).toBeVisible();
  });

  test("keeps every category on the board after a reload", async ({ page }) => {
    await page.reload();
    await expect(rows(page)).toHaveCount(CATEGORIES.length);
    for (const category of CATEGORIES) {
      await expect(count(page, category.name)).toHaveText("1");
    }
  });
});
