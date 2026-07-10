import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  IMAGE_GENERATION_PROVIDER,
  ImageGenerationProvider,
} from '@shared/providers/image-generation/image-generation.provider';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@shared/providers/storage/storage.provider';
import { QUEUE_PROVIDER, QueueProvider } from '@shared/providers/queue/queue.provider';
import { AI_IMAGE_QUEUE } from '@shared/providers/queue/queue.constants';
import {
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { FactionsService } from '@modules/factions/services/factions.service';
import { CampaignAttributesService } from '@modules/campaign-attributes/services/campaign-attributes.service';
import { imageGenerationInFlight } from '@shared/utils/image-generation.util';
import { Character } from '../entities/character.entity';
import { CharacterDto, toCharacterDto } from '../dto/character.dto';
import { CreateCharacterDto } from '../dto/create-character.dto';
import { UpdateCharacterDto } from '../dto/update-character.dto';
import { CreatePlayerCharacterDto } from '../dto/create-player-character.dto';
import { UpdatePlayerCharacterDto } from '../dto/update-player-character.dto';
import { CharacterAttributeInput } from '../dto/character-attribute.input';
import {
  characterRoom,
  CHARACTER_IMAGE_EVENTS,
  GENERATE_CHARACTER_PORTRAIT_JOB,
  GenerateCharacterPortraitPayload,
} from '../character.constants';
import {
  CHARACTERS_REPOSITORY,
  CharactersRepository,
} from '../repositories/characters.repository';
import { CharacterPortraitAgent } from './character-portrait.agent';

/**
 * Application service for master-authored campaign characters.
 *
 * Permission: write is master-only (delegated to
 * {@link CampaignsService.findForMasterOrFail}); read is open to participants,
 * with players seeing only visible characters. Portrait generation NEVER blocks
 * creation — it is enqueued through the QueueProvider and processed later; no
 * BullMQ/OpenAI/MinIO/Socket.IO here (all behind ports).
 */
@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  constructor(
    @Inject(CHARACTERS_REPOSITORY)
    private readonly characters: CharactersRepository,
    private readonly campaigns: CampaignsService,
    private readonly factions: FactionsService,
    private readonly attributes: CampaignAttributesService,
    private readonly agent: CharacterPortraitAgent,
    @Inject(IMAGE_GENERATION_PROVIDER)
    private readonly imageProvider: ImageGenerationProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(QUEUE_PROVIDER)
    private readonly queue: QueueProvider,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  // ── reads ───────────────────────────────────────────────────

  async list(userId: string, campaignId: string): Promise<CharacterDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const list = isMaster
      ? await this.characters.findByCampaign(campaignId)
      : await this.characters.findVisibleByCampaign(campaignId);
    // Attribute values are omitted from the list (loaded on detail) to keep it light.
    return list.map((c) =>
      toCharacterDto(c, [], isMaster, c.controlledByUserId === userId),
    );
  }

  async getDetail(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<CharacterDto> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const character = await this.loadOrFail(campaignId, characterId);
    const isController = character.controlledByUserId === userId;
    if (!isMaster && !isController && !character.isVisibleToPlayers) {
      // Hide existence of private characters from players.
      throw new NotFoundException('Personagem não encontrado');
    }
    const values = await this.characters.findValues(character.id);
    return toCharacterDto(character, values, isMaster, isController);
  }

  // ── writes (master only) ────────────────────────────────────

  async create(
    userId: string,
    campaignId: string,
    dto: CreateCharacterDto,
  ): Promise<CharacterDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    await this.assertFaction(campaignId, dto.factionId);
    await this.assertAttributes(campaignId, dto.attributes);

    let character = await this.characters.saveCharacter(
      this.characters.createCharacter({
        campaignId,
        createdByUserId: userId,
        name: dto.name.trim(),
        title: dto.title?.trim() ?? '',
        shortDescription: dto.shortDescription?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        history: dto.history?.trim() ?? '',
        appearance: dto.appearance?.trim() ?? '',
        personality: dto.personality?.trim() ?? '',
        motivations: dto.motivations?.trim() ?? '',
        secrets: dto.secrets?.trim() ?? '',
        notes: dto.notes?.trim() ?? '',
        factionId: dto.factionId ?? null,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        imageStatus: 'none',
        imagePath: null,
        imageUrl: null,
        imageError: null,
        imageJobId: null,
      }),
    );

    const values = await this.characters.replaceValues(
      character.id,
      dto.attributes ?? [],
    );

    if (dto.generateImage) {
      character = await this.startGeneration(character, userId, {
        ignoreArtDirection: dto.ignoreCampaignArtDirection,
      });
    }

    return toCharacterDto(character, values, true);
  }

  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    dto: UpdateCharacterDto,
  ): Promise<CharacterDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const character = await this.loadOrFail(campaignId, characterId);

    if (dto.factionId !== undefined && dto.factionId !== null) {
      await this.assertFaction(campaignId, dto.factionId);
    }
    if (dto.attributes !== undefined) {
      await this.assertAttributes(campaignId, dto.attributes);
    }

    applyIfDefined(character, 'name', dto.name?.trim());
    applyIfDefined(character, 'title', dto.title?.trim());
    applyIfDefined(character, 'shortDescription', dto.shortDescription?.trim());
    applyIfDefined(character, 'description', dto.description?.trim());
    applyIfDefined(character, 'history', dto.history?.trim());
    applyIfDefined(character, 'appearance', dto.appearance?.trim());
    applyIfDefined(character, 'personality', dto.personality?.trim());
    applyIfDefined(character, 'motivations', dto.motivations?.trim());
    applyIfDefined(character, 'secrets', dto.secrets?.trim());
    applyIfDefined(character, 'notes', dto.notes?.trim());
    applyIfDefined(character, 'playerNotes', dto.playerNotes?.trim());
    if (dto.factionId !== undefined) character.factionId = dto.factionId; // null unlinks
    if (dto.isVisibleToPlayers !== undefined) {
      character.isVisibleToPlayers = dto.isVisibleToPlayers;
    }
    if (dto.attributePointsBudget !== undefined) {
      character.attributePointsBudget = dto.attributePointsBudget;
    }

    const saved = await this.characters.saveCharacter(character);
    const values =
      dto.attributes !== undefined
        ? await this.characters.replaceValues(saved.id, dto.attributes)
        : await this.characters.findValues(saved.id);

    return toCharacterDto(saved, values, true);
  }

  async remove(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const character = await this.loadOrFail(campaignId, characterId);
    await this.characters.removeCharacter(character);
  }

  /**
   * Generates or REGENERATES a portrait. `adjustments` is the master's change
   * request; `ignoreArtDirection` skips the campaign's global art direction for
   * this run. Async — the worker rebuilds a coherent prompt.
   */
  async generateImage(
    userId: string,
    campaignId: string,
    characterId: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean } = {},
  ): Promise<CharacterDto> {
    // Master OR the controlling player may (re)generate the portrait.
    const ctx = await this.loadControllable(userId, campaignId, characterId);
    const character = await this.startGeneration(ctx.character, userId, options);
    const values = await this.characters.findValues(character.id);
    return toCharacterDto(character, values, ctx.isMaster, ctx.isController);
  }

  // ── player characters ───────────────────────────────────────

  /** The authenticated user's own player character in the campaign, or null. */
  async getMine(
    userId: string,
    campaignId: string,
  ): Promise<CharacterDto | null> {
    await this.campaigns.findForMemberOrFail(userId, campaignId);
    const character = await this.characters.findPlayerCharacter(
      campaignId,
      userId,
    );
    if (!character) return null;
    const values = await this.characters.findValues(character.id);
    return toCharacterDto(character, values, false, true);
  }

  /**
   * A participant creates THEIR own player character. One per player. Budget is
   * seeded from the campaign default; attributes are distributed later.
   */
  async createPlayerCharacter(
    userId: string,
    campaignId: string,
    dto: CreatePlayerCharacterDto,
  ): Promise<CharacterDto> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    if (await this.characters.findPlayerCharacter(campaignId, userId)) {
      throw new ConflictException('Você já possui um personagem nesta mesa.');
    }
    await this.assertFaction(campaignId, dto.factionId);

    let character = await this.characters.saveCharacter(
      this.characters.createCharacter({
        campaignId,
        createdByUserId: userId,
        controlledByUserId: userId,
        isPlayerCharacter: true,
        attributePointsBudget: campaign.defaultPlayerCharacterAttributePoints,
        name: dto.name.trim(),
        title: dto.title?.trim() ?? '',
        shortDescription: dto.shortDescription?.trim() ?? '',
        description: dto.description?.trim() ?? '',
        history: dto.history?.trim() ?? '',
        appearance: dto.appearance?.trim() ?? '',
        personality: dto.personality?.trim() ?? '',
        motivations: dto.motivations?.trim() ?? '',
        secrets: dto.secrets?.trim() ?? '',
        notes: '',
        playerNotes: dto.playerNotes?.trim() ?? '',
        factionId: dto.factionId ?? null,
        // Player characters belong to the party and are visible by default.
        isVisibleToPlayers: true,
        imageStatus: 'none',
        imagePath: null,
        imageUrl: null,
        imageError: null,
        imageJobId: null,
      }),
    );

    if (dto.generateImage) {
      character = await this.startGeneration(character, userId, {
        ignoreArtDirection: dto.ignoreCampaignArtDirection,
      });
    }
    return toCharacterDto(character, [], false, true);
  }

  /** A player edits THEIR character (narrative + faction + player notes only). */
  async updatePlayerCharacter(
    userId: string,
    campaignId: string,
    characterId: string,
    dto: UpdatePlayerCharacterDto,
  ): Promise<CharacterDto> {
    const { character, isMaster, isController } = await this.loadControllable(
      userId,
      campaignId,
      characterId,
    );

    if (dto.factionId !== undefined && dto.factionId !== null) {
      await this.assertFaction(campaignId, dto.factionId);
    }
    applyIfDefined(character, 'name', dto.name?.trim());
    applyIfDefined(character, 'title', dto.title?.trim());
    applyIfDefined(character, 'shortDescription', dto.shortDescription?.trim());
    applyIfDefined(character, 'description', dto.description?.trim());
    applyIfDefined(character, 'history', dto.history?.trim());
    applyIfDefined(character, 'appearance', dto.appearance?.trim());
    applyIfDefined(character, 'personality', dto.personality?.trim());
    applyIfDefined(character, 'motivations', dto.motivations?.trim());
    applyIfDefined(character, 'secrets', dto.secrets?.trim());
    applyIfDefined(character, 'playerNotes', dto.playerNotes?.trim());
    if (dto.factionId !== undefined) character.factionId = dto.factionId;

    const saved = await this.characters.saveCharacter(character);
    const values = await this.characters.findValues(saved.id);
    return toCharacterDto(saved, values, isMaster, isController);
  }

  /**
   * Distributes a character's attribute values against its point budget. The
   * controlling player or the master may call it. Points spent per attribute =
   * value - minValue.
   */
  async distributeAttributes(
    userId: string,
    campaignId: string,
    characterId: string,
    attributes: CharacterAttributeInput[],
  ): Promise<CharacterDto> {
    const { character, isMaster, isController } = await this.loadControllable(
      userId,
      campaignId,
      characterId,
    );

    const budget = character.attributePointsBudget;
    if (budget == null && !isMaster) {
      throw new BadRequestException(
        'O mestre ainda não definiu quantos pontos você pode distribuir.',
      );
    }
    await this.assertAttributes(campaignId, attributes, budget ?? undefined);

    const values = await this.characters.replaceValues(character.id, attributes);
    return toCharacterDto(character, values, isMaster, isController);
  }

  /** Master sets/clears a single character's attribute-point budget. */
  async setAttributeBudget(
    userId: string,
    campaignId: string,
    characterId: string,
    budget: number | null,
  ): Promise<CharacterDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const character = await this.loadOrFail(campaignId, characterId);
    character.attributePointsBudget = budget;
    const saved = await this.characters.saveCharacter(character);
    const values = await this.characters.findValues(saved.id);
    return toCharacterDto(saved, values, true);
  }

  /** Master reads the campaign default player-character budget. */
  async getDefaultBudget(
    userId: string,
    campaignId: string,
  ): Promise<number | null> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    return campaign.defaultPlayerCharacterAttributePoints;
  }

  /** Master sets/clears the campaign default player-character budget. */
  async setDefaultBudget(
    userId: string,
    campaignId: string,
    value: number | null,
  ): Promise<number | null> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    const saved = await this.campaigns.saveDefaultPlayerAttributePoints(
      campaign,
      value,
    );
    return saved.defaultPlayerCharacterAttributePoints;
  }

  // ── art direction (master only) ─────────────────────────────

  async getArtDirection(userId: string, campaignId: string): Promise<string> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    return campaign.characterArtDirection ?? '';
  }

  async setArtDirection(
    userId: string,
    campaignId: string,
    value: string,
  ): Promise<string> {
    const campaign = await this.campaigns.findForMasterOrFail(userId, campaignId);
    const saved = await this.campaigns.saveCharacterArtDirection(
      campaign,
      value.trim(),
    );
    return saved.characterArtDirection;
  }

  // ── async worker ────────────────────────────────────────────

  /** Executed by the queue worker (see CharacterPortraitHandler). */
  async processGenerationJob(
    payload: GenerateCharacterPortraitPayload,
  ): Promise<void> {
    const character = await this.characters.findById(payload.characterId);
    if (!character) {
      this.logger.warn(`Job for missing character ${payload.characterId}`);
      return;
    }

    // The requester must still be allowed to (re)generate this portrait: the
    // campaign master OR the player who controls it (player characters). Using
    // findForMasterOrFail here wrongly aborted player-character generations.
    let campaign;
    try {
      campaign = await this.campaigns.findForMemberOrFail(
        payload.requestedBy,
        character.campaignId,
      );
    } catch {
      this.logger.warn(
        `Job requester no longer participates in campaign ${character.campaignId}`,
      );
      return;
    }
    const isMaster = campaign.masterId === payload.requestedBy;
    const isController = character.controlledByUserId === payload.requestedBy;
    if (!isMaster && !isController) {
      this.logger.warn(
        `Job requester may no longer generate character ${character.id}`,
      );
      return;
    }

    const startedAt = Date.now();
    character.imageStatus = 'processing';
    character.imageError = null;
    await this.characters.saveCharacter(character);
    await this.emit(character, CHARACTER_IMAGE_EVENTS.processing, {
      tableId: character.campaignId,
      characterId: character.id,
      imageStatus: 'PROCESSING',
    });

    try {
      const faction = character.factionId
        ? await this.factions.findInCampaign(character.campaignId, character.factionId)
        : null;

      const prompt = await this.agent.build(
        {
          name: campaign.name,
          theme: campaign.theme,
          tone: campaign.tone,
          mainLanguage: campaign.mainLanguage,
        },
        {
          name: character.name,
          title: character.title,
          shortDescription: character.shortDescription,
          description: character.description,
          appearance: character.appearance,
          personality: character.personality,
          history: character.history,
        },
        faction
          ? {
              name: faction.name,
              identity: faction.identity,
              memberTraits: faction.memberTraits,
              colors: faction.colors,
              recurringElements: faction.recurringElements,
            }
          : undefined,
        {
          artDirection: campaign.characterArtDirection,
          adjustments: payload.adjustments,
          ignoreArtDirection: payload.ignoreArtDirection,
        },
      );
      this.logger.log(
        `Portrait prompt for character ${character.id}:\n  prompt: ${prompt.imagePrompt}`,
      );

      // Use image-to-image when the provider supports it and we're adjusting an
      // existing portrait; otherwise rebuild-from-text. The choice is isolated
      // here — the provider itself declares the capability.
      const useI2I =
        this.imageProvider.supportsImageToImage() &&
        !!character.imageUrl &&
        !!payload.adjustments;
      const generated = useI2I
        ? await this.imageProvider.editImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
            baseImageUrl: character.imageUrl as string,
          })
        : await this.imageProvider.generateImage({
            prompt: prompt.imagePrompt,
            negativePrompt: prompt.negativePrompt,
          });

      const path = `campaigns/${character.campaignId}/characters/${character.id}/portrait/${randomUUID()}.png`;
      const stored = await this.storage.upload({
        path,
        buffer: generated.buffer,
        contentType: generated.contentType,
      });

      character.imagePath = stored.path;
      character.imageUrl = stored.url;
      character.imageStatus = 'completed';
      character.imageError = null;
      character.lastImagePrompt = prompt.imagePrompt;
      character.lastImageNegativePrompt = prompt.negativePrompt;
      character.lastImageAdjustment = payload.adjustments ?? character.lastImageAdjustment;
      await this.characters.saveCharacter(character);

      await this.emit(character, CHARACTER_IMAGE_EVENTS.completed, {
        tableId: character.campaignId,
        characterId: character.id,
        imageStatus: 'COMPLETED',
        imageUrl: stored.url,
      });
      this.logger.log(
        `✔ Portrait done: character=${character.id} in ${Date.now() - startedAt}ms`,
      );
    } catch (error) {
      const message = (error as Error).message;
      character.imageStatus = 'failed';
      character.imageError = message;
      await this.characters.saveCharacter(character);
      await this.emit(character, CHARACTER_IMAGE_EVENTS.failed, {
        tableId: character.campaignId,
        characterId: character.id,
        imageStatus: 'FAILED',
        errorMessage: message,
      });
      this.logger.error(`✖ Portrait failed: character=${character.id}: ${message}`);
      throw error;
    }
  }

  // ── helpers ─────────────────────────────────────────────────

  private async startGeneration(
    character: Character,
    requestedBy: string,
    options: { adjustments?: string; ignoreArtDirection?: boolean } = {},
  ): Promise<Character> {
    // Reject a new run while one is genuinely in flight; a stale one (worker
    // never ran / job vanished) is allowed through to recover.
    if (imageGenerationInFlight(character.imageStatus, character.updatedAt)) {
      throw new ConflictException(
        'Uma geração de imagem já está em andamento. Aguarde a conclusão.',
      );
    }
    if (!this.imageProvider.isConfigured()) {
      character.imageStatus = 'failed';
      character.imageError = 'Geração de imagem por IA não está configurada.';
      return this.characters.saveCharacter(character);
    }
    const adjustments = options.adjustments?.trim() || undefined;
    character.imageStatus = 'pending';
    character.imageError = null;
    character.lastImageAdjustment = adjustments ?? null;
    const saved = await this.characters.saveCharacter(character);
    try {
      await this.queue.enqueue<GenerateCharacterPortraitPayload>({
        queue: AI_IMAGE_QUEUE,
        name: GENERATE_CHARACTER_PORTRAIT_JOB,
        payload: {
          characterId: saved.id,
          requestedBy,
          adjustments,
          ignoreArtDirection: options.ignoreArtDirection || undefined,
        },
        options: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      });
      this.logger.log(`Enqueued portrait generation: character=${saved.id}`);
    } catch (error) {
      saved.imageStatus = 'failed';
      saved.imageError = (error as Error).message;
      return this.characters.saveCharacter(saved);
    }
    return saved;
  }

  private async emit(
    character: Character,
    event: string,
    payload: unknown,
  ): Promise<void> {
    try {
      await this.realtime.emitToRoom(characterRoom(character.id), event, payload);
      await this.realtime.emitToRoom(
        campaignRoom(character.campaignId),
        event,
        payload,
      );
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }

  private async loadOrFail(
    campaignId: string,
    characterId: string,
  ): Promise<Character> {
    const character = await this.characters.findById(characterId);
    if (!character || character.campaignId !== campaignId) {
      throw new NotFoundException('Personagem não encontrado');
    }
    return character;
  }

  /**
   * Loads a character for a controller-or-master write: the caller must be the
   * campaign master OR the player who controls the character.
   */
  private async loadControllable(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<{ character: Character; isMaster: boolean; isController: boolean }> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const character = await this.loadOrFail(campaignId, characterId);
    const isMaster = campaign.masterId === userId;
    const isController = character.controlledByUserId === userId;
    if (!isMaster && !isController) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar este personagem.',
      );
    }
    return { character, isMaster, isController };
  }

  private async assertFaction(
    campaignId: string,
    factionId?: string,
  ): Promise<void> {
    if (!factionId) return;
    const faction = await this.factions.findInCampaign(campaignId, factionId);
    if (!faction) {
      throw new BadRequestException(
        'A facção informada não pertence a esta campanha.',
      );
    }
  }

  /**
   * Validates attribute values against the campaign's attributes. When `budget`
   * is given, also enforces that total spent points (value - minValue) fit it.
   */
  private async assertAttributes(
    campaignId: string,
    attributes?: CharacterAttributeInput[],
    budget?: number,
  ): Promise<void> {
    if (!attributes || attributes.length === 0) return;

    const byId = new Map(
      (await this.attributes.getForCampaign(campaignId)).map((a) => [a.id, a]),
    );
    const seen = new Set<string>();
    let spent = 0;
    for (const item of attributes) {
      if (seen.has(item.attributeId)) {
        throw new BadRequestException(
          'Não é permitido repetir o mesmo atributo no personagem.',
        );
      }
      seen.add(item.attributeId);

      const attribute = byId.get(item.attributeId);
      if (!attribute) {
        throw new BadRequestException(
          'Um dos atributos informados não pertence a esta campanha.',
        );
      }
      if (item.value < attribute.minValue || item.value > attribute.maxValue) {
        throw new BadRequestException(
          `O valor de "${attribute.name}" deve estar entre ${attribute.minValue} e ${attribute.maxValue}.`,
        );
      }
      spent += item.value - attribute.minValue;
    }

    if (budget !== undefined && spent > budget) {
      throw new BadRequestException(
        'Você ultrapassou o limite de pontos definido pelo mestre.',
      );
    }
  }
}

/** Assigns `value` to `key` only when it is not undefined (keeps existing otherwise). */
function applyIfDefined<K extends keyof Character>(
  entity: Character,
  key: K,
  value: Character[K] | undefined,
): void {
  if (value !== undefined) entity[key] = value;
}
