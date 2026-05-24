/*
  Warnings:

  - Added the required column `course` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "course" TEXT NOT NULL,
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW';
