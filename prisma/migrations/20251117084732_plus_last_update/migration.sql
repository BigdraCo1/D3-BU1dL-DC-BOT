/*
  Warnings:

  - Added the required column `updatedAt` to the `WalletEVM` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WalletSUI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WalletSVM` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WalletEVM" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WalletSUI" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WalletSVM" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
