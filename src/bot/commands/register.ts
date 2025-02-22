import {
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
  type CacheType,
} from "discord.js";
import BaseCommand from "../base/Base";
import {
  accountService,
  battlepassQuestService,
  config,
  dailyQuestService,
  friendsService,
  itemStorageService,
  logger,
  profilesService,
  userService,
  weeklyQuestService,
} from "../..";
import { v4 as uuid } from "uuid";
import ProfileHelper from "../../utilities/profiles";

export default class RegisterCommand extends BaseCommand {
  data = {
    name: "register",
    description: "Register an account for Chronos.",
    options: [
      {
        name: "email",
        type: ApplicationCommandOptionType.String,
        description: "The email for your account.",
        required: true,
      },
      {
        name: "password",
        type: ApplicationCommandOptionType.String,
        description: "The password for your account",
        required: true,
      },
    ],
  };

  async execute(interaction: CommandInteraction<CacheType>): Promise<any> {
    await interaction.deferReply({ ephemeral: true });

    const display_name = interaction.user.username;
    const email = interaction.options.get("email", true).value;
    const password = interaction.options.get("password", true).value;

    const emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

    if (!emailRegex.test(email as string)) {
      const embed = new EmbedBuilder()
        .setTitle("Not a Valid Email")
        .setDescription("The provided email is not valid.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const discordId = interaction.user.id;

    const user = await userService.findUserByDiscordId(discordId);
    const account = await accountService.findUserByDiscordId(discordId);

    if (user || account) {
      const embed = new EmbedBuilder()
        .setTitle("Account Exists")
        .setDescription("You have already registered an account.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }

    const hashedPassword = await Bun.password.hash(password as string);
    const accountId = uuid().replace(/-/gi, "");

    const Roles = interaction.member?.roles as GuildMemberRoleManager;
    const roles = Roles.cache.map((role) => role.name);

    try {
      await userService
        .create({
          email: email as string,
          username: interaction.user.username as string,
          password: hashedPassword,
          accountId,
          discordId,
          roles,
          banned: false,
          has_all_items: false,
          lastLogin: "",
        })
        .then(async (newUser) => {
          if (!newUser) return;

          const promises = [
            ProfileHelper.createProfile(newUser, "athena"),
            ProfileHelper.createProfile(newUser, "common_core"),
            ProfileHelper.createProfile(newUser, "campaign"),
            ProfileHelper.createProfile(newUser, "metadata"),
            ProfileHelper.createProfile(newUser, "theater0"),
            ProfileHelper.createProfile(newUser, "collection_book_people0"),
            ProfileHelper.createProfile(newUser, "collection_book_schematics0"),
            ProfileHelper.createProfile(newUser, "outpost0"),
            ProfileHelper.createProfile(newUser, "creative"),
          ];

          const [
            athena,
            common_core,
            campaign,
            metadata,
            theater0,
            collection_book_people0,
            collection_book_schematics0,
            outpost0,
            creative,
          ] = await Promise.all(promises);

          await accountService.create({
            accountId: newUser?.accountId,

            discordId,

            stats: ProfileHelper.createStatsTemplate(),
            arenaHype: 0,
          });

          await profilesService.createOrUpdate(newUser?.accountId, "athena", athena);
          await profilesService.createOrUpdate(newUser?.accountId, "common_core", common_core);
          await profilesService.createOrUpdate(newUser?.accountId, "common_public", common_core);
          await profilesService.createOrUpdate(newUser?.accountId, "campaign", campaign);
          await profilesService.createOrUpdate(newUser?.accountId, "metadata", metadata);
          await profilesService.createOrUpdate(newUser?.accountId, "theater0", theater0);
          await profilesService.createOrUpdate(newUser?.accountId, "outpost0", outpost0);
          await profilesService.createOrUpdate(newUser?.accountId, "creative", creative);

          await profilesService.createOrUpdate(
            newUser?.accountId,
            "collection_book_people0",
            collection_book_people0,
          );
          await profilesService.createOrUpdate(
            newUser?.accountId,
            "collection_book_schematics0",
            collection_book_schematics0,
          );

          await friendsService.create({
            accountId: newUser.accountId,
          });

          await dailyQuestService.add(newUser?.accountId, []);
          await battlepassQuestService.add(newUser?.accountId, config.currentSeason, []);
          await weeklyQuestService.add(newUser?.accountId, config.currentSeason, []);
        });

      const embed = new EmbedBuilder()
        .setTitle("Account Created")
        .setDescription("Your account has been successfully created")
        .setColor("Blurple")
        .addFields(
          {
            name: "Display Name",
            value: display_name as string,
            inline: false,
          },
          {
            name: "Email",
            value: email as string,
            inline: false,
          },
        )

        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Failed to register account: ${error}`);

      const embed = new EmbedBuilder()
        .setTitle("Account Registration Failed")
        .setDescription("Failed to register account, please try again.")
        .setColor("Red")
        .setTimestamp();

      return await interaction.editReply({ embeds: [embed] });
    }
  }
}
