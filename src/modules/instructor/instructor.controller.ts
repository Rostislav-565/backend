import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { InstructorService } from './instructor.service';
import { CreateLessonDto } from './dto/lesson.dto';



@Controller('instructor')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  private getUserId(req: any): number {
    return req?.user?.id || 3; 
  }

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.instructorService.getProfile(this.getUserId(req));
  }

  @Get('theory-group')
  getTheoryGroup(@Req() req: any) {
    return this.instructorService.getTheoryGroup(this.getUserId(req));
  }

  @Get('lessons')
  getLessons(@Req() req: any) {
    return this.instructorService.getLessons(this.getUserId(req));
  }

  @Post('lessons')
  createLesson(@Req() req: any, @Body() dto: CreateLessonDto) {
    return this.instructorService.createLesson(this.getUserId(req), dto);
  }

  @Patch('lessons/:id')
  updateLesson(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.instructorService.updateLesson(this.getUserId(req), +id, dto);
  }

  @Delete('lessons/:id')
  deleteLesson(@Req() req: any, @Param('id') id: string) {
    return this.instructorService.deleteLesson(this.getUserId(req), +id);
  }
}