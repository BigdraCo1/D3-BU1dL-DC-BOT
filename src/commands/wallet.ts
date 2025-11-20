import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ComponentType,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import { prisma } from "../config";
import { logger } from "../utils/logger";
import { v7 as uuidv7 } from "uuid";
import { verificationStore } from "../utils/verificationStore";
import { ethers } from "ethers";
import type { WalletType } from "../dto/wallet.dto";
import {
  validateWalletAddress,
  getTimestampFromUUIDv7,
} from "../dto/wallet.dto";

const frontend_url = process.env.FRONTEND_URL || "http://localhost:5173";

const wallet: Command = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Manage and verify your crypto wallets")
    .addSubcommand((subcommand) =>
      subcommand.setName("verify").setDescription("Verify your wallet address"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View your connected wallets")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user whose wallets to view")
            .setRequired(false),
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "verify") {
      await handleWalletVerification(interaction);
    } else if (subcommand === "view") {
      await handleWalletView(interaction);
    }
  },

  cooldown: 5,
  category: CommandCategory.UTILITY,
};

async function handleWalletVerification(
  interaction: ChatInputCommandInteraction,
) {
  // Check if user already has a pending verification
  const existingVerification = await verificationStore.getByUserId(
    interaction.user.id,
  );

  if (existingVerification) {
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle("⚠️ Verification Already in Progress")
      .setDescription(
        `You already have a pending ${existingVerification.walletType} wallet verification.\n\n` +
          "Please complete or wait for it to expire before starting a new verification.",
      )
      .addFields({
        name: "Expires",
        value: `<t:${Math.floor(existingVerification.expiresAt.getTime() / 1000)}:R>`,
        inline: false,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  // Create wallet type selection buttons
  const evmButton = new ButtonBuilder()
    .setCustomId("wallet_verify_evm")
    .setLabel("EVM Wallet")
    .setEmoji("⛓️")
    .setStyle(ButtonStyle.Primary);

  const suiButton = new ButtonBuilder()
    .setCustomId("wallet_verify_sui")
    .setLabel("SUI Wallet")
    .setEmoji("🌊")
    .setStyle(ButtonStyle.Primary);

  const svmButton = new ButtonBuilder()
    .setCustomId("wallet_verify_svm")
    .setLabel("SVM Wallet")
    .setEmoji("⚡")
    .setStyle(ButtonStyle.Primary);

  const learnMoreButton = new ButtonBuilder()
    .setLabel("Learn More")
    .setURL("https://docs.your-project.com/wallets")
    .setStyle(ButtonStyle.Link);

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    evmButton,
    suiButton,
    svmButton,
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    learnMoreButton,
  );

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔐 Wallet Verification")
    .setDescription(
      "Connect your crypto wallet to access exclusive features and benefits!\n\n" +
        "**Select your wallet type:**\n" +
        "⛓️ **EVM** - Ethereum, Polygon, BSC, Avalanche, etc.\n" +
        "🌊 **SUI** - Sui blockchain wallets\n" +
        "⚡ **SVM** - Solana virtual machine wallets",
    )
    .addFields(
      {
        name: "📋 Requirements",
        value:
          "• A valid wallet address\n" +
          "• Ability to sign a verification message\n" +
          "• Active wallet connection",
        inline: false,
      },
      {
        name: "🎯 Benefits",
        value:
          "• Access exclusive channels\n" +
          "• Participate in token-gated events\n" +
          "• Track your on-chain activities",
        inline: false,
      },
    )
    .setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    components: [row1, row2],
    flags: 64,
  });

  // Create collector for button interactions
  // Create collector for button interactions
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000, // 5 minutes
    filter: (i) =>
      i.user.id === interaction.user.id &&
      i.customId.startsWith("wallet_verify_") &&
      i.customId !== "wallet_verify_cancel",
  });

  collector?.on("collect", async (buttonInteraction) => {
    const walletType = buttonInteraction.customId
      .replace("wallet_verify_", "")
      .toUpperCase() as WalletType;

    // Generate UUID v7 (contains timestamp)
    const verificationId = uuidv7();
    const createdAt = getTimestampFromUUIDv7(verificationId);
    const expiresAt = new Date(createdAt.getTime() + 300000); // 5 minutes

    // Store pending verification (will update with message info after reply)
    await verificationStore.set(verificationId, {
      verificationId,
      userId: buttonInteraction.user.id,
      username: buttonInteraction.user.tag,
      walletType,
      createdAt,
      expiresAt,
      messageId: buttonInteraction.message.id,
      channelId: buttonInteraction.channelId,
    });

    logger.info(
      `Created verification session: ${verificationId} for user ${buttonInteraction.user.tag} (${buttonInteraction.user.id}) - Type: ${walletType}`,
    );

    // Create verification link button
    const verifyLinkButton = new ButtonBuilder()
      .setLabel(`Verify ${walletType} Wallet`)
      .setURL(
        `${frontend_url}/${walletType.toLowerCase()}?verificationId=${verificationId}`,
      )
      .setStyle(ButtonStyle.Link);

    const cancelButton = new ButtonBuilder()
      .setCustomId("wallet_verify_cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const verifyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      verifyLinkButton,
      cancelButton,
    );

    // Get verification message
    const message = await verificationStore.getByUserId(
      buttonInteraction.user.id,
    );

    // Create waiting embed
    const waitingEmbed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle(`⏳ Waiting for ${walletType} Wallet Verification`)
      .setDescription(
        `**Verification ID:** \`${verificationId}\`\n\n` +
          "**Next Steps:**\n" +
          `1. Click the **"Verify ${walletType} Wallet"** button below\n` +
          "2. Connect your wallet on the verification page\n" +
          "3. Sign the verification message\n" +
          "4. Wait here for confirmation (this will update automatically)\n\n" +
          "⏱️ **Status:** Waiting for signature...\n" +
          "⚠️ **Important:** Never share your private keys or seed phrase!",
      )
      .addFields(
        {
          name: "🔒 Security",
          value:
            "• We only request a signature, never your private keys\n" +
            "• The signature proves wallet ownership\n" +
            "• No transaction fees required",
          inline: false,
        },
        {
          name: "📝 Message to Sign",
          value: `\`\`\`\n${message?.verificationId}\n\`\`\``,
          inline: false,
        },
        {
          name: "⏰ Expires",
          value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
          inline: false,
        },
      )
      .setFooter({
        text: "Verification expires in 5 minutes • Click Cancel to abort",
        iconURL: buttonInteraction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await buttonInteraction.update({
      embeds: [waitingEmbed],
      components: [verifyRow],
    });

    logger.info(
      `At set msg: ${buttonInteraction.message.id} and ch: ${buttonInteraction.channelId}`,
    );

    // Update verification with message and channel IDs for later deletion
    await verificationStore.set(verificationId, {
      verificationId,
      userId: buttonInteraction.user.id,
      username: buttonInteraction.user.tag,
      walletType,
      createdAt,
      expiresAt,
      messageId: buttonInteraction.message.id,
      channelId: buttonInteraction.channelId,
    });

    // Create nested collector for cancel button
    const cancelCollector =
      buttonInteraction.message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000, // 5 minutes
        filter: (i) =>
          i.user.id === buttonInteraction.user.id &&
          i.customId === "wallet_verify_cancel",
      });

    cancelCollector.on("collect", async (cancelInteraction) => {
      // Check if verification still exists (not yet completed)
      const pendingVerification = await verificationStore.get(verificationId);

      if (!pendingVerification) {
        // Verification already completed or expired
        const alreadyCompletedEmbed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("⚠️ Verification Already Completed")
          .setDescription(
            "Your verification has already been completed or expired.\n\n" +
              "Use `/wallet view` to see your connected wallets.",
          )
          .setFooter({
            text: `Requested by ${cancelInteraction.user.tag}`,
            iconURL: cancelInteraction.user.displayAvatarURL(),
          })
          .setTimestamp();

        await cancelInteraction.update({
          embeds: [alreadyCompletedEmbed],
          components: [], // Remove all buttons
        });

        // Stop collectors
        cancelCollector.stop("already_completed");
        collector?.stop("already_completed");
        return;
      }

      // Verification still pending, proceed with cancellation
      await verificationStore.delete(verificationId);

      logger.info(
        `Cancelled verification: ${verificationId} for user ${cancelInteraction.user.tag}`,
      );

      // Create cancelled embed
      const cancelledEmbed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle("❌ Verification Cancelled")
        .setDescription(
          "You have cancelled the wallet verification process.\n\n" +
            "You can start a new verification anytime by using `/wallet verify` again.",
        )
        .setFooter({
          text: `Cancelled by ${cancelInteraction.user.tag}`,
          iconURL: cancelInteraction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await cancelInteraction.update({
        embeds: [cancelledEmbed],
        components: [], // Remove all buttons
      });

      // Stop collectors
      cancelCollector.stop("cancelled");
      collector?.stop("cancelled");
    });

    cancelCollector.on("end", (_, reason) => {
      if (reason === "time") {
        logger.debug(
          `Cancel collector timed out for verification ${verificationId}`,
        );
      }
    });
  });

  collector?.on("end", (collected, reason) => {
    if (reason === "cancelled") {
      return; // Already handled by cancel button
    }

    if (collected.size === 0) {
      const disabledRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        evmButton.setDisabled(true),
        suiButton.setDisabled(true),
        svmButton.setDisabled(true),
      );

      interaction
        .editReply({
          embeds: [
            embed.setFooter({
              text: "Verification prompt expired",
              iconURL: interaction.user.displayAvatarURL(),
            }),
          ],
          components: [disabledRow1, row2],
        })
        .catch(() => {});
    }
  });
}

