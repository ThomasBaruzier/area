import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import type { AuthenticatedRequest } from "../auth/auth.type";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update.dto";
import type { WorkflowDto } from "./workflows.service";
import { WorkflowsService } from "./workflows.service";

@Controller("api/workflow")
export class WorkflowsController {
  constructor(private readonly workflowService: WorkflowsService) {}

  @UseGuards(AuthGuard("jwt"))
  @Get("list")
  async getWorkflows(@Req() req: AuthenticatedRequest): Promise<WorkflowDto[]> {
    return this.workflowService.getWorkflows(req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("create")
  async createWorkflow(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkflowDto,
  ): Promise<WorkflowDto> {
    return this.workflowService.createWorkflow(req.user.id, dto);
  }

  @UseGuards(AuthGuard("jwt"))
  @Delete("delete/:id")
  async deleteWorkflow(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkflowDto> {
    return this.workflowService.deleteWorkflow(req.user.id, +id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Patch("edit/:id")
  async updateWorkflow(
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkflowDto> {
    return this.workflowService.updateWorkflow(req.user.id, +id, dto);
  }
}
