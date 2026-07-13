import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import { DICE_TYPES, SESSION_DICE_EVENTS } from '../dice.constants';
import { RollDiceDto } from '../dto/roll-dice.dto';
import { SessionDiceRollDto } from '../dto/dice-roll.dto';
import { DiceRollService } from './dice-roll.service';

/**
 * Rolls dice during a live session. Master only (backend is the source of truth
 * for the result). PUBLIC rolls are broadcast to the campaign room so every
 * connected client animates the same result; SECRET rolls are returned ONLY in
 * the HTTP response and never emitted, so players never learn about them. Rolls
 * are transient — computed, returned, optionally broadcast, not persisted.
 */
@Injectable()
export class SessionDiceRollService {
  private readonly logger = new Logger(SessionDiceRollService.name);

  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    private readonly campaigns: CampaignsService,
    private readonly dice: DiceRollService,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  async roll(
    userId: string,
    userName: string,
    campaignId: string,
    dto: RollDiceDto,
  ): Promise<SessionDiceRollDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) {
      throw new BadRequestException('Não há uma sessão ativa nesta campanha.');
    }

    const sides = DICE_TYPES[dto.diceType];
    const results = this.dice.roll(sides, dto.quantity);
    const total = results.reduce((sum, n) => sum + n, 0);

    const roll: SessionDiceRollDto = {
      id: randomUUID(),
      tableId: campaignId,
      sessionId: session.id,
      diceType: dto.diceType,
      sides,
      quantity: dto.quantity,
      results,
      total,
      visibility: dto.visibility,
      rolledByUserId: userId,
      rolledByName: userName,
      clientMutationId: dto.clientMutationId ?? null,
      createdAt: new Date().toISOString(),
    };

    // Only PUBLIC rolls hit the wire — a SECRET roll's payload must never reach
    // the shared campaign room where players are listening.
    if (roll.visibility === 'PUBLIC') {
      await this.emit(campaignId, roll);
    }
    return roll;
  }

  private async emit(
    campaignId: string,
    roll: SessionDiceRollDto,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(
        campaignRoom(campaignId),
        SESSION_DICE_EVENTS.rolled,
        roll,
      );
    } catch (error) {
      this.logger.warn(
        `Realtime emit "${SESSION_DICE_EVENTS.rolled}" failed: ${(error as Error).message}`,
      );
    }
  }
}