/**
 * Complete verification after signature is received from frontend
 * This is called by the verification server
 */
export async function completeVerification(
  signature: string,
  verificationId: string,
): Promise<{
  success: boolean;
  error?: string;
  walletAddress?: string;
  walletType?: WalletType;
}> {
  try {
    // Get pending verification
    const pending = await verificationStore.get(verificationId);

    if (!pending) {
      return {
        success: false,
        error: "Verification session not found or expired",
      };
    }

    // Get the original message
    const message = await verificationStore.getByUserId(pending.userId);

    if (!message) {
      return {
        success: false,
        error: "Verification message not found",
      };
    }

    // Verify signature and recover address based on wallet type
    let walletAddress: string;

    try {
      switch (pending.walletType) {
        case "EVM":
          walletAddress = ethers.verifyMessage(
            message.verificationId,
            signature,
          );

          if (!validateWalletAddress(walletAddress, "EVM")) {
            return {
              success: false,
              error: "Invalid EVM wallet address recovered from signature",
            };
          }
          break;
        case "SUI":
          return {
            success: false,
            error: "SUI wallet verification not yet implemented",
          };
        case "SVM":
          return {
            success: false,
            error: "SVM wallet verification not yet implemented",
          };
        default:
          return {
            success: false,
            error: "Invalid Wallet type",
          };
      }
    } catch (error) {
      logger.error("Signature verification error:", error);
      return {
        success: false,
        error: "Invalid signature or unable to recover wallet address",
      };
    }

    // Save to database
    try {
      // Upsert user to avoid race condition
      await prisma.user.upsert({
        where: { discordId: pending.userId },
        create: { discordId: pending.userId },
        update: {},
      });

      // Save wallet based on type
      if (pending.walletType === "EVM") {
        // Check if wallet is already connected to another user
        const existingWallet = await prisma.walletEVM.findUnique({
          where: { address: walletAddress },
        });

        if (existingWallet && existingWallet.userId !== pending.userId) {
          return {
            success: false,
            error:
              "This wallet is already connected to another Discord account",
          };
        }

        await prisma.walletEVM.upsert({
          where: { address: walletAddress },
          create: {
            address: walletAddress,
            userId: pending.userId,
          },
          update: {
            userId: pending.userId,
          },
        });

        await prisma.user.update({
          where: { discordId: pending.userId },
          data: { walletEvmId: walletAddress },
        });
      }

      logger.info(`Pending before calling update : ${pending.messageId}`);

      // Update Discord embed with success message
      await updateVerificationEmbed(pending, walletAddress, true);

      logger.info(
        `✅ Wallet verified: ${walletAddress} (${pending.walletType}) for user ${pending.username} (${pending.userId})`,
      );

      return {
        success: true,
        walletAddress,
        walletType: pending.walletType,
      };
    } catch (error) {
      logger.error("Database error during wallet verification:", error);

      // Update Discord embed with error
      await updateVerificationEmbed(
        pending,
        walletAddress,
        false,
        "Database error occurred",
      );

      return {
        success: false,
        error: "Failed to save wallet to database",
      };
    }
  } catch (error) {
    logger.error("Error in completeVerification:", error);

    return {
      success: false,
      error: "Internal verification error",
    };
  }
}

