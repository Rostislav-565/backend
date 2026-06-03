import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentService } from './student.service';

@Controller('student')
@UseGuards(AuthGuard('jwt'))
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    const userId = Number(req.user.id); 
    return this.studentService.getDashboard(userId);
  }

  @Get('upcoming-lessons')
  getUpcomingLessons(@Req() req: any) {
    const userId = Number(req.user.id);
    return this.studentService.getUpcomingLessons(userId);
  }
}