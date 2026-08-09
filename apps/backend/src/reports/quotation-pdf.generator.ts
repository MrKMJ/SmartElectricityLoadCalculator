import PDFDocument from "pdfkit";

export interface QuotationLineItem {
  label: string;
  description?: string;
  unitCost: number;
  quantity: number;
}

export interface QuotationData {
  projectName: string;
  generatedAt: Date;
  currency: string;
  branding: { companyName?: string | null; brandColorHex?: string | null; logoDataUrl?: string | null };
  preparedBy: { name: string; email: string };
  systemSummary: {
    peakWatts?: number | null;
    monthlyKwh?: number | null;
    inverterKva?: number | null;
    batteryAh?: number | null;
    solarKw?: number | null;
    generatorKva?: number | null;
  };
  lineItems: QuotationLineItem[];
}

// White-label Customer Quotation (Architecture.docx "Advanced / Premium
// Features": Customer quotation generator, Solar proposal builder,
// White-label reports). Uses the requesting installer's saved branding
// (company name / color / logo) rather than the app's own.
export function generateQuotationPdf(data: QuotationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const brandColor = data.branding.brandColorHex ?? "#18813f";

    if (data.branding.logoDataUrl) {
      try {
        const base64 = data.branding.logoDataUrl.split(",")[1];
        doc.image(Buffer.from(base64, "base64"), { width: 80 });
        doc.moveDown(0.5);
      } catch {
        // Malformed logo data — skip it rather than fail the whole quote.
      }
    }

    doc
      .fontSize(20)
      .fillColor(brandColor)
      .text(data.branding.companyName || "System Quotation", { align: "left" });
    doc
      .fontSize(12)
      .fillColor("#555")
      .text(`Quotation for: ${data.projectName}`)
      .fontSize(9)
      .fillColor("#888")
      .text(`Prepared by ${data.preparedBy.name} (${data.preparedBy.email})`)
      .text(`Generated ${data.generatedAt.toISOString()}`)
      .moveDown(1);
    doc.fillColor("#000");

    section(doc, brandColor, "System Summary");
    const s = data.systemSummary;
    keyValueTable(doc, [
      ["Peak demand", s.peakWatts != null ? formatWatts(s.peakWatts) : "—"],
      ["Monthly consumption", s.monthlyKwh != null ? `${s.monthlyKwh.toFixed(1)} kWh` : "—"],
      ["Inverter", s.inverterKva != null ? `${s.inverterKva.toFixed(2)} kVA` : "—"],
      ["Battery", s.batteryAh != null ? `${s.batteryAh.toFixed(0)} Ah` : "—"],
      ["Solar", s.solarKw != null ? `${s.solarKw.toFixed(2)} kW` : "—"],
      ["Generator", s.generatorKva != null ? `${s.generatorKva.toFixed(2)} kVA` : "—"],
    ]);

    section(doc, brandColor, "Itemized Quote");
    const colX = { label: 50, qty: 300, unit: 360, total: 460 };
    doc.fontSize(9).fillColor("#888");
    doc.text("ITEM", colX.label, doc.y, { continued: false });
    doc.text("QTY", colX.qty, doc.y - doc.currentLineHeight());
    doc.text("UNIT COST", colX.unit, doc.y - doc.currentLineHeight());
    doc.text("TOTAL", colX.total, doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#ddd")
      .stroke();
    doc.moveDown(0.3);

    let grandTotal = 0;
    doc.fillColor("#000").fontSize(10);
    for (const item of data.lineItems) {
      const lineTotal = item.unitCost * item.quantity;
      grandTotal += lineTotal;
      const y = doc.y;
      doc.text(item.label, colX.label, y, { width: 240 });
      if (item.description) {
        doc.fontSize(8).fillColor("#888").text(item.description, colX.label, doc.y, { width: 240 });
        doc.fontSize(10).fillColor("#000");
      }
      doc.text(String(item.quantity), colX.qty, y);
      doc.text(formatMoney(item.unitCost, data.currency), colX.unit, y);
      doc.text(formatMoney(lineTotal, data.currency), colX.total, y);
      doc.moveDown(0.6);
    }

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#ddd")
      .stroke();
    doc.moveDown(0.4);
    doc
      .fontSize(13)
      .fillColor(brandColor)
      .text(`Total: ${formatMoney(grandTotal, data.currency)}`, { align: "right" });
    doc.fillColor("#000");

    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor("#999")
      .text(
        "This quotation is an estimate based on the system sizing calculated in Smart Energy Load Calculator. Final pricing, availability, and installation terms are subject to confirmation.",
      );

    doc.end();
  });
}

function section(doc: PDFKit.PDFDocument, color: string, title: string) {
  doc.moveDown(0.8).fontSize(13).fillColor(color).text(title, { underline: true }).fillColor("#000").moveDown(0.3);
}

function keyValueTable(doc: PDFKit.PDFDocument, rows: Array<[string, string]>) {
  doc.fontSize(10);
  for (const [key, value] of rows) {
    doc.text(`${key}: `, { continued: true }).fillColor("#333").text(value).fillColor("#000");
  }
  doc.moveDown(0.3);
}

function formatWatts(w: number): string {
  return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(0)} W`;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