/**
 * Update the Discord embed after verification completes
 */
/**
 * Update the Discord embed after verification completes
 */
async function updateVerificationEmbed(
  pending: {
    userId: string;
    username: string;
    walletType: WalletType;
    messageId?: string;
    channelId?: string;
  },
  walletAddress: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  try {
    // Import client from index
    const { client: discordClient } = await import("../index");

    if (!discordClient) {
      logger.error("Discord client not initialized");
      return;
    }

    const user = await discordClient.users.fetch(pending.userId);

    // Update the original verification message in the guild channel
    if (pending.messageId && pending.channelId) {
      try {
        const channel = await discordClient.channels.fetch(pending.channelId);
        if (channel && channel.isTextBased()) {
          const message = await channel.messages.fetch(pending.messageId);

          if (success) {
            // Create success embed for guild channel
            const guildSuccessEmbed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle("✅ Wallet Verified Successfully!")
              .setDescription(
                `**${pending.walletType}** wallet has been verified and linked.`,
              )
              .addFields({
                name: "🔗 Wallet Address",
                value: `\`${walletAddress}\``,
                inline: false,
              })
              .setFooter({
                text: `Verified by ${pending.username}`,
              })
              .setTimestamp();

            await message.edit({
              embeds: [guildSuccessEmbed],
              components: [], // Remove all buttons
            });

            logger.info(
              `Updated verification message ${pending.messageId} to show success`,
            );
          } else {
            // Create error embed for guild channel
            const guildErrorEmbed = new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle("❌ Verification Failed")
              .setDescription(errorMessage || "The wallet verification failed.")
              .setFooter({
                text: `Attempted by ${pending.username}`,
              })
              .setTimestamp();

            await message.edit({
              embeds: [guildErrorEmbed],
              components: [], // Remove all buttons
            });

            logger.info(
              `Updated verification message ${pending.messageId} to show failure`,
            );
          }
        }
      } catch (error: any) {
        // Ignore if message is already deleted or not found (error code 10008)
        if (error.code === 10008 || error.code === "10008") {
          logger.debug(
            `Verification message ${pending.messageId} not found (may have been deleted)`,
          );
        } else {
          logger.error("Failed to update verification message:", error);
        }
      }
    }

    if (success) {
      const successEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("✅ Wallet Verified Successfully!")
        .setDescription(
          `Your **${pending.walletType}** wallet has been verified and linked to your Discord account.`,
        )
        .addFields(
          {
            name: "🔗 Wallet Address",
            value: `\`${walletAddress}\``,
            inline: false,
          },
          {
            name: "🎉 You're All Set!",
            value:
              "• Your wallet is now connected\n" +
              "• Access exclusive features\n" +
              "• Use `/wallet view` to see your wallets",
            inline: false,
          },
        )
        .setTimestamp();

      let explorerUrl = "";
      if (pending.walletType === "EVM") {
        explorerUrl = `https://etherscan.io/address/${walletAddress}`;
      } else if (pending.walletType === "SUI") {
        explorerUrl = `https://suiscan.xyz/mainnet/address/${walletAddress}`;
      } else if (pending.walletType === "SVM") {
        explorerUrl = `https://solscan.io/address/${walletAddress}`;
      }

      const explorerButton = new ButtonBuilder()
        .setLabel("View on Explorer")
        .setURL(explorerUrl)
        .setStyle(ButtonStyle.Link);

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        explorerButton,
      );

      await user.send({
        embeds: [successEmbed],
        components: [buttonRow],
      });
    } else {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ Verification Failed")
        .setDescription(
          errorMessage ||
            "The signature verification failed. Please try again.",
        )
        .setTimestamp();

      await user.send({ embeds: [errorEmbed] });
    }
  } catch (error) {
    logger.error("Failed to update verification embed:", error);
  }
}

