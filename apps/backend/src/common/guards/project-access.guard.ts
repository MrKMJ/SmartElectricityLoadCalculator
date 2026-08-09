import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Enforces the multi-tenant security boundary documented in the architecture:
// a request scoped to :projectId must belong to the current user, either as
// owner or as an accepted project member. Never trust the ID in the URL alone.
@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const projectId: string | undefined = request.params?.projectId;
    const user = request.user;

    if (!projectId) return true; // route doesn't touch a specific project
    if (!user) throw new ForbiddenException("Authentication required.");

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { members: { where: { userId: user.id } } },
    });

    if (!project) throw new NotFoundException("Project not found.");

    const isOwner = project.ownerId === user.id;
    const isMember = project.members.length > 0;
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    if (!isOwner && !isMember && !isAdmin) {
      throw new ForbiddenException("You do not have access to this project.");
    }

    request.project = project;
    request.projectRole = isOwner ? "OWNER" : isAdmin ? "ADMIN" : project.members[0]?.role;
    return true;
  }
}
