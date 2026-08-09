import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../common/guards/project-access.guard";
import { CurrentUser, AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@ApiTags("projects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @UseGuards(ProjectAccessGuard)
  @Get(":projectId")
  findOne(@Param("projectId") projectId: string) {
    return this.projectsService.findOne(projectId);
  }

  @UseGuards(ProjectAccessGuard)
  @Patch(":projectId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.id, projectId, dto);
  }

  @UseGuards(ProjectAccessGuard)
  @Delete(":projectId")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("projectId") projectId: string) {
    return this.projectsService.remove(user.id, projectId);
  }

  @UseGuards(ProjectAccessGuard)
  @Get(":projectId/members")
  listMembers(@Param("projectId") projectId: string) {
    return this.projectsService.listMembers(projectId);
  }

  @UseGuards(ProjectAccessGuard)
  @Post(":projectId/members")
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.projectsService.addMember(user.id, projectId, dto);
  }

  @UseGuards(ProjectAccessGuard)
  @Patch(":projectId/members/:memberId")
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string,
    @Body() dto: { role: string },
  ) {
    return this.projectsService.updateMemberRole(user.id, projectId, memberId, dto.role);
  }

  @UseGuards(ProjectAccessGuard)
  @Delete(":projectId/members/:memberId")
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string,
  ) {
    return this.projectsService.removeMember(user.id, projectId, memberId);
  }
}
