const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json({ limit: "15mb" }));

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHTML(data) {
  const title = escapeHtml(data.title || "Service Name");
  const desc = escapeHtml(data.desc || "Description goes here");

  const priceRaw = (data.price || "$0").toString().trim();
  const price = escapeHtml(priceRaw.includes("$") ? priceRaw : `$${priceRaw}`);

  const badgeLeft = escapeHtml(data.badgeLeft || "AVAILABLE ✅");
  const badgeRight = escapeHtml(data.badgeRight || "SPECIAL OFFER ✨");

  const theme = (data.theme || "normal").toString(); // "normal" | "ramadan"
  const showRamadan = theme === "ramadan";

  const imgSrc = data.imageData
    ? data.imageData // data:image/png;base64,...
    : escapeHtml(data.imageUrl || "https://via.placeholder.com/1000x1000.png?text=IMAGE");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box}
    body{
      margin:0; width:1080px; height:1920px; overflow:hidden;
      font-family:Poppins, sans-serif;
      background:#000;
    }
    .card{
      position:relative; width:1080px; height:1920px; color:#fff;
      background: radial-gradient(circle at 50% 10%, rgba(0,255,234,.14), transparent 45%),
                  linear-gradient(180deg, #0e1a22 0%, #000 70%);
    }
    .glow{
      position:absolute; top:-220px; left:50%; transform:translateX(-50%);
      width:760px; height:760px; background:rgba(0,140,255,.18);
      filter:blur(140px);
    }
    .badges{
      position:absolute; top:70px; left:70px; right:70px;
      display:flex; justify-content:space-between; gap:20px; z-index:5;
    }
    .pill{
      background:rgba(0,0,0,.55);
      border:1px solid rgba(255,255,255,.18);
      padding:18px 26px; border-radius:999px;
      font-size:26px; font-weight:900;
      backdrop-filter: blur(8px);
      white-space:nowrap;
    }
    .pill.cyan{ border-color: rgba(0,255,234,.40); }
    .top{
      position:absolute; top:180px; left:0; right:0;
      text-align:center; z-index:5;
    }
    .brand{
      font-weight:900; font-size:92px; letter-spacing:2px;
      text-transform:uppercase;
    }
    .brand span{ color:#00ffea; }
    .sub{
      margin-top:16px; font-size:26px; letter-spacing:10px;
      color:#7b7b7b; text-transform:uppercase;
    }
    .imgBox{
      position:absolute; top:520px; left:50%;
      transform:translateX(-50%);
      width:780px; height:780px;
      border-radius:70px; overflow:hidden;
      border:2px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.03);
      box-shadow:0 50px 120px rgba(0,0,0,.65);
      z-index:5;
    }
    .imgBox img{ width:100%; height:100%; object-fit:cover; display:block; }
    .text{
      position:absolute; top:1330px; left:90px; right:90px;
      text-align:center; z-index:5;
    }
    .title{ font-size:86px; font-weight:900; line-height:1.05; margin:0; }
    .desc{ margin:22px 0 0; color:#a0a0a0; font-size:34px; font-weight:700; }

    .lantern{
      position:absolute; left:90px; bottom:520px;
      font-size:90px; z-index:6;
      display:${showRamadan ? "block" : "none"};
      filter: drop-shadow(0 30px 50px rgba(0,0,0,.75));
    }

    .footer{
      position:absolute; left:0; right:0; bottom:320px;
      text-align:center; color:#6f6f6f;
      font-weight:800; letter-spacing:6px; font-size:26px; z-index:5;
    }

    .bottom{
      position:absolute; left:70px; right:70px; bottom:90px;
      background:#141414; border:2px solid #2a2a2a;
      border-radius:70px; padding:44px 52px;
      display:flex; justify-content:space-between; align-items:center; z-index:5;
    }
    .order{
      background:#fff; color:#000;
      border-radius:50px; padding:22px 40px;
      font-weight:900; font-size:34px;
      display:flex; align-items:center; gap:16px;
    }
    .dot{ width:18px; height:18px; border-radius:50%; background:#00d26a; display:inline-block; }
    .price{ text-align:right; line-height:1; }
    .price small{
      display:block; color:#7a7a7a;
      font-size:22px; letter-spacing:8px; font-weight:900;
    }
    .price b{ font-size:86px; font-weight:900; }
  </style>
</head>
<body>
  <div class="card">
    <div class="glow"></div>

    <div class="badges">
      <div class="pill">${badgeLeft}</div>
      <div class="pill cyan">${badgeRight}</div>
    </div>

    <div class="top">
      <div class="brand">BAROUD <span>APP</span></div>
      <div class="sub">Digital Store Services</div>
    </div>

    <div class="imgBox"><img src="${imgSrc}" /></div>

    <div class="text">
      <h1 class="title">${title}</h1>
      <p class="desc">${desc}</p>
    </div>

    <div class="lantern">🏮</div>

    <div class="footer">+961 70 385 398 • BAROUDAPP.COM</div>

    <div class="bottom">
      <div class="order"><span class="dot"></span> ORDER</div>
      <div class="price">
        <small>PRICE</small>
        <b>${price}</b>
      </div>
    </div>
  </div>
</body>
</html>`;
}

app.get("/", (req, res) => res.send("Poster API running ✅"));

app.post("/render", async (req, res) => {
  const data = req.body || {};
  let browser;

  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

    await page.setContent(buildHTML(data), { waitUntil: "networkidle0" });

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const imgs = Array.from(document.images || []);
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => {
        img.onload = () => r();
        img.onerror = () => r();
      })));
    });

    const png = await page.screenshot({ type: "png" });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'attachment; filename="baroud-poster.png"');
    res.send(png);

  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on", PORT));
