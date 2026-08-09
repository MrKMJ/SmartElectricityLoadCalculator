import PDFDocument from "pdfkit";

export interface ReportData {
  projectName: string;
  generatedAt: Date;
  appliances: Array<{ name: string; quantity: number; ratedWatts: number; hoursPerDay: number }>;
  connectedWatts?: number | null;
  runningWatts?: number | null;
  peakWatts?: number | null;
  surgeWatts?: number | null;
  dailyKwh?: number | null;
  monthlyKwh?: number | null;
  annualKwh?: number | null;
  estimatedBill?: number | null;
  currency: string;
  inverter?: { recommendedInverterVA: number; recommendedKva: number } | null;
  battery?: { requiredAh: number; numberOfBatteries: number; configuration: string } | null;
  solar?: { requiredKw: number; panelQuantity: number; estimatedMonthlyGenKwh: number } | null;
  generator?: { recommendedKva: number } | null;
  recommendations: Array<{ severity: string; message: string }>;
}

// Smart Reports (Architecture.docx §15): home summary, appliance
// inventory, connected/running/peak/surge load, consumption, bill,
// system-sizing recommendations and warnings, all in a single PDF.
export function generateProjectReportPdf(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Smart Energy Load Calculator", { align: "left" });
    doc.fontSize(14).fillColor("#555").text(`Report: ${data.projectName}`);
    doc
      .fontSize(9)
      .fillColor("#888")
      .text(`Generated ${data.generatedAt.toISOString()}`)
      .moveDown(1);
    doc.fillColor("#000");

    section(doc, "Load Summary");
    keyValueTable(doc, [
      ["Connected load", formatWatts(data.connectedWatts)],
      ["Running load", formatWatts(data.runningWatts)],
      ["Peak demand", formatWatts(data.peakWatts)],
      ["Peak surge", formatWatts(data.surgeWatts)],
      ["Daily consumption", formatKwh(data.dailyKwh)],
      ["Monthly consumption", formatKwh(data.monthlyKwh)],
      ["Annual consumption", formatKwh(data.annualKwh)],
      ["Estimated monthly bill", data.estimatedBill != null ? `${data.currency} ${data.estimatedBill.toFixed(2)}` : "—"],
    ]);

    section(doc, "System Recommendations");
    keyValueTable(doc, [
      ["Inverter", data.inverter ? `${data.inverter.recommendedKva.toFixed(2)} kVA` : "Not calculated"],
      [
        "Battery",
        data.battery
          ? `${data.battery.numberOfBatteries} × battery (${data.battery.configuration}), ${data.battery.requiredAh.toFixed(0)} Ah total`
          : "Not calculated",
      ],
      [
        "Solar",
        data.solar
          ? `${data.solar.requiredKw.toFixed(2)} kW (${data.solar.panelQuantity} panels), ~${data.solar.estimatedMonthlyGenKwh.toFixed(0)} kWh/month`
          : "Not calculated",
      ],
      ["Generator", data.generator ? `${data.generator.recommendedKva.toFixed(2)} kVA` : "Not calculated"],
    ]);

    section(doc, "Appliance Inventory");
    if (data.appliances.length === 0) {
      doc.fontSize(10).text("No appliances recorded.");
    } else {
      for (const a of data.appliances) {
        doc
          .fontSize(10)
          .text(`${a.quantity} × ${a.name} — ${a.ratedWatts} W, ${a.hoursPerDay} hr/day`);
      }
    }
    doc.moveDown(0.5);

    section(doc, "Warnings & Recommendations");
    if (data.recommendations.length === 0) {
      doc.fontSize(10).fillColor("#2a7").text("No issues detected.");
      doc.fillColor("#000");
    } else {
      for (const r of data.recommendations) {
        doc
          .fontSize(10)
          .fillColor(r.severity === "CRITICAL" ? "#c33" : r.severity === "WARNING" ? "#c80" : "#333")
          .text(`[${r.severity}] ${r.message}`);
      }
      doc.fillColor("#000");
    }

    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor("#999")
      .text(
        "This report provides estimates for planning purposes only. It is not a substitute for local electrical-code requirements or assessment by a qualified electrician.",
        { align: "left" },
      );

    doc.end();
  });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8).fontSize(13).fillColor("#000").text(title, { underline: true }).moveDown(0.3);
}

function keyValueTable(doc: PDFKit.PDFDocument, rows: Array<[string, string]>) {
  doc.fontSize(10);
  for (const [key, value] of rows) {
    doc.text(`${key}: `, { continued: true }).fillColor("#333").text(value).fillColor("#000");
  }
  doc.moveDown(0.3);
}

function formatWatts(w?: number | null): string {
  if (w == null) return "—";
  return w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(0)} W`;
}

function formatKwh(k?: number | null): string {
  if (k == null) return "—";
  return `${k.toFixed(2)} kWh`;
}
