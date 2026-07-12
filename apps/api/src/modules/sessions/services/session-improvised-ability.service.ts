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
import { resolveGenerationLanguage } from '@shared/utils/language.util';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { MapsService } from '@modules/maps/services/maps.service';
import { FactionsService } from '@modules/factions/services/factions.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { CampaignAttributesService } from '@modules/campaign-attributes/services/campaign-attributes.service';
import { CharacterFormService } from '@modules/character-forms/services/character-form.service';
import { AbilitiesService } from '@modules/abilities/services/abilities.service';
import { AbilityDefinitionDto } from '@modules/abilities/dto/ability.dto';
import { ABILITY_EVENTS, ABILITY_TYPES } from '@modules/abilities/ability.constants';
import { CampaignSession } from '../entities/campaign-session.entity';
import {
  CompleteImprovisedAbilityDto,
  CreateSessionAbilityDto,
  ImprovisedAbilityDraftDto,
  ImprovisePartialAbilityDto,
  SessionAbilityLinkTarget,
} from '../dto/improvise-ability.dto';
import {
  SESSIONS_REPOSITORY,
  SessionsRepository,
} from '../repositories/sessions.repository';
import {
  SESSION_CHARACTERS_REPOSITORY,
  SessionCharactersRepository,
} from '../repositories/session-characters.repository';
import {
  ImprovisedAbilityAgent,
  ImprovisedAbilityResult,
} from './improvised-ability.agent';

/** What the create flow returns: the definition and the resulting link (if any). */
export interface SessionAbilityResult {
  definition: AbilityDefinitionDto;
  linkTarget: SessionAbilityLinkTarget;
  characterId: string | null;
  formId: string | null;
}

/**
 * Orchestrates creating an ability DURING a live session — the "improvise an
 * ability on the spot" flow. Master-only, requires an active session, and REUSES
 * the normal ability/form services for persistence so a session ability is a
 * normal campaign ability (born APPROVED; only its provenance differs).
 *
 * The AI step is assistive: it merely fills the gaps the master left. The
 * "master-provided fields always win" rule and ability-type validation are
 * enforced HERE, in code. No infrastructure is touched directly; the LLM sits
 * behind {@link ImprovisedAbilityAgent}.
 */
@Injectable()
export class SessionImprovisedAbilityService {
  private readonly logger = new Logger(SessionImprovisedAbilityService.name);

  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessions: SessionsRepository,
    @Inject(SESSION_CHARACTERS_REPOSITORY)
    private readonly sessionChars: SessionCharactersRepository,
    private readonly campaigns: CampaignsService,
    private readonly maps: MapsService,
    private readonly factions: FactionsService,
    private readonly characters: CharactersService,
    private readonly attributes: CampaignAttributesService,
    private readonly abilities: AbilitiesService,
    private readonly forms: CharacterFormService,
    private readonly agent: ImprovisedAbilityAgent,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  /**
   * Completes an improvised ability with AI, returning a NOT-yet-persisted draft
   * for the master to review. Fields the master already filled are kept verbatim;
   * only the empty ones are filled from the model's proposal.
   */
  async completeWithAi(
    userId: string,
    campaignId: string,
    dto: CompleteImprovisedAbilityDto,
  ): Promise<ImprovisedAbilityDraftDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.requireActiveSession(campaignId);

    if (!this.agent.isConfigured()) {
      throw new BadRequestException(
        'A geração por IA não está configurada nesta instalação.',
      );
    }

    const partial = dto.ability ?? {};
    const campaign = await this.campaigns.findByIdOrFail(campaignId);
    const factions = await this.factions.listByCampaign(userId, campaignId);
    const attributes = await this.attributes.getForCampaign(campaignId);
    const existing = await this.abilities.list(userId, campaignId);
    const map = await this.maps.findMapInCampaign(
      campaignId,
      session.currentMapId,
    );
    const points = map ? await this.maps.findPointsForMap(map.id, true) : [];
    const charactersPresent = await this.presentCharacterNames(session);
    const selectedCharacter = await this.selectedCharacterContext(
      campaignId,
      dto.characterId,
    );
    const languageName = resolveGenerationLanguage(
      dto.targetLanguage,
      this.userText(partial, dto.instructions),
      campaign.mainLanguage,
    );

