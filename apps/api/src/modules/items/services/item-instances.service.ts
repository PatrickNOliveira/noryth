import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { CharactersService } from '@modules/characters/services/characters.service';
import { MapsService } from '@modules/maps/services/maps.service';
import { ItemDefinition } from '../entities/item-definition.entity';
import { ItemInstance } from '../entities/item-instance.entity';
import { ItemInstanceDto, toItemInstanceDto } from '../dto/item.dto';
import { CreateItemInstanceDto } from '../dto/create-item-instance.dto';
import { UpdateItemInstanceDto } from '../dto/update-item-instance.dto';
import { GiveItemToCharacterDto } from '../dto/give-item-to-character.dto';
import { TransferItemInstanceDto } from '../dto/transfer-item-instance.dto';
import { UnassignItemInstanceDto } from '../dto/unassign-item-instance.dto';
import {
  InstanceFilters,
  ITEMS_REPOSITORY,
  ItemsRepository,
} from '../repositories/items.repository';
import { itemRoom, ItemState, ITEM_INSTANCE_EVENTS } from '../item.constants';

/**
 * Application service for item INSTANCES: concrete occurrences of a definition
 * with a simple location and quantity. Master-only writes; players read only
 * visible instances. This is NOT a full inventory.
 */
@Injectable()
export class ItemInstancesService {
  private readonly logger = new Logger(ItemInstancesService.name);

  constructor(
    @Inject(ITEMS_REPOSITORY)
    private readonly items: ItemsRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly maps: MapsService,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  async list(
    userId: string,
    campaignId: string,
    filters: InstanceFilters,
  ): Promise<ItemInstanceDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const rows = await this.items.findInstances(campaignId, {
      ...filters,
      visibleOnly: !isMaster,
    });
    return rows.map((i) => toItemInstanceDto(i, isMaster));
  }

