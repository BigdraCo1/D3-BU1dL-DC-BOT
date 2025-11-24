import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  Role,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../types";
import { CommandCategory } from "../types";
import { logger } from "@/utils/logger";
import { DISCORD_COLORS } from "@/shared/constants";

const role: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("CRUD role")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add role to user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add the role to")
            .setRequired(true),
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to add to the user")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Remove role from user")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to remove the role from")
            .setRequired(true),
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to remove from the user")
            .setRequired(true),
        ),
    ),

  ownerOnly: true,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "add":
        await handleAddRole(interaction);
        break;
      case "remove":
        await handleRemoveRole(interaction);
        break;
    }
  },

  cooldown: 5,
  guildOnly: true,
  category: CommandCategory.MODERATION,
};

async function handleAddRole(interaction: ChatInputCommandInteraction) {
  const member = interaction.options.getMember("user");
  const user = interaction.options.getUser("user");
  const role = interaction.options.getRole("role");

  await interaction.deferReply({ flags: 64 });

  if (!(role instanceof Role)) {
    logger.error(`Could not resolve role for user`);
    await interaction.editReply("❌ Could not resolve that role!");
    return;
  }

  if (!user || !role) {
    logger.error(`Invalid user or role`);
    await interaction.editReply("Invalid user or role");
    return;
  }

  const success_embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Green)
    .setTitle("✅ Role Added")
    .setDescription(`Successfully added ${role} to ${member}`)
    .addFields(
      { name: "Member", value: `${member}`, inline: true }, // Mentions user
      { name: "Role", value: `${role}`, inline: true }, // Mentions role
      { name: "Added By", value: `${interaction.user}`, inline: true }, // Mentions executor
    )
    .setTimestamp();

  const failed_embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Green)
    .setTitle("❌ Role Failed Added")
    .setDescription(`Failed to add role ${role.name} to ${user.username}`)
    .addFields(
      { name: "Member", value: `${member}`, inline: true }, // Mentions user
      { name: "Role", value: `${role}`, inline: true }, // Mentions role
      { name: "Added By", value: `${interaction.user}`, inline: true }, // Mentions executor
    )
    .setTimestamp();

  try {
    if (member && member instanceof GuildMember) {
      await member.roles.add(role);
    }
    await interaction.editReply({ embeds: [success_embed] });
  } catch (error) {
    await interaction.editReply({ embeds: [failed_embed] });
  }
}

async function handleRemoveRole(interaction: ChatInputCommandInteraction) {
  const member = interaction.options.getMember("user");
  const user = interaction.options.getUser("user");
  const role = interaction.options.getRole("role");

  await interaction.deferReply({ flags: 64 });

  if (!(role instanceof Role)) {
    await interaction.editReply("❌ Could not resolve that role!");
    return;
  }

  if (!user || !role) {
    await interaction.editReply("Invalid user or role");
    return;
  }

  const success_embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Green)
    .setTitle("✅ Role Removed")
    .setDescription(`Successfully removed ${role} from ${member}`)
    .addFields(
      { name: "Member", value: `${member}`, inline: true }, // Mentions user
      { name: "Role", value: `${role}`, inline: true }, // Mentions role
      { name: "Removed By", value: `${interaction.user}`, inline: true }, // Mentions executor
    )
    .setTimestamp();

  const failed_embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.Green)
    .setTitle("❌ Role Failed Removed")
    .setDescription(`Failed to remove role ${role.name} from ${user.username}`)
    .addFields(
      { name: "Member", value: `${member}`, inline: true }, // Mentions user
      { name: "Role", value: `${role}`, inline: true }, // Mentions role
      { name: "Removed By", value: `${interaction.user}`, inline: true }, // Mentions executor
    )
    .setTimestamp();

  try {
    if (member && member instanceof GuildMember) {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
      }
    }
    await interaction.editReply({ embeds: [success_embed] });
  } catch (error) {
    await interaction.editReply({ embeds: [failed_embed] });
  }
}

export default role;
