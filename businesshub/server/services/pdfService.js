"use strict";
/**
 * BusinessHub invoice + receipt PDFs.
 * Same entry point as before: renderDocumentPdf(res, data). It is now ASYNC
 * (it may fetch the business logo), so callers must `await` it.
 *
 * Requires: npm i pdfkit   (Node 18+ for global fetch)
 * Assets:   server/assets/fonts/{Inter-Regular,Inter-SemiBold,Fraunces-SemiBold}.ttf
 *           server/assets/brand/icon.png
 * The built-in PDF fonts have no naira sign, so the bundled fonts are required.
 */
const path = require("path");
const PDFDocument = require("pdfkit");

const FONT_DIR = path.join(__dirname, "..", "assets", "fonts");
const ICON_PATH = path.join(__dirname, "..", "assets", "brand", "icon.png");

const C = {
  ink: "#16211c",
  soft: "#f3f0e9",
  line: "#e6e1d6",
  muted: "#5b5548",
  gold: "#e8a33d",
  white: "#ffffff",
};
const PAGES = {
  Invoice: { size: [595.28, 841.89], m: 48 },
  Receipt: { size: [419.53, 595.28], m: 36 },
};
const METHOD_LABEL = {
  cash: "Cash",
  transfer: "Bank transfer",
  card: "Card",
  paystack: "Paystack",
  other: "Other",
};
const METHOD_PHRASE = {
  cash: "in cash",
  transfer: "by bank transfer",
  card: "by card",
  paystack: "via Paystack",
  other: "",
};

