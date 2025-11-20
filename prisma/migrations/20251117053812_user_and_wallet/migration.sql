-- CreateTable
CREATE TABLE "User" (
    "discordId" TEXT NOT NULL,
    "walletEvmId" TEXT,
    "walletSvmId" TEXT,
    "walletSuiId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("discordId")
);

-- CreateTable
CREATE TABLE "WalletEVM" (
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WalletEVM_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "WalletSVM" (
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WalletSVM_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "WalletSUI" (
    "address" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WalletSUI_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletEvmId_key" ON "User"("walletEvmId");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletSvmId_key" ON "User"("walletSvmId");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletSuiId_key" ON "User"("walletSuiId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletEVM_userId_key" ON "WalletEVM"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletSVM_userId_key" ON "WalletSVM"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletSUI_userId_key" ON "WalletSUI"("userId");

-- AddForeignKey
ALTER TABLE "WalletEVM" ADD CONSTRAINT "WalletEVM_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletSVM" ADD CONSTRAINT "WalletSVM_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletSUI" ADD CONSTRAINT "WalletSUI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("discordId") ON DELETE RESTRICT ON UPDATE CASCADE;
