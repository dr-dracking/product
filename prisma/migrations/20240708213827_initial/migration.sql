/*
  Warnings:

  - You are about to drop the column `createdById` on the `product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product" DROP COLUMN "createdById",
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "last_updated_by_id" TEXT;
