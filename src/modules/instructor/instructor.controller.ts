import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { InstructorService } from './instructor.service';
import { CreateLessonDto } from './dto/lesson.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('instructor')
@UseGuards(AuthGuard('jwt'))
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  private getUserId(req: any): number {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
    return userId; 
  }

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.instructorService.getProfile(this.getUserId(req));
  }

  @Get('all-driving')
  getAllDrivingInstructors() {
    return this.instructorService.getAllDrivingInstructors();
  }

  @Get('all-students')
  getAllStudents() {
    return this.instructorService.getAllStudents();
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