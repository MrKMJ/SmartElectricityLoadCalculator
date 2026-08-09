import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateTariffDto, SelectProjectTariffDto } from "./dto/tariff.dto";

@Injectable()
export class TariffsService {
  constructor(private readonly prisma: PrismaService) {}

  list(countryCode?: string) {
    return this.prisma.tariff.findMany({
      where: { status: "active", countryCode: countryCode ?? undefined },
      include: { slabs: { orderBy: { minKwh: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  async findOne(tariffId: string) {
    const tariff = await this.prisma.tariff.findUnique({
      where: { id: tariffId },
      include: { slabs: { orderBy: { minKwh: "asc" } } },
    });
    if (!tariff) throw new NotFoundException("Tariff not found.");
    return tariff;
  }

  slabs(tariffId: string) {
    return this.prisma.tariffSlab.findMany({ where: { tariffId }, orderBy: { minKwh: "asc" } });
  }

  create(dto: CreateTariffDto) {
    return this.prisma.tariff.create({
      data: {
        provider: dto.provider,
        countryCode: dto.countryCode,
        region: dto.region,
        currency: dto.currency,
        name: dto.name,
        slabs: {
          create: dto.slabs.map((s, index) => ({
            minKwh: s.minKwh,
            maxKwh: s.maxKwh ?? null,
            ratePerKwh: s.ratePerKwh,
            fixedCharge: s.fixedCharge ?? 0,
            taxRatePct: s.taxRatePct ?? 0,
            sortOrder: index,
          })),
        },
      },
      include: { slabs: true },
    });
  }

  async remove(tariffId: string) {
    await this.findOne(tariffId);
    await this.prisma.tariff.update({ where: { id: tariffId }, data: { status: "archived" } });
    return { archived: true };
  }

  async getProjectTariff(projectId: string) {
    return this.prisma.projectTariff.findUnique({
      where: { projectId },
      include: { tariff: { include: { slabs: true } } },
    });
  }

  async setProjectTariff(projectId: string, dto: SelectProjectTariffDto) {
    await this.findOne(dto.tariffId);
    return this.prisma.projectTariff.upsert({
      where: { projectId },
      update: { tariffId: dto.tariffId },
      create: { projectId, tariffId: dto.tariffId },
      include: { tariff: { include: { slabs: true } } },
    });
  }
}