    let ai: ImprovisedAbilityResult;
    try {
      ai = await this.agent.complete({
        campaign: {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          premise: campaign.premise,
          mainLanguage: campaign.mainLanguage,
        },
        map: map
          ? {
              name: map.name,
              type: map.type,
              shortDescription: map.shortDescription,
              pointsOfInterest: points.map((p) => p.name),
              charactersPresent,
            }
          : null,
        selectedCharacter,
        factions: factions.map((f) => f.name),
        existingAbilities: existing.map((a) => a.name),
        attributes: attributes.map((a) => a.name),
        allowedTypes: ABILITY_TYPES,
        partial: this.toAgentPartial(partial),
        instructions: dto.instructions,
        languageName,
      });
    } catch (error) {
      this.logger.warn(
        `AI ability improvisation failed for campaign ${campaignId}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Não foi possível completar a habilidade com IA. Tente novamente.',
      );
    }

    return this.mergeDraft(partial, ai);
  }

  /**
   * Creates the improvised ability as a normal campaign ability (born APPROVED),
   * then optionally links it to a character or the character's ACTIVE form.
   */
  async create(
    userId: string,
    campaignId: string,
    dto: CreateSessionAbilityDto,
  ): Promise<SessionAbilityResult> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const session = await this.requireActiveSession(campaignId);

    const definition = await this.abilities.create(
      userId,
      campaignId,
      dto.ability,
      { creationSource: 'SESSION', createdDuringSessionId: session.id },
    );

    const target = dto.link?.target ?? 'NONE';
    let characterId: string | null = null;
    let formId: string | null = null;

    if (target === 'CHARACTER') {
      characterId = this.requireCharacterId(dto);
      await this.abilities.assign(userId, campaignId, characterId, {
        abilityDefinitionId: definition.id,
        isVisibleToPlayers: definition.isVisibleToPlayers,
      });
    } else if (target === 'ACTIVE_FORM') {
      characterId = this.requireCharacterId(dto);
      const character = await this.characters.findInCampaign(
        campaignId,
        characterId,
      );
      if (!character) {
        throw new BadRequestException('Personagem não pertence a esta campanha.');
      }
      const activeForm = await this.forms.getActiveForm(character);
      if (!activeForm) {
        throw new BadRequestException(
          'O personagem selecionado não possui uma forma ativa.',
        );
      }
      formId = activeForm.id;
      await this.forms.linkAbility(
        userId,
        campaignId,
        characterId,
        activeForm.id,
        definition.id,
        definition.isVisibleToPlayers,
      );
      await this.emit(campaignId, ABILITY_EVENTS.formAbilityAdded, {
        abilityDefinitionId: definition.id,
        characterId,
        formId,
        originUserId: userId,
      });
    }

    return { definition, linkTarget: target, characterId, formId };
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

  private requireCharacterId(dto: CreateSessionAbilityDto): string {
    const id = dto.link?.characterId;
    if (!id) {
      throw new BadRequestException(
        'É necessário informar o personagem para vincular a habilidade.',
      );
    }
    return id;
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

  private async selectedCharacterContext(campaignId: string, characterId?: string) {
    if (!characterId) return null;
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) return null;
    const activeForm = await this.forms.getActiveForm(character);
    return {
      name: character.name,
      shortDescription: character.shortDescription,
      activeFormName: activeForm?.name,
      activeFormAppearance: activeForm?.appearanceDescription,
    };
  }

  /** Concatenates the master's typed text — used to detect language as a fallback. */
  private userText(
    dto: ImprovisePartialAbilityDto,
    instructions?: string,
  ): string {
    return [
      dto.name,
      dto.type,
      dto.shortDescription,
      dto.description,
      dto.effectDescription,
      dto.rulesText,
      dto.costDescription,
      dto.limitationDescription,
      dto.masterNotes,
      instructions,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private toAgentPartial(dto: ImprovisePartialAbilityDto) {
    return {
      name: dto.name,
      type: dto.type,
      shortDescription: dto.shortDescription,
      description: dto.description,
      effectDescription: dto.effectDescription,
      rulesText: dto.rulesText,
      costDescription: dto.costDescription,
      limitationDescription: dto.limitationDescription,
      masterNotes: dto.masterNotes,
      isUnique: dto.isUnique,
      isVisibleToPlayers: dto.isVisibleToPlayers,
    };
  }

  /**
   * The authoritative merge: `final = masterField || aiField`. A field the master
   * typed is never overwritten by the AI. The ability type is restricted to the
   * allowed set (falls back to OTHER). Booleans take the master's choice when set,
   * else the AI's, else a safe default (unique=false, visible=false).
   */
  private mergeDraft(
    partial: ImprovisePartialAbilityDto,
    ai: ImprovisedAbilityResult,
  ): ImprovisedAbilityDraftDto {
    const keep = (master: string | undefined, generated: string): string =>
      (master ?? '').trim() || generated;

    const masterType = (partial.type ?? '').trim();
    const aiType = (ai.type ?? '').trim().toUpperCase();
    const type = masterType
      ? masterType
      : (ABILITY_TYPES as readonly string[]).includes(aiType)
        ? aiType
        : 'OTHER';

    return {
      name: keep(partial.name, ai.name),
      type,
      shortDescription: keep(partial.shortDescription, ai.shortDescription),
      description: keep(partial.description, ai.description),
      effectDescription: keep(partial.effectDescription, ai.effectDescription),
      rulesText: keep(partial.rulesText, ai.rulesText),
      costDescription: keep(partial.costDescription, ai.costDescription),
      limitationDescription: keep(
        partial.limitationDescription,
        ai.limitationDescription,
      ),
      masterNotes: keep(partial.masterNotes, ai.masterNotes),
      isUnique:
        partial.isUnique !== undefined ? partial.isUnique : ai.isUnique ?? false,
      isVisibleToPlayers:
        partial.isVisibleToPlayers !== undefined
          ? partial.isVisibleToPlayers
          : ai.isVisibleToPlayers ?? false,
    };
  }

  private async emit(
    campaignId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(campaignRoom(campaignId), event, {
        tableId: campaignId,
        ...payload,
      });
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }
}
