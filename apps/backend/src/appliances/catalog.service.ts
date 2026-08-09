import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateCatalogApplianceDto, CreateCategoryDto, UpdateCatalogApplianceDto } from "./dto/catalog.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.applianceCategory.findMany({ orderBy: { name: "asc" } });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.applianceCategory.create({ data: dto });
  }

  async search(filters: {
    category?: string;
    q?: string;
    minWatts?: string;
    maxWatts?: string;
    voltage?: string;
  }) {
    return this.prisma.applianceCatalog.findMany({
      where: {
        status: "active",
        category: filters.category ? { slug: filters.category } : undefined,
        name: filters.q ? { contains: filters.q, mode: "insensitive" } : undefined,
        ratedWatts: {
          gte: filters.minWatts ? Number(filters.minWatts) : undefined,
          lte: filters.maxWatts ? Number(filters.maxWatts) : undefined,
        },
        voltage: filters.voltage ? Number(filters.voltage) : undefined,
      },
      include: { category: true },
      orderBy: { name: "asc" },
      take: 200,
    });
  }

  async findOne(id: string) {
    const appliance = await this.prisma.applianceCatalog.findUnique({ where: { id }, include: { category: true } });
    if (!appliance) throw new NotFoundException("Catalog appliance not found.");
    return appliance;
  }

  create(dto: CreateCatalogApplianceDto) {
    return this.prisma.applianceCatalog.create({ data: dto as any });
  }

  async update(id: string, dto: UpdateCatalogApplianceDto) {
    await this.findOne(id);
    return this.prisma.applianceCatalog.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.applianceCatalog.update({ where: { id }, data: { status: "archived" } });
    return { archived: true };
  }
}