async function handleWalletView(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user") || interaction.user;

  try {
    // Fetch wallet data from database
    const user = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        walletEvm: true,
        walletSvm: true,
        walletSui: true,
      },
    });

    if (!user || (!user.walletEvm && !user.walletSvm && !user.walletSui)) {
      const noWalletEmbed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle("❌ No Wallets Connected")
        .setDescription(
          targetUser.id === interaction.user.id
            ? "You haven't connected any wallets yet.\n\nUse `/wallet verify` to connect your first wallet!"
            : `${targetUser.tag} hasn't connected any wallets yet.`,
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({ embeds: [noWalletEmbed], flags: 64 });
      return;
    }

    // Build fields for connected wallets
    const fields = [];
    const buttons = [];

    if (user.walletEvm) {
      fields.push({
        name: "⛓️ EVM Wallet",
        value: `\`${user.walletEvm.address}\`\n✅ Verified`,
        inline: false,
      });

      buttons.push(
        new ButtonBuilder()
          .setLabel("View on Etherscan")
          .setURL(`https://etherscan.io/address/${user.walletEvm.address}`)
          .setStyle(ButtonStyle.Link),
      );
    } else {
      fields.push({
        name: "⛓️ EVM Wallet",
        value: "❌ Not connected",
        inline: false,
      });
    }

    if (user.walletSui) {
      fields.push({
        name: "🌊 SUI Wallet",
        value: `\`${user.walletSui.address}\`\n✅ Verified`,
        inline: false,
      });

      buttons.push(
        new ButtonBuilder()
          .setLabel("View on Sui Explorer")
          .setURL(
            `https://suiscan.xyz/mainnet/address/${user.walletSui.address}`,
          )
          .setStyle(ButtonStyle.Link),
      );
    } else {
      fields.push({
        name: "🌊 SUI Wallet",
        value: "❌ Not connected",
        inline: false,
      });
    }

    if (user.walletSvm) {
      fields.push({
        name: "⚡ SVM Wallet",
        value: `\`${user.walletSvm.address}\`\n✅ Verified`,
        inline: false,
      });

      buttons.push(
        new ButtonBuilder()
          .setLabel("View on Solscan")
          .setURL(`https://solscan.io/address/${user.walletSvm.address}`)
          .setStyle(ButtonStyle.Link),
      );
    } else {
      fields.push({
        name: "⚡ SVM Wallet",
        value: "❌ Not connected",
        inline: false,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`💼 ${targetUser.tag}'s Wallets`)
      .setDescription("Connected and verified wallet addresses")
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(fields)
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    const components = [];
    if (buttons.length > 0) {
      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...buttons.slice(0, 5),
      );
      components.push(buttonRow);
    }

    await interaction.reply({
      embeds: [embed],
      components,
      flags: 64,
    });
  } catch (error) {
    logger.error("Error fetching wallet data:", error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("❌ Error")
      .setDescription("An error occurred while fetching wallet data.")
      .setTimestamp();

    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
  }
}

export default wallet;
