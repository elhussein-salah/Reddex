-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Result_patientId_idx" ON "Result"("patientId");

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
