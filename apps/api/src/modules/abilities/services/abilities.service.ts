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
  REALTIME_PROVIDER,
  RealtimeProvider,
} from '@shared/providers/realtime/realtime.provider';
import { CampaignsService } from '@modules/campaigns/services/campaigns.service';
import { campaignRoom } from '@modules/campaigns/campaign.constants';
import { CharactersService } from '@modules/characters/services/characters.service';
import { FactionsService } from '@modules/factions/services/factions.service';
import { AbilityDefinition } from '../entities/ability-definition.entity';
import { CharacterAbility } from '../entities/character-ability.entity';
import {
  AbilityDefinitionDto,
  CharacterAbilityDto,
  toAbilityDefinitionDto,
  toCharacterAbilityDto,
} from '../dto/ability.dto';
import { CreateAbilityDto } from '../dto/create-ability.dto';
import { UpdateAbilityDto } from '../dto/update-ability.dto';
import { ProposeAbilityDto, UpdateProposalDto } from '../dto/propose-ability.dto';
import { AssignAbilityDto } from '../dto/assign-ability.dto';
import { ABILITY_EVENTS } from '../ability.constants';
import {
  ABILITIES_REPOSITORY,
  AbilitiesRepository,
} from '../repositories/abilities.repository';

export interface AbilityListFilters {
  status?: string;
  createdByMe?: boolean;
  proposedForCharacterId?: string;
}

/**
 * Application service for abilities: master CRUD + player proposals + the
 * approval workflow + character assignment. Master creations are born APPROVED;
 * player proposals are born PENDING_APPROVAL and only become an active
 * CharacterAbility after the master approves. Realtime is via the port only.
 */
@Injectable()
export class AbilitiesService {
  private readonly logger = new Logger(AbilitiesService.name);

  constructor(
    @Inject(ABILITIES_REPOSITORY)
    private readonly abilities: AbilitiesRepository,
    private readonly campaigns: CampaignsService,
    private readonly characters: CharactersService,
    private readonly factions: FactionsService,
    @Inject(REALTIME_PROVIDER)
    private readonly realtime: RealtimeProvider,
  ) {}

  // ── reads ───────────────────────────────────────────────────

  async list(
    userId: string,
    campaignId: string,
    filters: AbilityListFilters = {},
  ): Promise<AbilityDefinitionDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    let defs = await this.abilities.findDefinitionsByCampaign(campaignId);