const naira = (n) =>
  `₦${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

// ---------- helpers ----------
function fit(doc, s, maxW) {
  s = String(s ?? "");
  if (!maxW || doc.widthOfString(s) <= maxW) return s;
  while (s.length > 1 && doc.widthOfString(`${s}…`) > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/** Draw one line of text. y is the TOP of the line. align: left | right | center */
function txt(doc, s, x, y, o = {}) {
  const {
    font = "Inter",
    size = 10,
    color = C.ink,
    align = "left",
    spacing = 0,
    maxWidth,
  } = o;
  doc.font(font).fontSize(size).fillColor(color);
  s = fit(doc, s, maxWidth);
  const w = doc.widthOfString(s, { characterSpacing: spacing });
  const x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  doc.text(s, x0, y, { lineBreak: false, characterSpacing: spacing });
}

function rule(doc, x1, x2, y, color = C.line, width = 0.8) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(width).strokeColor(color).stroke();
}

function chip(doc, label, x, y, w, h, size = 9.5) {
  doc.roundedRect(x, y, w, h, 6).lineWidth(1.4).strokeColor(C.gold).stroke();
  txt(doc, label, x + w / 2, y + (h - size) / 2 + 0.5, {
    font: "Inter-SB",
    size,
    align: "center",
    spacing: 1.2,
  });
}

async function fetchLogo(url) {
  if (!url) return null;
  try {
    // Cloudinary: ask for a small PNG (PDFKit can't embed webp/svg)
    const u = url.includes("/upload/")
      ? url.replace("/upload/", "/upload/f_png,w_240,c_limit/")
      : url;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(u, { signal: ctrl.signal });
    clearTimeout(timer);
    return r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

// ---------- main ----------
async function renderDocumentPdf(res, d) {
  const isReceipt = d.docType === "Receipt";
  const { size, m: M } = PAGES[isReceipt ? "Receipt" : "Invoice"];
  const [W, H] = size;
  const biz = d.business || {};
  const cust = d.customer || {};
  const logo = await fetchLogo(biz.logo && biz.logo.url);

  const doc = new PDFDocument({
    size,
    margin: 0,
    bufferPages: true,
    info: {
      Title: `${d.docType} ${d.docNumber}`,
      Author: biz.name || "BusinessHub",
    },
  });
  doc.registerFont("Inter", path.join(FONT_DIR, "Inter-Regular.ttf"));
  doc.registerFont("Inter-SB", path.join(FONT_DIR, "Inter-SemiBold.ttf"));
  doc.registerFont("Fraunces", path.join(FONT_DIR, "Fraunces-SemiBold.ttf"));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${d.docType}-${d.docNumber}.pdf"`,
  );
  doc.pipe(res);

  const ensure = (y, h) => {
    if (y + h > H - 84) {
      doc.addPage();
      return M;
    }
    return y;
  };

  // ----- header: business first, BusinessHub stays quiet -----
  const top = isReceipt ? 40 : 56;
  const nameSize = isReceipt ? 22 : 26;
  const numSize = isReceipt ? 16 : 20;
  let nameX = M;
  if (logo) {
    try {
      doc.image(logo, M, top, { fit: [44, 44] });
      nameX = M + 56;
    } catch {
      /* unsupported image: skip logo */
    }
  }
  const rightBlock = 170;
  txt(doc, biz.name || "Your business", nameX, top, {
    font: "Fraunces",
    size: nameSize,
    maxWidth: W - M - nameX - rightBlock,
  });
  const addr = [
    biz.address,
    biz.location && biz.location.city,
    biz.location && biz.location.state,
  ]
    .filter(Boolean)
    .join(", ");
  const phone = biz.whatsapp
    ? `WhatsApp: ${biz.whatsapp}`
    : biz.phone
      ? `Phone: ${biz.phone}`
      : "";
  [addr, phone]
    .filter(Boolean)
    .forEach((line, i) =>
      txt(doc, line, nameX, top + nameSize + 8 + i * 14, {
        size: 9.5,
        color: C.muted,
        maxWidth: W - M - nameX - rightBlock,
      }),
    );

  txt(doc, d.docType.toUpperCase(), W - M, top + 2, {
    font: "Inter-SB",
    size: 8.5,
    color: C.muted,
    align: "right",
    spacing: 1.6,
  });
  txt(doc, d.docNumber, W - M, top + 14, {
    font: "Fraunces",
    size: numSize,
    align: "right",
  });
  if (isReceipt) {
    txt(doc, fmtDate(d.issuedAt || new Date()), W - M, top + 38, {
      size: 9,
      color: C.muted,
      align: "right",
    });
  } else {
    txt(doc, `Issued ${fmtDate(d.issuedAt || new Date())}`, W - M, top + 42, {
      size: 9.5,
      color: C.muted,
      align: "right",
    });
    if (d.dueDate)
      txt(doc, `Due ${fmtDate(d.dueDate)}`, W - M, top + 56, {
        font: "Inter-SB",
        size: 9.5,
        align: "right",
      });
  }
  const ruleY = top + (isReceipt ? 62 : 76);
  rule(doc, M, W - M, ruleY, C.gold, 1.6);
  let y = ruleY + (isReceipt ? 22 : 24);

  // ----- invoice: billed-to + status | receipt: amount received -----
  if (!isReceipt) {
    txt(doc, "BILLED TO", M, y, {
      font: "Inter-SB",
      size: 8,
      color: C.muted,
      spacing: 1.4,
    });
    txt(doc, cust.name || "Customer", M, y + 16, {
      font: "Inter-SB",
      size: 12,
      maxWidth: 300,
    });
    if (cust.phone)
      txt(doc, cust.phone, M, y + 33, { size: 9.5, color: C.muted });
    const overdue =
      d.status !== "paid" && d.dueDate && new Date(d.dueDate) < new Date();
    chip(
      doc,
      d.status === "paid" ? "PAID" : overdue ? "OVERDUE" : "UNPAID",
      W - M - 84,
      y - 2,
      84,
      30,
    );
    y += 68;
  } else {
    chip(doc, "PAID", W / 2 - 30, y, 60, 24, 9);
    y += 24 + 14;
    txt(doc, "AMOUNT RECEIVED", W / 2, y, {
      font: "Inter-SB",
      size: 8,
      color: C.muted,
      align: "center",
      spacing: 1.6,
    });
    y += 18;
    txt(doc, naira(d.total), W / 2, y, {
      font: "Fraunces",
      size: 40,
      align: "center",
    });
    y += 48;
    const phrase = METHOD_PHRASE[d.paymentMethod] || "";
    txt(
      doc,
      `Paid ${phrase ? `${phrase} ` : ""}on ${fmtDate(d.issuedAt || new Date())}`,
      W / 2,
      y,
      { size: 9.5, color: C.muted, align: "center" },
    );
    y += 24;
    rule(doc, M, W - M, y);
    y += 12;
    const cells = [
      ["RECEIVED FROM", cust.name || "Customer"],
      ["PAYMENT METHOD", METHOD_LABEL[d.paymentMethod] || "Cash"],
      d.invoiceNumber
        ? ["FOR INVOICE", d.invoiceNumber]
        : ["DATE", fmtDate(d.issuedAt || new Date())],
    ];
    const colW = (W - 2 * M) / 3;
    cells.forEach(([k, v], i) => {
      txt(doc, k, M + i * colW, y, {
        font: "Inter-SB",
        size: 7,
        color: C.muted,
        spacing: 1.2,
      });
      txt(doc, v, M + i * colW, y + 14, {
        font: "Inter-SB",
        size: 10,
        maxWidth: colW - 8,
      });
    });
    y += 34;
    rule(doc, M, W - M, y);
    y += 18;
  }

  // ----- items table -----
  const cols = isReceipt
    ? { item: M + 14, qty: W - M - 110, unit: null, amt: W - M - 14 }
    : { item: M + 14, qty: W - M - 250, unit: W - M - 140, amt: W - M - 14 };
  const itemMax = cols.qty - 36 - cols.item;
  const tableHead = () => {
    doc
      .rect(M, y, W - 2 * M, 28)
      .fillColor(C.ink)
      .fill();
    const hy = y + 9.5;
    txt(doc, "Item", cols.item, hy, {
      font: "Inter-SB",
      size: 9,
      color: C.white,
    });
    txt(doc, "Qty", cols.qty, hy, {
      font: "Inter-SB",
      size: 9,
      color: C.white,
      align: "right",
    });
    if (cols.unit)
      txt(doc, "Unit price", cols.unit, hy, {
        font: "Inter-SB",
        size: 9,
        color: C.white,
        align: "right",
      });
    txt(doc, "Amount", cols.amt, hy, {
      font: "Inter-SB",
      size: 9,
      color: C.white,
      align: "right",
    });
    y += 28;
  };
  tableHead();
  (d.items || []).forEach((it) => {
    if (y + 34 > H - 150) {
      doc.addPage();
      y = M;
      tableHead();
    }
    const ry = y + 11;
    txt(doc, it.description || it.name || "Item", cols.item, ry, {
      font: "Inter-SB",
      size: 10.5,
      maxWidth: itemMax,
    });
    txt(doc, String(it.quantity), cols.qty, ry, {
      size: 10.5,
      color: C.muted,
      align: "right",
    });
    if (cols.unit)
      txt(doc, naira(it.price), cols.unit, ry, {
        size: 10.5,
        color: C.muted,
        align: "right",
      });
    txt(doc, naira(it.price * it.quantity), cols.amt, ry, {
      size: 10.5,
      align: "right",
    });
    y += 34;
    rule(doc, M, W - M, y);
  });

  // ----- totals -----
  const extra = [];
  if (!isReceipt) {
    extra.push(["Subtotal", naira(d.subtotal)]);
    if (d.discount > 0) extra.push(["Discount", `−${naira(d.discount)}`]);
    if (d.tax > 0) extra.push(["Tax", naira(d.tax)]);
  }
  y = ensure(y + 18, extra.length * 20 + 60);
  const lx = W - M - 200;
  extra.forEach(([k, v]) => {
    txt(doc, k, lx, y, { size: 10, color: C.muted });
    txt(doc, v, W - M - 14, y, { size: 10, align: "right" });
    y += 20;
  });
  if (extra.length) {
    rule(doc, lx, W - M, y - 4);
    y += 6;
  }
  txt(
    doc,
    isReceipt ? "Total paid" : d.status === "paid" ? "Total" : "Total due",
    lx,
    y + 8,
    { font: "Inter-SB", size: 11 },
  );
  txt(doc, naira(d.total), W - M - 14, y, {
    font: "Fraunces",
    size: isReceipt ? 18 : 24,
    align: "right",
  });
  y += isReceipt ? 34 : 56;

  // ----- invoice only: how to pay -----
  const bank = biz.bankDetails || {};
  if (!isReceipt && d.status !== "paid" && bank.accountNumber) {
    const rows = [
      ["Bank", bank.bankName],
      ["Account name", bank.accountName],
      ["Account number", bank.accountNumber],
    ].filter(([, v]) => v);
    const boxH = 62 + rows.length * 16;
    y = ensure(y, boxH + 20);
    doc
      .roundedRect(M, y, 300, boxH, 8)
      .lineWidth(0.8)
      .fillAndStroke(C.soft, C.line);
    txt(doc, "HOW TO PAY", M + 16, y + 14, {
      font: "Inter-SB",
      size: 8,
      color: C.muted,
      spacing: 1.4,
    });
    rows.forEach(([k, v], i) => {
      txt(doc, k, M + 16, y + 34 + i * 16, { size: 9.5, color: C.muted });
      txt(doc, v, M + 120, y + 34 + i * 16, {
        font: "Inter-SB",
        size: 10,
        maxWidth: 164,
      });
    });
    txt(
      doc,
      `Please use ${d.docNumber} as your payment reference.`,
      M + 16,
      y + 38 + rows.length * 16,
      { size: 8.5, color: C.muted },
    );
    y += boxH + 22;
  }

  // ----- notes + thank you -----
  if (!isReceipt && d.notes) {
    y = ensure(y, 60);
    txt(doc, "NOTES", M, y, {
      font: "Inter-SB",
      size: 8,
      color: C.muted,
      spacing: 1.4,
    });
    doc
      .font("Inter")
      .fontSize(9.5)
      .fillColor(C.muted)
      .text(d.notes, M, y + 14, { width: 330 });
    y += 14 + doc.heightOfString(d.notes, { width: 330 }) + 18;
  }
  y = ensure(y, isReceipt ? 22 : 48);
  txt(
    doc,
    isReceipt ? "Thank you for your business." : "Thank you for your order.",
    M,
    y,
    { font: "Fraunces", size: isReceipt ? 13 : 14 },
  );
  if (!isReceipt && biz.whatsapp)
    txt(doc, `Questions? Message us on WhatsApp: ${biz.whatsapp}`, M, y + 20, {
      size: 9.5,
      color: C.muted,
    });

  // ----- footer on every page: quiet BusinessHub credit (hidden on Starter/Pro) -----
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    if (!biz.hideBranding || pages.count > 1) rule(doc, M, W - M, H - 64);
    if (!biz.hideBranding) {
      try {
        doc.image(ICON_PATH, M, H - 56, { width: 16, height: 16 });
      } catch {
        /* icon missing: skip */
      }
      txt(doc, "Made with BusinessHub", M + 24, H - 52, {
        size: 8.5,
        color: C.muted,
      });
    }
    if (pages.count > 1)
      txt(doc, `Page ${i + 1} of ${pages.count}`, W - M, H - 52, {
        size: 8.5,
        color: C.muted,
        align: "right",
      });
  }
  doc.end();
}

module.exports = { renderDocumentPdf };
