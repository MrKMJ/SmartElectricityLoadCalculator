import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

// Every sizing engine accepts explicit load figures OR falls back to the
// project's most recent calculation, so the frontend can jump straight
// from "Calculate Load" to "Size Inverter" without re-entering numbers.
export async function getLatestCalculationOrThrow(prisma: PrismaService, projectId: string) {
  const latest = await prisma.calculation.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) {
    throw new BadRequestException(
      "No calculation exists yet for this project. Run POST /projects/:projectId/calculations first, or supply the load figures explicitly.",
    );
  }
  return latest;
}
