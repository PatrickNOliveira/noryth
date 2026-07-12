import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { MapsService } from '@modules/maps/services/maps.service';
import { FactionsService } from '@modules/factions/services/factions.service';
import { CampaignAttributesService } from '@modules/campaign-attributes/services/campaign-attributes.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { CharacterDto } from '@modules/characters/dto/character.dto';
import { CreateCharacterDto } from '@modules/characters/dto/create-character.dto';
import { CampaignSession } from '../entities/campaign-session.entity';
import {
  CompleteImprovisedCharacterDto,
  ImprovisedCharacterDraftDto,
  ImprovisePartialCharacterDto,
} from '../dto/improvise-character.dto';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import {
  ImprovisedCharacterAgent,
  ImprovisedCharacterResult,
  ImproviseAttributeContext,
} from './improvised-character.agent';

/**
 * Orchestrates creating a character DURING a live session — the "improvise a
 * character on the spot" flow. Master-only, requires an active session, and
 * REUSES {@link CharactersService.create} for persistence so a session character
 * is a normal campaign character (only its provenance differs).
 *
 * The AI step is assistive: it merely fills the gaps the master left. The
 * "master-provided fields always win" rule and attribute clamping are enforced
 * HERE, in code — never trusting the prompt alone. No infrastructure is touched
 * directly; the LLM sits behind {@link ImprovisedCharacterAgent}.
 */
@Injectable()
export class SessionImprovisedCharacterService {
  private readonly logger = new Logger(SessionImprovisedCharacterService.name);

  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    private readonly campaigns: CampaignsService,
    private readonly maps: MapsService,
    private readonly factions: FactionsService,
    private readonly attributes: CampaignAttributesService,
    private readonly characters: CharactersService,
    private readonly agent: ImprovisedCharacterAgent,
  ) {}

  /**
   * Completes an improvised character with AI, returning a NOT-yet-persisted
   * draft for the master to review. Fields the master already filled are kept
   * verbatim; only the empty ones are filled from the model's proposal.
   */
  async completeWithAi(
    userId: string,
    campaignId: string,
    dto: CompleteImprovisedCharacterDto,
  ): Promise<ImprovisedCharacterDraftDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.requireActiveSession(campaignId);

    if (!this.agent.isConfigured()) {
      throw new BadRequestException(
        'A geração por IA não está configurada nesta instalação.',
      );
    }

    const partial = dto.character ?? {};
    const campaign = await this.campaigns.findByIdOrFail(campaignId);
    const attributes = await this.attributes.getForCampaign(campaignId);
    const factions = await this.factions.listByCampaign(userId, campaignId);

    const map = await this.maps.findMapInCampaign(
      campaignId,
      session.currentMapId,
    );
    const points = map
      ? await this.maps.findPointsForMap(map.id, true)
      : [];

    let ai: ImprovisedCharacterResult;
    try {
      ai = await this.agent.complete({
        campaign: {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          premise: campaign.premise,
          mainLanguage: campaign.mainLanguage,
          characterArtDirection: campaign.characterArtDirection,
        },
        map: map
          ? {
              name: map.name,
              type: map.type,
              shortDescription: map.shortDescription,
              description: map.description,
              pointsOfInterest: points.map((p) => p.name),
            }
          : null,
        attributes: attributes.map((a) => ({
          id: a.id,
          name: a.name,
          minValue: a.minValue,
          maxValue: a.maxValue,
        })),
        factions: factions.map((f) => ({ id: f.id, name: f.name })),
        partial: this.toAgentPartial(partial),
        instructions: dto.instructions,
      });
    } catch (error) {
      this.logger.warn(
        `AI improvisation failed for campaign ${campaignId}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Não foi possível completar o personagem com IA. Tente novamente.',
      );
    }

    return this.mergeDraft(partial, ai, attributes, factions.map((f) => f.id));
  }

  /**
   * Creates the improvised character as a normal campaign character, stamped with
   * its session provenance and (by default) with async portrait generation on.
   */
  async create(
    userId: string,
    campaignId: string,
    dto: CreateCharacterDto,
  ): Promise<CharacterDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.requireActiveSession(campaignId);

    // Improvised characters should get a portrait unless the master opted out.
    const withImage: CreateCharacterDto = {
      ...dto,
      generateImage: dto.generateImage ?? true,
    };

    return this.characters.create(userId, campaignId, withImage, {
      creationSource: 'SESSION',
      createdDuringSessionId: session.id,
    });
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

  private toAgentPartial(dto: ImprovisePartialCharacterDto) {
    return {
      name: dto.name,
      title: dto.title,
      shortDescription: dto.shortDescription,
      description: dto.description,
      history: dto.history,
      appearance: dto.appearance,
      personality: dto.personality,
      motivations: dto.motivations,
      secrets: dto.secrets,
      masterNotes: dto.notes,
      factionId: dto.factionId ?? undefined,
      attributes: dto.attributes,
    };
  }

  /**
   * The authoritative merge: `final = masterField || aiField`. A field the
   * master typed is never overwritten by the AI. Attribute values the master set
   * win too; the rest may take an AI suggestion, always clamped to the campaign
   * range and restricted to real campaign attributes. AI faction suggestions are
   * only honored when the master left it blank AND the id is a real faction.
   */
  private mergeDraft(
    partial: ImprovisePartialCharacterDto,
    ai: ImprovisedCharacterResult,
    campaignAttributes: ImproviseAttributeContext[],
    campaignFactionIds: string[],
  ): ImprovisedCharacterDraftDto {
    const keep = (master: string | undefined, generated: string): string =>
      (master ?? '').trim() || generated;

    // Master-set attribute values win; AI fills only the untouched ones.
    const byId = new Map(campaignAttributes.map((a) => [a.id, a]));
    const userValues = new Map(
      (partial.attributes ?? [])
        .filter((a) => byId.has(a.attributeId))
        .map((a) => [a.attributeId, a.value]),
    );
    const aiValues = new Map(
      ai.attributes
        .filter((a) => byId.has(a.attributeId))
        .map((a) => [a.attributeId, a.value]),
    );
    const attributes: Array<{ attributeId: string; value: number }> = [];
    for (const attr of campaignAttributes) {
      const raw = userValues.has(attr.id)
        ? userValues.get(attr.id)!
        : aiValues.get(attr.id);
      if (raw === undefined) continue;
      attributes.push({
        attributeId: attr.id,
        value: this.clamp(raw, attr.minValue, attr.maxValue),
      });
    }

    // Faction: master's choice wins (including an explicit "none"); otherwise a
    // valid AI suggestion is adopted.
    const factionId =
      partial.factionId !== undefined
        ? partial.factionId
        : ai.factionId && campaignFactionIds.includes(ai.factionId)
          ? ai.factionId
          : null;

    return {
      name: keep(partial.name, ai.name),
      title: keep(partial.title, ai.title),
      shortDescription: keep(partial.shortDescription, ai.shortDescription),
      description: keep(partial.description, ai.description),
      history: keep(partial.history, ai.history),
      appearance: keep(partial.appearance, ai.appearance),
      personality: keep(partial.personality, ai.personality),
      motivations: keep(partial.motivations, ai.motivations),
      secrets: keep(partial.secrets, ai.secrets),
      notes: keep(partial.notes, ai.masterNotes),
      factionId,
      attributes,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(Math.round(value), min), max);
  }
}
