import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() createGroupDto: { name: string; courseId: number; startDate?: string; endDate?: string }) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupsService.getAllGroups();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateGroupDto: { name?: string; courseId?: number; startDate?: string; endDate?: string }
  ) {
    return this.groupsService.updateGroup(id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.deleteGroup(id);
  }
}