  async getDetail(
    userId: string,
    campaignId: string,
    instanceId: string,
  ): Promise<ItemInstanceDto> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const instance = await this.loadOrFail(campaignId, instanceId);
    if (!isMaster && !instance.isVisibleToPlayers) {
      throw new NotFoundException('Instância de item não encontrada');
    }
    return toItemInstanceDto(instance, isMaster);
  }

  async create(
    userId: string,
    campaignId: string,
    dto: CreateItemInstanceDto,
  ): Promise<ItemInstanceDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadDefinition(campaignId, dto.itemDefinitionId);

    const quantity = dto.quantity ?? 1;
    this.assertUniqueRules(def, quantity, false);
    if (def.isUnique && (await this.items.countInstancesOfDefinition(def.id)) > 0) {
      throw new ConflictException(
        'Este item é único e já possui uma instância na campanha.',
      );
    }
    await this.assertLocation(
      campaignId,
      dto.holderCharacterId ?? null,
      dto.mapId ?? null,
      dto.mapPointOfInterestId ?? null,
    );

    const instance = await this.items.saveInstance(
      this.items.createInstance({
        campaignId,
        itemDefinitionId: def.id,
        createdByUserId: userId,
        customName: dto.customName ?? null,
        customDescription: dto.customDescription ?? null,
        quantity,
        state: (dto.state as ItemState) ?? 'AVAILABLE',
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        holderCharacterId: dto.holderCharacterId ?? null,
        mapId: dto.mapId ?? null,
        mapPointOfInterestId: dto.mapPointOfInterestId ?? null,
        masterNotes: dto.masterNotes?.trim() ?? '',
      }),
    );
    return toItemInstanceDto(instance, true);
  }

  async update(
    userId: string,
    campaignId: string,
    instanceId: string,
    dto: UpdateItemInstanceDto,
  ): Promise<ItemInstanceDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const instance = await this.loadOrFail(campaignId, instanceId);
    const def = await this.loadDefinition(campaignId, instance.itemDefinitionId);

    const quantity = dto.quantity ?? instance.quantity;
    this.assertUniqueRules(def, quantity, true);

    // Validate the MERGED location (undefined = keep, null = clear).
    const holder =
      dto.holderCharacterId !== undefined
        ? dto.holderCharacterId
        : instance.holderCharacterId;
    const mapId = dto.mapId !== undefined ? dto.mapId : instance.mapId;
    const pointId =
      dto.mapPointOfInterestId !== undefined
        ? dto.mapPointOfInterestId
        : instance.mapPointOfInterestId;
    await this.assertLocation(campaignId, holder, mapId, pointId);

    if (dto.customName !== undefined) instance.customName = dto.customName;
    if (dto.customDescription !== undefined) {
      instance.customDescription = dto.customDescription;
    }
    if (dto.quantity !== undefined) instance.quantity = dto.quantity;
    if (dto.state !== undefined) instance.state = dto.state as ItemState;
    if (dto.isVisibleToPlayers !== undefined) {
      instance.isVisibleToPlayers = dto.isVisibleToPlayers;
    }
    if (dto.holderCharacterId !== undefined) {
      instance.holderCharacterId = dto.holderCharacterId;
    }
    if (dto.mapId !== undefined) instance.mapId = dto.mapId;
    if (dto.mapPointOfInterestId !== undefined) {
      instance.mapPointOfInterestId = dto.mapPointOfInterestId;
    }
    if (dto.masterNotes !== undefined) {
      instance.masterNotes = dto.masterNotes.trim();
    }

    const saved = await this.items.saveInstance(instance);
    return toItemInstanceDto(saved, true);
  }

  async remove(
    userId: string,
    campaignId: string,
    instanceId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const instance = await this.loadOrFail(campaignId, instanceId);
    await this.items.removeInstance(instance);
  }

  // ── session management (master only) ────────────────────────

  /**
   * Gives an item to a character. UNIQUE items never fork: transfer the existing
   * instance (or create the single one if none exists). NON-unique items create a
   * fresh instance for the character. Location is cleared and state set to
   * CARRIED. Emits created/transferred accordingly.
   */
  async giveToCharacter(
    userId: string,
    campaignId: string,
    definitionId: string,
    dto: GiveItemToCharacterDto,
  ): Promise<ItemInstanceDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadDefinition(campaignId, definitionId);
    await this.assertCharacter(campaignId, dto.characterId);

    if (def.isUnique) {
      // Unique: reuse the existing instance if any (never create a second one).
      const existing = await this.items.findInstances(campaignId, {
        itemDefinitionId: def.id,
      });
      if (existing.length > 0) {
        const instance = this.placeWithHolder(existing[0], dto.characterId);
        instance.quantity = 1;
        const saved = await this.items.saveInstance(instance);
        await this.emitInstance(ITEM_INSTANCE_EVENTS.transferred, saved, userId);
        return toItemInstanceDto(saved, true);
      }
      const created = await this.items.saveInstance(
        this.items.createInstance(
          this.newHeldInstance(campaignId, userId, def.id, dto.characterId, 1),
        ),
      );
      await this.emitInstance(ITEM_INSTANCE_EVENTS.created, created, userId);
      return toItemInstanceDto(created, true);
    }

    // Non-unique: create a fresh instance for the character.
    const quantity = dto.quantity ?? 1;
    const created = await this.items.saveInstance(
      this.items.createInstance(
        this.newHeldInstance(campaignId, userId, def.id, dto.characterId, quantity),
      ),
    );
    await this.emitInstance(ITEM_INSTANCE_EVENTS.created, created, userId);
    return toItemInstanceDto(created, true);
  }

  /** Transfers a SPECIFIC existing instance to a character (unique or not). */
  async transferInstance(
    userId: string,
    campaignId: string,
    instanceId: string,
    dto: TransferItemInstanceDto,
  ): Promise<ItemInstanceDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const instance = await this.loadOrFail(campaignId, instanceId);
    await this.assertCharacter(campaignId, dto.characterId);
    const saved = await this.items.saveInstance(
      this.placeWithHolder(instance, dto.characterId),
    );
    await this.emitInstance(ITEM_INSTANCE_EVENTS.transferred, saved, userId);
    return toItemInstanceDto(saved, true);
  }

  /** Clears the holder of an instance (keeps the instance). Defaults state to AVAILABLE. */
  async unassignHolder(
    userId: string,
    campaignId: string,
    instanceId: string,
    dto: UnassignItemInstanceDto,
  ): Promise<ItemInstanceDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const instance = await this.loadOrFail(campaignId, instanceId);
    instance.holderCharacterId = null;
    instance.state = (dto.state as ItemState) ?? 'AVAILABLE';
    const saved = await this.items.saveInstance(instance);
    await this.emitInstance(ITEM_INSTANCE_EVENTS.unassigned, saved, userId);
    return toItemInstanceDto(saved, true);
  }

  // ── invariants ──────────────────────────────────────────────

  private assertUniqueRules(
    def: ItemDefinition,
    quantity: number,
    _isUpdate: boolean,
  ): void {
    if (def.isUnique && quantity !== 1) {
      throw new BadRequestException(
        'Item único deve ter quantidade igual a 1.',
      );
    }
  }

  /**
   * Validates the instance's simple location: at most one primary place (with a
   * character OR on a map/point), and every referenced entity in this campaign.
   */
  private async assertLocation(
    campaignId: string,
    holderCharacterId: string | null,
    mapId: string | null,
    mapPointOfInterestId: string | null,
  ): Promise<void> {
    if (holderCharacterId && (mapId || mapPointOfInterestId)) {
      throw new BadRequestException(
        'Uma instância não pode estar com um personagem e em um mapa ao mesmo tempo.',
      );
    }
    if (holderCharacterId) {
      const character = await this.characters.findInCampaign(
        campaignId,
        holderCharacterId,
      );
      if (!character) {
        throw new BadRequestException(
          'O personagem portador não pertence a esta campanha.',
        );
      }
    }
    if (mapId) {
      const map = await this.maps.findMapInCampaign(campaignId, mapId);
      if (!map) {
        throw new BadRequestException('O mapa não pertence a esta campanha.');
      }
    }
    if (mapPointOfInterestId) {
      const point = await this.maps.findPointInCampaign(
        campaignId,
        mapPointOfInterestId,
      );
      if (!point) {
        throw new BadRequestException(
          'O ponto de interesse não pertence a esta campanha.',
        );
      }
      if (mapId && point.mapId !== mapId) {
        throw new BadRequestException(
          'O ponto de interesse não pertence ao mapa informado.',
        );
      }
    }
  }

  /** Moves an instance onto a character, clearing any map/point location. */
  private placeWithHolder(
    instance: ItemInstance,
    characterId: string,
  ): ItemInstance {
    instance.holderCharacterId = characterId;
    instance.mapId = null;
    instance.mapPointOfInterestId = null;
    instance.state = 'CARRIED';
    return instance;
  }

  /** Builds a fresh instance held by a character (state CARRIED, no location). */
  private newHeldInstance(
    campaignId: string,
    userId: string,
    itemDefinitionId: string,
    characterId: string,
    quantity: number,
  ): Partial<ItemInstance> {
    return {
      campaignId,
      itemDefinitionId,
      createdByUserId: userId,
      customName: null,
      customDescription: null,
      quantity,
      state: 'CARRIED',
      isVisibleToPlayers: false,
      holderCharacterId: characterId,
      mapId: null,
      mapPointOfInterestId: null,
      masterNotes: '',
    };
  }

  private async assertCharacter(
    campaignId: string,
    characterId: string,
  ): Promise<void> {
    const character = await this.characters.findInCampaign(
      campaignId,
      characterId,
    );
    if (!character) {
      throw new BadRequestException(
        'O personagem informado não pertence a esta campanha.',
      );
    }
  }

  private async emitInstance(
    event: string,
    instance: ItemInstance,
    originUserId: string,
  ): Promise<void> {
    const payload = {
      tableId: instance.campaignId,
      itemDefinitionId: instance.itemDefinitionId,
      itemInstanceId: instance.id,
      holderCharacterId: instance.holderCharacterId,
      quantity: instance.quantity,
      state: instance.state,
      originUserId,
    };
    try {
      await this.realtime.emitToRoom(
        campaignRoom(instance.campaignId),
        event,
        payload,
      );
      await this.realtime.emitToRoom(
        itemRoom(instance.itemDefinitionId),
        event,
        payload,
      );
    } catch (error) {
      this.logger.warn(`Realtime emit "${event}" failed: ${(error as Error).message}`);
    }
  }

  private async loadDefinition(
    campaignId: string,
    definitionId: string,
  ): Promise<ItemDefinition> {
    const def = await this.items.findDefinitionById(definitionId);
    if (!def || def.campaignId !== campaignId) {
      throw new BadRequestException(
        'A definição de item não pertence a esta campanha.',
      );
    }
    return def;
  }

  private async loadOrFail(
    campaignId: string,
    instanceId: string,
  ): Promise<ItemInstance> {
    const instance = await this.items.findInstanceById(instanceId);
    if (!instance || instance.campaignId !== campaignId) {
      throw new NotFoundException('Instância de item não encontrada');
    }
    return instance;
  }
}
