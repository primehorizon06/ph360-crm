-- CreateEnum
CREATE TYPE "TypeCustomer" AS ENUM ('lead', 'customer');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "type" "TypeCustomer" NOT NULL DEFAULT 'lead';
