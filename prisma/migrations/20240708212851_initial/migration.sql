/*
  Warnings:

  - You are about to drop the column `createdBy` on the `product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product" DROP COLUMN "createdBy",
ADD COLUMN     "createdById" TEXT;
