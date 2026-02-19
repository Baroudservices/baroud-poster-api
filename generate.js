const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePrice(p) {
  const t = (p ?? "").toString().trim();
  if (!t) return "$0";
  return t.includes("$") ? t : `$${t}`;
}

async function main() {
  const templatePath = path.join(__dirname, "template.html");
  const offersPath = path.join(__dirname, "offers.json");
  const outDir = path.join(__dirname, "out");

  const template = fs.readFileSync(templatePath, "utf8");
  const offers = JSON.parse(fs.readFileSync(offersPath, "utf8"));

  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();

    // ✅ ستوري حقيقي
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

    for (const o of offers) {
      const slug = (o.slug || o.title || "poster").toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

      const html = template
        .replaceAll("{{TITLE}}", escapeHtml(o.title || "Service Name"))
        .replaceAll("{{DESC}}", escapeHtml(o.desc || "Description"))
        .replaceAll("{{PRICE}}", escapeHtml(normalizePrice(o.price)))
        .replaceAll("{{BADGE_LEFT}}", escapeHtml(o.badgeLeft || "AVAILABLE ✅"))
        .replaceAll("{{BADGE_RIGHT}}", escapeHtml(o.badgeRight || "SPECIAL OFFER ✨"))
        .replaceAll("{{IMAGE_URL}}", escapeHtml(o.imageUrl || "https://via.placeholder.com/1000x1000.png?text=IMAGE"))
        .replaceAll("{{RAMADAN_DISPLAY}}", (o.theme === "ramadan") ? "block" : "none");

      await page.setContent(html, { waitUntil: "networkidle0" });

      // انتظر الخطوط + الصور
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const imgs = Array.from(document.images || []);
        await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => {
          img.onload = () => r();
          img.onerror = () => r();
        })));
      });

      // ✅ خد screenshot للـ card نفسه (مش viewport غلط)
      const card = await page.$("#card");
      if (!card) throw new Error("Card element not found (#card)");

      const outPath = path.join(outDir, `${slug}.png`);
      await card.screenshot({ path: outPath, type: "png" });

      console.log("✅ Generated:", outPath);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
