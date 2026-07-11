import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { AbilityDefinition } from '../entities/ability-definition.entity';
import { CharacterAbility } from '../entities/character-ability.entity';
import { AbilitiesRepository } from './abilities.repository';

/** TypeORM adapter for {@link AbilitiesRepository}. */
@Injectable()
export class TypeOrmAbilitiesRepository implements AbilitiesRepository {
  constructor(
    @InjectRepository(AbilityDefinition)
    private readonly definitions: Repository<AbilityDefinition>,
    @InjectRepository(CharacterAbility)
    private readonly links: Repository<CharacterAbility>,
  ) {}

  createDefinition(data: Partial<AbilityDefinition>): AbilityDefinition {
    return this.definitions.create(data as DeepPartial<AbilityDefinition>);
  }

  saveDefinition(def: AbilityDefinition): Promise<AbilityDefinition> {
    return this.definitions.save(def);
  }

  async removeDefinition(def: AbilityDefinition): Promise<void> {
    await this.definitions.remove(def);
  }

  findDefinitionById(id: string): Promise<AbilityDefinition | null> {
    return this.definitions.findOne({ where: { id } });
  }

  findDefinitionsByCampaign(campaignId: string): Promise<AbilityDefinition[]> {
    return this.definitions.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }

  findPendingDefinitions(campaignId: string): Promise<AbilityDefinition[]> {
    return this.definitions.find({
      where: {
        campaignId,
        approvalStatus: In(['PENDING_APPROVAL', 'CHANGES_REQUESTED']),
      },
      order: { createdAt: 'ASC' },
    });
  }

  createLink(data: Partial<CharacterAbility>): CharacterAbility {
    return this.links.create(data as DeepPartial<CharacterAbility>);
  }

  saveLink(link: CharacterAbility): Promise<CharacterAbility> {
    return this.links.save(link);
  }

  async removeLink(link: CharacterAbility): Promise<void> {
    await this.links.remove(link);
  }

  findLinkById(id: string): Promise<CharacterAbility | null> {
    return this.links.findOne({ where: { id } });
  }

  findLinksByCharacter(characterId: string): Promise<CharacterAbility[]> {
    return this.links.find({
      where: { characterId },
      order: { createdAt: 'DESC' },
    });
  }

  findLinksByDefinition(definitionId: string): Promise<CharacterAbility[]> {
    return this.links.find({ where: { abilityDefinitionId: definitionId } });
  }

  async existsLink(characterId: string, definitionId: string): Promise<boolean> {
    return (
      (await this.links.countBy({
        characterId,
        abilityDefinitionId: definitionId,
      })) > 0
    );
  }

  countActiveLinksByDefinition(definitionId: string): Promise<number> {
    return this.links.countBy({
      abilityDefinitionId: definitionId,
      status: 'ACTIVE',
    });
  }
}
