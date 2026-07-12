import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { resolveGenerationLanguage } from '@shared/utils/language.util';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { MapsService } from '@modules/maps/services/maps.service';
import { FactionsService } from '@modules/factions/services/factions.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { ItemDefinitionsService } from '@modules/items/services/item-definitions.service';
import { ItemInstancesService } from '@modules/items/services/item-instances.service';
import {
  ItemDefinitionDto,
  ItemInstanceDto,
} from '@modules/items/dto/item.dto';
import { CreateItemInstanceDto } from '@modules/items/dto/create-item-instance.dto';
import { ITEM_TYPES } from '@modules/items/item.constants';
import { CampaignSession } from '../entities/campaign-session.entity';
import {
  CompleteImprovisedItemDto,
  CreateSessionItemDto,
  ImprovisedItemDraftDto,
  ImprovisePartialItemDto,
} from '../dto/improvise-item.dto';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import {
  SESSION_CHARACTERS_REPOSITORY,
  SessionCharactersRepository,
} from '../repositories/session-characters.repository';
import {
  ImprovisedItemAgent,
  ImprovisedItemResult,
} from './improvised-item.agent';

/** What the create flow returns: the definition and, optionally, a first instance. */
export interface SessionItemResult {
  definition: ItemDefinitionDto;
  instance: ItemInstanceDto | null;
}

/**
 * Orchestrates creating an item DURING a live session — the "improvise an item
 * on the spot" flow. Master-only, requires an active session, and REUSES the
 * normal item services for persistence so a session item is a normal campaign
 * item (only its provenance differs).
 *
 * The AI step is assistive: it merely fills the gaps the master left. The
 * "master-provided fields always win" rule and item-type validation are enforced
 * HERE, in code. No infrastructure is touched directly; the LLM sits behind
 * {@link ImprovisedItemAgent}.
 */
