/*
  Warnings:

  - The values [COMPLETED] on the enum `FollowUpStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `bio` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `licenseMedical` on the `doctors` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[licenseMedicalNumber]` on the table `doctors` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idCardPhotoUrl` to the `doctors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licenseMedicalNumber` to the `doctors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `licenseMedicalPhotoUrl` to the `doctors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearsExperience` to the `doctors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FollowUpStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."FollowUp" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "FollowUp" ALTER COLUMN "status" TYPE "FollowUpStatus_new" USING ("status"::text::"FollowUpStatus_new");
ALTER TYPE "FollowUpStatus" RENAME TO "FollowUpStatus_old";
ALTER TYPE "FollowUpStatus_new" RENAME TO "FollowUpStatus";
DROP TYPE "public"."FollowUpStatus_old";
ALTER TABLE "FollowUp" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropIndex
DROP INDEX "doctors_licenseMedical_key";

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "bio",
DROP COLUMN "licenseMedical",
ADD COLUMN     "idCardPhotoUrl" TEXT NOT NULL,
ADD COLUMN     "licenseMedicalNumber" TEXT NOT NULL,
ADD COLUMN     "licenseMedicalPhotoUrl" TEXT NOT NULL,
ADD COLUMN     "yearsExperience" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "doctors_licenseMedicalNumber_key" ON "doctors"("licenseMedicalNumber");
