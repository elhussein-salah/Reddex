/*
  Warnings:

  - You are about to drop the column `lifecycleStatus` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `dosage` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Prescription` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Prescription_followUpId_status_idx";

-- AlterTable
ALTER TABLE "FollowUp" DROP COLUMN "lifecycleStatus";

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "dosage",
DROP COLUMN "frequency",
DROP COLUMN "instructions",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "FollowUpLifecycleStatus";

-- DropEnum
DROP TYPE "PrescriptionStatus";
