import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma, ServiceConnection } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { firstValueFrom } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreatePlaylistDto,
  SetPlaybackVolumeDto,
} from "../../reactions/dto/reaction-data.dto";
import { formatMessage } from "../../utils/format-message";

@Injectable()
export class SpotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly logger: CustomLogger,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(SpotifyService.name);
  }

  private async refreshAccessToken(
    connection: ServiceConnection,
  ): Promise<string | null> {
    const clientId = this.configService.get<string>("CLIENT_ID_SPOTIFY");
    const clientSecret = this.configService.get<string>(
      "CLIENT_SECRET_SPOTIFY",
    );

    if (!clientId || !clientSecret || !connection.refreshToken) {
      this.logger.error(
        "Missing Spotify credentials or refresh token for user.",
      );
      return null;
    }
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", connection.refreshToken);

      const response = await firstValueFrom(
        this.httpService.post<{ access_token: string }>(
          "https://accounts.spotify.com/api/token",
          params.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization:
                "Basic " +
                Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
            },
          },
        ),
      );
      const newToken = response.data.access_token;

      await this.prisma.serviceConnection.update({
        where: { id: connection.id },
        data: { token: newToken },
      });

      this.logger.log(
        `Refreshed Spotify access token for user ${connection.userId.toString()}`,
      );
      return newToken;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to refresh Spotify token: ${message}`);
      return null;
    }
  }

  private async spotifyRequest<T>(
    connection: ServiceConnection,
    requestFn: (token: string) => Promise<T>,
  ): Promise<T | null> {
    try {
      return await requestFn(connection.token);
    } catch (err: unknown) {
      const errorWithResponse = err as { response?: { status: number } };
      if (errorWithResponse.response?.status === 401) {
        this.logger.warn(
          `Token expired for user ${connection.userId.toString()}, refreshing...`,
        );
        const newToken = await this.refreshAccessToken(connection);

        if (newToken) {
          return await requestFn(newToken);
        }
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Spotify API request failed for user ${connection.userId.toString()}: ${message}`,
      );
      return null;
    }
  }

  async setPlaybackVolume(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(SetPlaybackVolumeDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid change_volume reaction data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "spotify" } },
    });
    if (!connection) {
      this.logger.warn(
        `No Spotify connection found for user ${userId.toString()}`,
      );
      return;
    }

    const { volume } = reactionDto;
    const finalVolume = formatMessage(volume, payload);

    this.logger.log(
      `Setting playback volume to ${finalVolume}% for user ${userId.toString()}`,
    );
    await this.spotifyRequest(connection, async (token) =>
      firstValueFrom(
        this.httpService.put(
          `https://api.spotify.com/v1/me/player/volume?volume_percent=${finalVolume}`,
          null,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
    );
  }

  async pausePlayback(userId: number): Promise<void> {
    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "spotify" } },
    });

    if (!connection) {
      this.logger.warn(
        `No Spotify connection found for user ${userId.toString()}. Cannot pause playback.`,
      );
      return;
    }

    this.logger.log(`Pausing playback for user ${userId.toString()}`);
    await this.spotifyRequest(connection, async (token) =>
      firstValueFrom(
        this.httpService.put(
          `https://api.spotify.com/v1/me/player/pause`,
          null,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      ),
    );
  }

  async skipToNext(userId: number): Promise<void> {
    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "spotify" } },
    });
    if (!connection) {
      this.logger.warn(
        `No Spotify connection found for user ${userId.toString()}. Cannot skip to next.`,
      );
      return;
    }

    this.logger.log(`Skipping to next track for user ${userId.toString()}`);
    await this.spotifyRequest(connection, async (token) =>
      firstValueFrom(
        this.httpService.post(
          `https://api.spotify.com/v1/me/player/next`,
          null,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
    );
  }

  async skipToPrevious(userId: number): Promise<void> {
    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "spotify" } },
    });
    if (!connection) {
      this.logger.warn(
        `No Spotify connection found for user ${userId.toString()}. Cannot skip to previous.`,
      );
      return;
    }

    this.logger.log(`Skipping to previous track for user ${userId.toString()}`);
    await this.spotifyRequest(connection, async (token) =>
      firstValueFrom(
        this.httpService.post(
          `https://api.spotify.com/v1/me/player/previous`,
          null,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ),
    );
  }

  async createPlaylist(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(CreatePlaylistDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(`Invalid create_playlist data for ${userId.toString()}`);
      return;
    }

    const { owner, name, description, isPublic } = reactionDto;
    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "spotify" } },
    });
    if (!connection) {
      this.logger.warn(
        `No Spotify connection for user ${userId.toString()}. Cannot create playlist.`,
      );
      return;
    }

    const finalOwner = formatMessage(owner, payload);
    const finalName = formatMessage(name, payload);
    const finalDescription = formatMessage(description, payload);
    const boolPublic: boolean = isPublic === "true";

    this.logger.log(
      `Creating playlist '${finalName}' for user ${userId.toString()}`,
    );
    await this.spotifyRequest(connection, async (token) =>
      firstValueFrom(
        this.httpService.post(
          `https://api.spotify.com/v1/users/${finalOwner}/playlists`,
          {
            name: finalName,
            description: finalDescription,
            public: boolPublic,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );
  }
}
