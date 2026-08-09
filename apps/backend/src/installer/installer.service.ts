import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class InstallerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cross-project "client" view (Architecture.docx: installer/professional
   * mode). Distinct from GET /projects mainly in framing and the extra
   * owner-contact + latest-snapshot fields that matter when you're managing
   * someone else's property rather than your own.
   */
  async listClients(userId: string) {
    const owned = await this.prisma.project.findMany({
      where: { ownerId: userId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { appliances: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const shared = await this.prisma.project.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { where: { userId } },
        _count: { select: { appliances: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const projectIds = [...owned.map((p) => p.id), ...shared.map((p) => p.id)];
    const latestCalcs = await this.prisma.calculation.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["projectId"],
    });
    const calcByProject = new Map(latestCalcs.map((c) => [c.projectId, c]));

    const toRow = (p: (typeof owned)[number] | (typeof shared)[number], relationship: "OWNER" | string) => {
      const calc = calcByProject.get(p.id);
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        currency: p.currency,
        applianceCount: p._count.appliances,
        relationship,
        owner: { name: p.owner.name, email: p.owner.email },
        latestCalculation: calc
          ? {
              peakWatts: calc.peakWatts,
              monthlyKwh: calc.monthlyKwh,
              estimatedBill: calc.estimatedBill,
              createdAt: calc.createdAt,
            }
          : null,
        updatedAt: p.updatedAt,
      };
    };

    return [
      ...owned.map((p) => toRow(p, "OWNER")),
      ...shared.map((p) => toRow(p, (p as any).members[0]?.role ?? "MEMBER")),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}
