/*
  Warnings:

  - You are about to drop the column `duration` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `issuedAt` on the `Prescription` table. All the data in the column will be lost.
  - Added the required column `durationInDays` to the `Prescription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Prescription_patientId_issuedAt_idx";

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "duration",
DROP COLUMN "issuedAt",
ADD COLUMN     "durationInDays" INTEGER NOT NULL,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "startDate" DATE NOT NULL;

-- CreateTable
CREATE TABLE "PrescriptionDose" (
    "id" SERIAL NOT NULL,
    "prescriptionId" INTEGER NOT NULL,
    "exactTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "deviceOs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrescriptionDose_exactTime_status_idx" ON "PrescriptionDose"("exactTime", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "Prescription_patientId_startDate_idx" ON "Prescription"("patientId", "startDate");

-- AddForeignKey
ALTER TABLE "PrescriptionDose" ADD CONSTRAINT "PrescriptionDose_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
