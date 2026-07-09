import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Character } from '../entities/character.entity';
import { CharacterAttributeValue } from '../entities/character-attribute-value.entity';
import {
  AttributeValueInput,
  CharactersRepository,
} from './characters.repository';

/** TypeORM adapter for {@link CharactersRepository}. */
@Injectable()
export class TypeOrmCharactersRepository implements CharactersRepository {
  constructor(
    @InjectRepository(Character)
    private readonly characters: Repository<Character>,
    @InjectRepository(CharacterAttributeValue)
    private readonly values: Repository<CharacterAttributeValue>,
  ) {}

  createCharacter(data: Partial<Character>): Character {
    return this.characters.create(data as DeepPartial<Character>);
  }

  saveCharacter(character: Character): Promise<Character> {
    return this.characters.save(character);
  }

  async removeCharacter(character: Character): Promise<void> {
    await this.values.delete({ characterId: character.id });
    await this.characters.remove(character);
  }

  findById(id: string): Promise<Character | null> {
    return this.characters.findOne({ where: { id } });
  }

  findByCampaign(campaignId: string): Promise<Character[]> {
    return this.characters.find({
      where: { campaignId },
      order: { createdAt: 'DESC' },
    });
  }

  findVisibleByCampaign(campaignId: string): Promise<Character[]> {
    return this.characters.find({
      where: { campaignId, isVisibleToPlayers: true },
      order: { createdAt: 'DESC' },
    });
  }

  findValues(characterId: string): Promise<CharacterAttributeValue[]> {
    return this.values.find({ where: { characterId } });
  }

  async replaceValues(
    characterId: string,
    values: AttributeValueInput[],
  ): Promise<CharacterAttributeValue[]> {
    await this.values.delete({ characterId });
    if (values.length === 0) return [];
    const rows = values.map((v) =>
      this.values.create({
        characterId,
        attributeId: v.attributeId,
        value: v.value,
      }),
    );
    return this.values.save(rows);
  }
}
