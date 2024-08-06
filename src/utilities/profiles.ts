import type { User } from "../tables/user";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuid } from "uuid";
import type { BattlePass, Stats } from "../tables/account";
import type { ProfileId } from "./responses";
import { logger, profilesService } from "..";
import type { Profiles } from "../tables/profiles";
import type { IProfile } from "../../types/profilesdefs";
import {
  createDefaultBattlePassProperties,
  createGameModeStats,
} from "./creations/static_creations";

export default class ProfileHelper {
  static async createProfile(user: Partial<User>, profile: ProfileId) {
    const profilePath = path.join(__dirname, "..", "memory", "profiles", `${profile}.json`);
    const profileTemplate = JSON.parse(await fs.readFile(profilePath, "utf-8")) as Profiles;

    return {
      ...profileTemplate,
      accountId: user.accountId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _id: uuid().replace(/-/g, ""),
      version: "Chronos",
    } as any;
  }

  static getProfileData(
    profile: Profiles,
    profileName: keyof Omit<Profiles, "accountId">,
  ): IProfile | null {
    return (profile[profileName] as IProfile) || null;
  }

  static async getProfile(
    accountId: string,
    profileName: keyof Omit<Profiles, "accountId">,
  ): Promise<IProfile | null> {
    try {
      const profile = await profilesService.findByName(accountId, profileName);

      if (!profile) {
        logger.error(`Profile of type ${profileName} not found.`);
        return null;
      }

      return ProfileHelper.getProfileData(profile, profileName);
    } catch (error) {
      logger.error(`Failed to get profile of type ${profileName}: ${error}`);
      return null;
    }
  }

  static createBattlePassTemplate(): BattlePass {
    return {
      ...createDefaultBattlePassProperties(),
      purchased_battle_pass_tier_offers: [],
      purchased_bp_offers: [],
    };
  }

  static createStatsTemplate(): Stats {
    const gameModeStats = createGameModeStats();
    return {
      solos: gameModeStats,
      duos: gameModeStats,
      squads: gameModeStats,
      ltm: gameModeStats,
    };
  }
}
