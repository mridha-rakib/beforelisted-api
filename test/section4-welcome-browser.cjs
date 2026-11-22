const { chromium } = require("playwright");
const { EmailTemplates } = require("../src/services/email.templates.beforelisted.ts");
const assert = require("node:assert/strict");

(async () => {
  const html = new EmailTemplates().welcome("Synthetic Renter", "Renter", "https://example.invalid", undefined, undefined, { fullName: "Synthetic Agent", title: "Agent", brokerage: "Example" });
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    for (const width of [320, 1024]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route("**/*", route => route.abort());
      await page.setContent(html);
      const button = page.getByRole("link", { name: "Read the Latest Report & News" });
      assert.equal(await button.getAttribute("href"), "https://beforelisted.com/report/latest");
      const bounds = await button.boundingBox();
      assert(bounds && bounds.width > 0 && bounds.x >= 0 && bounds.x + bounds.width <= width);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.close();
    }
    process.stdout.write("Synthetic desktop and mobile email rendering passed\n");
  } finally {
    await browser.close();
  }
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
