import { Controller, Get, Delete, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  async getDashboardStats() {
    return this.usersService.getStats();
  }

  @Get()
  async findAll() {
    return this.usersService.getAllUsers();
  }

  @Get('instructors')
  async getInstructors() {
    return this.usersService.getInstructors();
  }

  @Get('students')
  async getStudents() {
    return this.usersService.getStudents();
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: { 
      name: string;
      email: string; 
      role: any; 
      phone?: string; 
      carModel?: string; 
      carNumber?: string 
    }
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }

  
}