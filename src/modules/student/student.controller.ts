import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { StudentService } from './student.service';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  private getUserId(req: any): number {
    return req?.user?.id || 4;
  }

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.studentService.getDashboard(this.getUserId(req));
  }

  @Get('upcoming-lessons')
  getUpcomingLessons(@Req() req: any) {
    return this.studentService.getUpcomingLessons(this.getUserId(req));
  }
}