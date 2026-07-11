import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { CharactersService } from '@modules/characters/services/characters.service';
import { MapsService } from '@modules/maps/services/maps.service';
import { ItemDefinition } from '../entities/item-definition.entity';
import { ItemInstance } from '../entities/item-instance.entity';
import { ItemInstanceDto, toItemInstanceDto } from '../dto/item.dto';
import { CreateItemInstanceDto } from '../dto/create-item-instance.dto';
import { UpdateItemInstanceDto } from '../dto/update-item-instance.dto';
import {
  InstanceFilters,
  ITEMS_REPOSITORY,
  ItemsRepository,
} from '../repositories/items.repository';
import { ItemState } from '../item.constants';

/**
 * Application service for item INSTANCES: concrete occurrences of a definition
 * with a simple location and quantity. Master-only writes; players read only
 * visible instances. This is NOT a full inventory.
 */
@Injectable()
export class ItemInstancesService {
  constructor(
    @Inject(ITEMS_REPOSITORY)
    private readonly items: ItemsRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly maps: MapsService,
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
