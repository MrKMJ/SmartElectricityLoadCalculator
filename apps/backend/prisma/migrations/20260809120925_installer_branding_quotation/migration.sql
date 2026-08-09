-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'QUOTATION';

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "lineItems" JSONB;

-- AlterTable
ALTER TABLE "user_preferences" ADD COLUMN     "brandColorHex" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "logoDataUrl" TEXT;