    // Player visibility: public abilities + their own proposals.
    if (!isMaster) {
      defs = defs.filter(
        (d) => d.isVisibleToPlayers || d.proposedByUserId === userId,
      );
    }
    if (filters.status) defs = defs.filter((d) => d.approvalStatus === filters.status);
    if (filters.createdByMe) defs = defs.filter((d) => d.createdByUserId === userId);
    if (filters.proposedForCharacterId) {
      defs = defs.filter(
        (d) => d.proposedForCharacterId === filters.proposedForCharacterId,
      );
    }
    return defs.map((d) =>
      toAbilityDefinitionDto(d, isMaster, d.proposedByUserId === userId),
    );
  }

  async listPending(
    userId: string,
    campaignId: string,
  ): Promise<AbilityDefinitionDto[]> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const defs = await this.abilities.findPendingDefinitions(campaignId);
    return defs.map((d) => toAbilityDefinitionDto(d, true));
  }

  async getDetail(
    userId: string,
    campaignId: string,
    abilityId: string,
  ): Promise<AbilityDefinitionDto> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const def = await this.loadOrFail(campaignId, abilityId);
    const isProposer = def.proposedByUserId === userId;
    if (!isMaster && !def.isVisibleToPlayers && !isProposer) {
      throw new NotFoundException('Habilidade não encontrada');
    }
    return toAbilityDefinitionDto(def, isMaster, isProposer);
  }

  async listCharacterAbilities(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<CharacterAbilityDto[]> {
    const campaign = await this.campaigns.findForMemberOrFail(userId, campaignId);
    const isMaster = campaign.masterId === userId;
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    const isController = character.controlledByUserId === userId;
    if (!isMaster && !isController && !character.isVisibleToPlayers) {
      throw new NotFoundException('Personagem não encontrado');
    }

    let links = await this.abilities.findLinksByCharacter(characterId);
    if (!isMaster && !isController) {
      links = links.filter((l) => l.isVisibleToPlayers);
    }
    const out: CharacterAbilityDto[] = [];
    for (const link of links) {
      const def = await this.abilities.findDefinitionById(link.abilityDefinitionId);
      out.push(toCharacterAbilityDto(link, def ?? undefined, isMaster));
    }
    return out;
  }

  // ── master: create/update/remove ────────────────────────────

  async create(
    userId: string,
    campaignId: string,
    dto: CreateAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    await this.assertFaction(campaignId, dto.factionId);

    const def = await this.abilities.saveDefinition(
      this.abilities.createDefinition({
        campaignId,
        createdByUserId: userId,
        // Master-created abilities are born approved.
        approvalStatus: 'APPROVED',
        approvedByUserId: userId,
        approvedAt: new Date(),
        ...this.narrativeFields(dto),
        isUnique: dto.isUnique ?? false,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        factionId: dto.factionId ?? null,
        masterNotes: dto.masterNotes?.trim() ?? '',
      }),
    );
    return toAbilityDefinitionDto(def, true);
  }

  async update(
    userId: string,
    campaignId: string,
    abilityId: string,
    dto: UpdateAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, abilityId);
    if (dto.factionId !== undefined && dto.factionId !== null) {
      await this.assertFaction(campaignId, dto.factionId);
    }
    this.applyNarrative(def, dto);
    if (dto.isUnique !== undefined) def.isUnique = dto.isUnique;
    if (dto.isVisibleToPlayers !== undefined) def.isVisibleToPlayers = dto.isVisibleToPlayers;
    if (dto.factionId !== undefined) def.factionId = dto.factionId;
    if (dto.masterNotes !== undefined) def.masterNotes = dto.masterNotes.trim();
    const saved = await this.abilities.saveDefinition(def);
    return toAbilityDefinitionDto(saved, true);
  }

  async remove(userId: string, campaignId: string, abilityId: string): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, abilityId);
    const links = await this.abilities.findLinksByDefinition(def.id);
    if (links.length > 0) {
      throw new ConflictException(
        'Esta habilidade está atribuída a personagens. Remova os vínculos antes de apagar.',
      );
    }
    await this.abilities.removeDefinition(def);
  }

  // ── approval workflow (master) ──────────────────────────────

  async approve(
    userId: string,
    campaignId: string,
    abilityId: string,
    reviewNotes?: string,
  ): Promise<AbilityDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, abilityId);
    this.assertReviewable(def);
    await this.assertUniqueAvailable(def);

    def.approvalStatus = 'APPROVED';
    def.approvedByUserId = userId;
    def.approvedAt = new Date();
    def.rejectedByUserId = null;
    def.rejectedAt = null;
    if (reviewNotes !== undefined) def.reviewNotes = reviewNotes.trim();
    const saved = await this.abilities.saveDefinition(def);

    // Link it to the proposed character (if any), if not already linked.
    if (saved.proposedForCharacterId) {
      const already = await this.abilities.existsLink(
        saved.proposedForCharacterId,
        saved.id,
      );
      if (!already) {
        await this.abilities.saveLink(
          this.abilities.createLink({
            campaignId,
            characterId: saved.proposedForCharacterId,
            abilityDefinitionId: saved.id,
            assignedByUserId: userId,
            isVisibleToPlayers: saved.isVisibleToPlayers,
            status: 'ACTIVE',
            customDescription: null,
            masterNotes: '',
          }),
        );
        await this.emit(campaignId, ABILITY_EVENTS.assigned, {
          abilityId: saved.id,
          characterId: saved.proposedForCharacterId,
        });
      }
    }
    await this.emit(campaignId, ABILITY_EVENTS.approved, { abilityId: saved.id });
    return toAbilityDefinitionDto(saved, true);
  }

  async reject(
    userId: string,
    campaignId: string,
    abilityId: string,
    reviewNotes?: string,
  ): Promise<AbilityDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, abilityId);
    this.assertReviewable(def);
    def.approvalStatus = 'REJECTED';
    def.rejectedByUserId = userId;
    def.rejectedAt = new Date();
    if (reviewNotes !== undefined) def.reviewNotes = reviewNotes.trim();
    const saved = await this.abilities.saveDefinition(def);
    await this.emit(campaignId, ABILITY_EVENTS.rejected, { abilityId: saved.id });
    return toAbilityDefinitionDto(saved, true);
  }

  async requestChanges(
    userId: string,
    campaignId: string,
    abilityId: string,
    reviewNotes?: string,
  ): Promise<AbilityDefinitionDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, abilityId);
    this.assertReviewable(def);
    def.approvalStatus = 'CHANGES_REQUESTED';
    if (reviewNotes !== undefined) def.reviewNotes = reviewNotes.trim();
    const saved = await this.abilities.saveDefinition(def);
    await this.emit(campaignId, ABILITY_EVENTS.changesRequested, { abilityId: saved.id });
    return toAbilityDefinitionDto(saved, true);
  }

  // ── player proposals ────────────────────────────────────────

  async propose(
    userId: string,
    campaignId: string,
    characterId: string,
    dto: ProposeAbilityDto,
  ): Promise<AbilityDefinitionDto> {
    await this.assertControlsCharacter(userId, campaignId, characterId);
    const def = await this.abilities.saveDefinition(
      this.abilities.createDefinition({
        campaignId,
        createdByUserId: userId,
        proposedByUserId: userId,
        proposedForCharacterId: characterId,
        approvalStatus: 'PENDING_APPROVAL',
        ...this.narrativeFields(dto),
        isUnique: dto.isUnique ?? false,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        factionId: null,
        masterNotes: '',
      }),
    );
    await this.emit(campaignId, ABILITY_EVENTS.proposed, {
      abilityId: def.id,
      characterId,
    });
    return toAbilityDefinitionDto(def, false, true);
  }

  async updateProposal(
    userId: string,
    campaignId: string,
    abilityId: string,
    dto: UpdateProposalDto,
  ): Promise<AbilityDefinitionDto> {
    await this.campaigns.findForMemberOrFail(userId, campaignId);
    const def = await this.loadOrFail(campaignId, abilityId);
    if (def.proposedByUserId !== userId) {
      throw new ForbiddenException('Você só pode editar as suas próprias propostas.');
    }
    if (
      def.approvalStatus !== 'PENDING_APPROVAL' &&
      def.approvalStatus !== 'CHANGES_REQUESTED'
    ) {
      throw new BadRequestException(
        'Só é possível editar uma proposta pendente ou com alterações solicitadas.',
      );
    }
    this.applyNarrative(def, dto);
    if (dto.isUnique !== undefined) def.isUnique = dto.isUnique;
    if (dto.isVisibleToPlayers !== undefined) def.isVisibleToPlayers = dto.isVisibleToPlayers;
    // Resubmitting a "changes requested" proposal returns it to the queue.
    if (def.approvalStatus === 'CHANGES_REQUESTED') {
      def.approvalStatus = 'PENDING_APPROVAL';
    }
    const saved = await this.abilities.saveDefinition(def);
    await this.emit(campaignId, ABILITY_EVENTS.proposed, { abilityId: saved.id });
    return toAbilityDefinitionDto(saved, false, true);
  }

  // ── assignment (master) ─────────────────────────────────────

  async assign(
    userId: string,
    campaignId: string,
    characterId: string,
    dto: AssignAbilityDto,
  ): Promise<CharacterAbilityDto> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    const def = await this.loadOrFail(campaignId, dto.abilityDefinitionId);
    if (def.approvalStatus !== 'APPROVED') {
      throw new BadRequestException('Só é possível atribuir habilidades aprovadas.');
    }
    if (await this.abilities.existsLink(characterId, def.id)) {
      throw new ConflictException('Este personagem já possui esta habilidade.');
    }
    await this.assertUniqueAvailable(def);

    const link = await this.abilities.saveLink(
      this.abilities.createLink({
        campaignId,
        characterId,
        abilityDefinitionId: def.id,
        assignedByUserId: userId,
        isVisibleToPlayers: dto.isVisibleToPlayers ?? false,
        status: 'ACTIVE',
        customDescription: dto.customDescription?.trim() ?? null,
        masterNotes: dto.masterNotes?.trim() ?? '',
      }),
    );
    await this.emit(campaignId, ABILITY_EVENTS.assigned, {
      abilityId: def.id,
      characterId,
    });
    return toCharacterAbilityDto(link, def, true);
  }

  async removeAbilityFromCharacter(
    userId: string,
    campaignId: string,
    characterId: string,
    characterAbilityId: string,
  ): Promise<void> {
    await this.campaigns.findForMasterOrFail(userId, campaignId);
    const link = await this.abilities.findLinkById(characterAbilityId);
    if (
      !link ||
      link.campaignId !== campaignId ||
      link.characterId !== characterId
    ) {
      throw new NotFoundException('Vínculo de habilidade não encontrado');
    }
    await this.abilities.removeLink(link);
    await this.emit(campaignId, ABILITY_EVENTS.removed, {
      abilityId: link.abilityDefinitionId,
      characterId,
    });
  }

  // ── helpers ─────────────────────────────────────────────────

  private narrativeFields(dto: {
    name: string;
    type?: string;
    shortDescription?: string;
    description?: string;
    history?: string;
    effectDescription?: string;
    rulesText?: string;
    costDescription?: string;
    limitationDescription?: string;
  }): Partial<AbilityDefinition> {
    return {
      name: dto.name.trim(),
      type: dto.type?.trim() ?? '',
      shortDescription: dto.shortDescription?.trim() ?? '',
      description: dto.description?.trim() ?? '',
      history: dto.history?.trim() ?? '',
      effectDescription: dto.effectDescription?.trim() ?? '',
      rulesText: dto.rulesText?.trim() ?? '',
      costDescription: dto.costDescription?.trim() ?? '',
      limitationDescription: dto.limitationDescription?.trim() ?? '',
    };
  }

  private applyNarrative(
    def: AbilityDefinition,
    dto: Partial<{
      name: string;
      type: string;
      shortDescription: string;
      description: string;
      history: string;
      effectDescription: string;
      rulesText: string;
      costDescription: string;
      limitationDescription: string;
    }>,
  ): void {
    const set = (k: keyof AbilityDefinition, v?: string) => {
      if (v !== undefined) (def[k] as string) = v.trim();
    };
    set('name', dto.name);
    set('type', dto.type);
    set('shortDescription', dto.shortDescription);
    set('description', dto.description);
    set('history', dto.history);
    set('effectDescription', dto.effectDescription);
    set('rulesText', dto.rulesText);
    set('costDescription', dto.costDescription);
    set('limitationDescription', dto.limitationDescription);
  }

  private assertReviewable(def: AbilityDefinition): void {
    if (
      def.approvalStatus !== 'PENDING_APPROVAL' &&
      def.approvalStatus !== 'CHANGES_REQUESTED'
    ) {
      throw new BadRequestException(
        'Esta habilidade não está aguardando revisão.',
      );
    }
  }

  private async assertUniqueAvailable(def: AbilityDefinition): Promise<void> {
    if (!def.isUnique) return;
    if ((await this.abilities.countActiveLinksByDefinition(def.id)) > 0) {
      throw new ConflictException(
        'Esta habilidade é única e já está atribuída a outro personagem nesta campanha.',
      );
    }
  }

  private async assertFaction(
    campaignId: string,
    factionId?: string | null,
  ): Promise<void> {
    if (!factionId) return;
    const faction = await this.factions.findInCampaign(campaignId, factionId);
    if (!faction) {
      throw new BadRequestException(
        'A facção informada não pertence a esta campanha.',
      );
    }
  }

  private async assertControlsCharacter(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<void> {
    await this.campaigns.findForMemberOrFail(userId, campaignId);
    const character = await this.characters.findInCampaign(campaignId, characterId);
    if (!character) throw new NotFoundException('Personagem não encontrado');
    if (character.controlledByUserId !== userId) {
      throw new ForbiddenException(
        'Você só pode propor habilidades para o seu próprio personagem.',
      );
    }
  }

  private async loadOrFail(
    campaignId: string,
    abilityId: string,
  ): Promise<AbilityDefinition> {
    const def = await this.abilities.findDefinitionById(abilityId);
    if (!def || def.campaignId !== campaignId) {
      throw new NotFoundException('Habilidade não encontrada');
    }
    return def;
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
