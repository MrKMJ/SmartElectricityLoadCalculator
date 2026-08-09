import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Cooling", slug: "cooling", icon: "❄️" },
  { name: "Heating", slug: "heating", icon: "🔥" },
  { name: "Kitchen", slug: "kitchen", icon: "🍳" },
  { name: "Lighting", slug: "lighting", icon: "💡" },
  { name: "Electronics", slug: "electronics", icon: "📺" },
  { name: "Laundry", slug: "laundry", icon: "🧺" },
  { name: "Water Pumping", slug: "water-pumping", icon: "🚰" },
  { name: "Other", slug: "other", icon: "🔌" },
];

// Representative catalog with realistic running/surge wattage ranges.
const CATALOG: Array<{
  category: string;
  name: string;
  ratedWatts: number;
  surgeWatts?: number;
  voltage?: number;
  powerFactor?: number;
  standbyWatts?: number;
}> = [
  { category: "cooling", name: "Split Air Conditioner (1.5 Ton)", ratedWatts: 1500, surgeWatts: 3500, powerFactor: 0.85 },
  { category: "cooling", name: "Split Air Conditioner (1 Ton)", ratedWatts: 1000, surgeWatts: 2400, powerFactor: 0.85 },
  { category: "cooling", name: "Window Air Conditioner", ratedWatts: 1200, surgeWatts: 2800, powerFactor: 0.85 },
  { category: "cooling", name: "Ceiling Fan", ratedWatts: 75, surgeWatts: 150, powerFactor: 0.95 },
  { category: "cooling", name: "Pedestal Fan", ratedWatts: 55, surgeWatts: 100 },
  { category: "cooling", name: "Evaporative Air Cooler", ratedWatts: 200, surgeWatts: 400 },
  { category: "heating", name: "Electric Space Heater", ratedWatts: 2000, surgeWatts: 2000 },
  { category: "heating", name: "Electric Water Heater / Geyser", ratedWatts: 2000, surgeWatts: 2000 },
  { category: "kitchen", name: "Refrigerator (Medium)", ratedWatts: 200, surgeWatts: 800, standbyWatts: 60 },
  { category: "kitchen", name: "Refrigerator (Large / Double-door)", ratedWatts: 300, surgeWatts: 1200, standbyWatts: 90 },
  { category: "kitchen", name: "Microwave Oven", ratedWatts: 1200, surgeWatts: 1400 },
  { category: "kitchen", name: "Electric Kettle", ratedWatts: 1500, surgeWatts: 1500 },
  { category: "kitchen", name: "Toaster", ratedWatts: 800, surgeWatts: 800 },
  { category: "kitchen", name: "Blender / Mixer", ratedWatts: 400, surgeWatts: 700 },
  { category: "kitchen", name: "Electric Oven", ratedWatts: 2400, surgeWatts: 2400 },
  { category: "lighting", name: "LED Bulb (9W)", ratedWatts: 9, surgeWatts: 9 },
  { category: "lighting", name: "LED Tube Light", ratedWatts: 18, surgeWatts: 18 },
  { category: "lighting", name: "CFL Bulb", ratedWatts: 15, surgeWatts: 15 },
  { category: "electronics", name: "LED TV (43\")", ratedWatts: 90, surgeWatts: 120, standbyWatts: 5 },
  { category: "electronics", name: "Desktop Computer", ratedWatts: 200, surgeWatts: 300 },
  { category: "electronics", name: "Laptop", ratedWatts: 65, surgeWatts: 90 },
  { category: "electronics", name: "Wi-Fi Router", ratedWatts: 10, surgeWatts: 10 },
  { category: "electronics", name: "Set-Top Box", ratedWatts: 15, surgeWatts: 15, standbyWatts: 5 },
  { category: "electronics", name: "Gaming Console", ratedWatts: 150, surgeWatts: 200 },
  { category: "laundry", name: "Washing Machine (Top Load)", ratedWatts: 500, surgeWatts: 1400 },
  { category: "laundry", name: "Washing Machine (Front Load)", ratedWatts: 800, surgeWatts: 2000 },
  { category: "laundry", name: "Clothes Iron", ratedWatts: 1000, surgeWatts: 1000 },
  { category: "laundry", name: "Clothes Dryer", ratedWatts: 3000, surgeWatts: 3200 },
  { category: "water-pumping", name: "Water Pump (0.5 HP)", ratedWatts: 370, surgeWatts: 1100, powerFactor: 0.8 },
  { category: "water-pumping", name: "Water Pump (1 HP)", ratedWatts: 750, surgeWatts: 2200, powerFactor: 0.8 },
  { category: "other", name: "Security Camera (per unit)", ratedWatts: 10, surgeWatts: 10 },
  { category: "other", name: "Electric Garage Door Opener", ratedWatts: 350, surgeWatts: 900 },
];

// A representative tiered/slab residential tariff, close in shape to the
// example in Architecture.docx §16 (Comparison table: current bill $180).
const SAMPLE_TARIFF = {
  provider: "Sample Utility Co.",
  countryCode: "US",
  region: "Generic",
  currency: "USD",
  name: "Residential Tiered Rate",
  slabs: [
    { minKwh: 0, maxKwh: 100, ratePerKwh: 0.08, fixedCharge: 5, taxRatePct: 5 },
    { minKwh: 100, maxKwh: 300, ratePerKwh: 0.12, fixedCharge: 5, taxRatePct: 5 },
    { minKwh: 300, maxKwh: 600, ratePerKwh: 0.16, fixedCharge: 5, taxRatePct: 8 },
    { minKwh: 600, maxKwh: null, ratePerKwh: 0.22, fixedCharge: 5, taxRatePct: 8 },
  ],
};

async function main() {
  console.log("Seeding appliance categories...");
  const categoryBySlug: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const created = await prisma.applianceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: cat,
    });
    categoryBySlug[cat.slug] = created.id;
  }

  console.log("Seeding appliance catalog...");
  for (const item of CATALOG) {
    const existing = await prisma.applianceCatalog.findFirst({ where: { name: item.name } });
    if (existing) continue;
    await prisma.applianceCatalog.create({
      data: {
        categoryId: categoryBySlug[item.category],
        name: item.name,
        ratedWatts: item.ratedWatts,
        surgeWatts: item.surgeWatts ?? item.ratedWatts,
        voltage: item.voltage ?? 230,
        powerFactor: item.powerFactor ?? 0.9,
        standbyWatts: item.standbyWatts ?? 0,
      },
    });
  }

  console.log("Seeding sample tariff...");
  const existingTariff = await prisma.tariff.findFirst({ where: { name: SAMPLE_TARIFF.name } });
  if (!existingTariff) {
    await prisma.tariff.create({
      data: {
        provider: SAMPLE_TARIFF.provider,
        countryCode: SAMPLE_TARIFF.countryCode,
        region: SAMPLE_TARIFF.region,
        currency: SAMPLE_TARIFF.currency,
        name: SAMPLE_TARIFF.name,
        slabs: {
          create: SAMPLE_TARIFF.slabs.map((s, index) => ({ ...s, sortOrder: index })),
        },
      },
    });
  }

  console.log("Seeding demo admin account (admin@example.com / ChangeMe123!)...");
  const adminEmail = "admin@example.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash("ChangeMe123!", 12),
        name: "Admin",
        role: "SUPER_ADMIN",
        emailVerifiedAt: new Date(),
        preference: { create: {} },
        subscription: { create: { plan: "ENTERPRISE" } },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