@Injectable()
export class SessionImprovisedItemService {
  private readonly logger = new Logger(SessionImprovisedItemService.name);

  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    @Inject(SESSION_CHARACTERS_REPOSITORY)
    private readonly sessionChars: SessionCharactersRepository,
    private readonly campaigns: CampaignsService,
    private readonly maps: MapsService,
    private readonly factions: FactionsService,
    private readonly characters: CharactersService,
    private readonly definitions: ItemDefinitionsService,
    private readonly instances: ItemInstancesService,
    private readonly agent: ImprovisedItemAgent,
  ) {}

  /**
   * Completes an improvised item with AI, returning a NOT-yet-persisted draft for
   * the master to review. Fields the master already filled are kept verbatim;
   * only the empty ones are filled from the model's proposal.
   */
  async completeWithAi(
    userId: string,
    campaignId: string,
    dto: CompleteImprovisedItemDto,
  ): Promise<ImprovisedItemDraftDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.requireActiveSession(campaignId);

    if (!this.agent.isConfigured()) {
      throw new BadRequestException(
        'A geração por IA não está configurada nesta instalação.',
      );
    }

    const partial = dto.item ?? {};
    const campaign = await this.campaigns.findByIdOrFail(campaignId);
    const factions = await this.factions.listByCampaign(userId, campaignId);
    const map = await this.maps.findMapInCampaign(
      campaignId,
      session.currentMapId,
    );
    const points = map ? await this.maps.findPointsForMap(map.id, true) : [];
    const charactersPresent = await this.presentCharacterNames(session);
    const languageName = resolveGenerationLanguage(
      dto.targetLanguage,
      this.userText(partial, dto.instructions),
      campaign.mainLanguage,
    );

    let ai: ImprovisedItemResult;
    try {
      ai = await this.agent.complete({
        campaign: {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          premise: campaign.premise,
          mainLanguage: campaign.mainLanguage,
          itemArtDirection: campaign.itemArtDirection,
        },
        map: map
          ? {
              name: map.name,
              type: map.type,
              shortDescription: map.shortDescription,
              description: map.description,
              pointsOfInterest: points.map((p) => p.name),
              charactersPresent,
            }
          : null,
        factions: factions.map((f) => f.name),
        allowedTypes: ITEM_TYPES,
        partial: this.toAgentPartial(partial),
        instructions: dto.instructions,
        languageName,
      });
    } catch (error) {
      this.logger.warn(
        `AI item improvisation failed for campaign ${campaignId}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Não foi possível completar o item com IA. Tente novamente.',
      );
    }

    return this.mergeDraft(partial, ai);
  }

  /**
   * Creates the improvised item as a normal campaign item definition (stamped
   * with its session provenance and, by default, async image generation on),
   * plus an optional first instance.
   */
  async create(
    userId: string,
    campaignId: string,
    dto: CreateSessionItemDto,
  ): Promise<SessionItemResult> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.requireActiveSession(campaignId);

    // Improvised items should get an image unless the master opted out.
    const definition = await this.definitions.create(
      userId,
      campaignId,
      { ...dto.item, generateImage: dto.item.generateImage ?? true },
      { creationSource: 'SESSION', createdDuringSessionId: session.id },
    );

    let instance: ItemInstanceDto | null = null;
    if (dto.instance?.create) {
      const input: CreateItemInstanceDto = {
        itemDefinitionId: definition.id,
        quantity: dto.instance.quantity ?? 1,
        // Improvised occurrences default to HIDDEN — the master reveals later.
        state: dto.instance.state ?? 'HIDDEN',
        isVisibleToPlayers: dto.instance.isVisibleToPlayers ?? false,
        holderCharacterId: dto.instance.holderCharacterId ?? null,
        mapId: dto.instance.mapId ?? null,
        mapPointOfInterestId: dto.instance.mapPointOfInterestId ?? null,
        masterNotes: dto.instance.masterNotes?.trim() || undefined,
      };
      instance = await this.instances.create(userId, campaignId, input);
    }

    return { definition, instance };
  }

  // ── helpers ─────────────────────────────────────────────────

  private async requireActiveSession(
    campaignId: string,
  ): Promise<CampaignSession> {
    const session = await this.sessions.findActiveByCampaign(campaignId);
    if (!session) {
      throw new BadRequestException('Não há uma sessão ativa nesta campanha.');
    }
    return session;
  }

  /** Names of characters currently placed on the session's map (best-effort). */
  private async presentCharacterNames(
    session: CampaignSession,
  ): Promise<string[]> {
    const placed = await this.sessionChars.findBySessionAndMap(
      session.id,
      session.currentMapId,
    );
    const names: string[] = [];
    for (const p of placed) {
      const character = await this.characters.findInCampaign(
        session.campaignId,
        p.characterId,
      );
      if (character) names.push(character.name);
    }
    return names;
  }

  /** Concatenates the master's typed text — used to detect language as a fallback. */
  private userText(dto: ImprovisePartialItemDto, instructions?: string): string {
    return [
      dto.name,
      dto.type,
      dto.shortDescription,
      dto.description,
      dto.history,
      dto.appearance,
      dto.effectDescription,
      dto.rulesText,
      dto.masterNotes,
      instructions,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private toAgentPartial(dto: ImprovisePartialItemDto) {
    return {
      name: dto.name,
      type: dto.type,
      shortDescription: dto.shortDescription,
      description: dto.description,
      history: dto.history,
      appearance: dto.appearance,
      effectDescription: dto.effectDescription,
      rulesText: dto.rulesText,
      masterNotes: dto.masterNotes,
      isUnique: dto.isUnique,
      isVisibleToPlayers: dto.isVisibleToPlayers,
    };
  }

  /**
   * The authoritative merge: `final = masterField || aiField`. A field the master
   * typed is never overwritten by the AI. The item type is restricted to the
   * allowed set (falls back to OTHER). Booleans take the master's choice when set,
   * else the AI's, else a safe default (unique=false, visible=false).
   */
  private mergeDraft(
    partial: ImprovisePartialItemDto,
    ai: ImprovisedItemResult,
  ): ImprovisedItemDraftDto {
    const keep = (master: string | undefined, generated: string): string =>
      (master ?? '').trim() || generated;

    const masterType = (partial.type ?? '').trim();
    const aiType = (ai.type ?? '').trim().toUpperCase();
    const type = masterType
      ? masterType
      : (ITEM_TYPES as readonly string[]).includes(aiType)
        ? aiType
        : 'OTHER';

    return {
      name: keep(partial.name, ai.name),
      type,
      shortDescription: keep(partial.shortDescription, ai.shortDescription),
      description: keep(partial.description, ai.description),
      history: keep(partial.history, ai.history),
      appearance: keep(partial.appearance, ai.appearance),
      effectDescription: keep(partial.effectDescription, ai.effectDescription),
      rulesText: keep(partial.rulesText, ai.rulesText),
      masterNotes: keep(partial.masterNotes, ai.masterNotes),
      isUnique:
        partial.isUnique !== undefined
          ? partial.isUnique
          : ai.isUnique ?? false,
      isVisibleToPlayers:
        partial.isVisibleToPlayers !== undefined
          ? partial.isVisibleToPlayers
          : ai.isVisibleToPlayers ?? false,
    };
  }
}
