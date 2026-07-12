import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CharacterForm } from '../entities/character-form.entity';
import { CharacterFormAttributeValue } from '../entities/character-form-attribute-value.entity';
import { CharacterFormAbility } from '../entities/character-form-ability.entity';
import { CharacterFormSessionSprite } from '../entities/character-form-session-sprite.entity';
import { SpriteDirection } from '@modules/sessions/session-character.constants';
import {
  CharacterFormsRepository,
  FormAttributeInput,
  FormAbilityInput,
} from './character-forms.repository';

/** TypeORM adapter for {@link CharacterFormsRepository}. */
@Injectable()
export class TypeOrmCharacterFormsRepository implements CharacterFormsRepository {
  constructor(
    @InjectRepository(CharacterForm)
    private readonly forms: Repository<CharacterForm>,
    @InjectRepository(CharacterFormAttributeValue)
    private readonly values: Repository<CharacterFormAttributeValue>,
    @InjectRepository(CharacterFormAbility)
    private readonly abilities: Repository<CharacterFormAbility>,
    @InjectRepository(CharacterFormSessionSprite)
    private readonly sprites: Repository<CharacterFormSessionSprite>,
  ) {}

  create(data: Partial<CharacterForm>): CharacterForm {
    return this.forms.create(data as DeepPartial<CharacterForm>);
  }
  save(form: CharacterForm): Promise<CharacterForm> {
    return this.forms.save(form);
  }
  async remove(form: CharacterForm): Promise<void> {
    await this.values.delete({ characterFormId: form.id });
    await this.abilities.delete({ characterFormId: form.id });
    await this.forms.remove(form);
  }
  findById(id: string): Promise<CharacterForm | null> {
    return this.forms.findOne({ where: { id } });
  }
  findByCharacter(characterId: string): Promise<CharacterForm[]> {
    return this.forms.find({ where: { characterId }, order: { createdAt: 'ASC' } });
  }
  countByCharacter(characterId: string): Promise<number> {
    return this.forms.countBy({ characterId });
  }
  findDefault(characterId: string): Promise<CharacterForm | null> {
    return this.forms.findOne({ where: { characterId, isDefault: true } });
  }
  findActive(characterId: string): Promise<CharacterForm | null> {
    return this.forms.findOne({ where: { characterId, isActive: true } });
  }
  async clearDefault(characterId: string): Promise<void> {
    await this.forms.update({ characterId, isDefault: true }, { isDefault: false });
  }
  async clearActive(characterId: string): Promise<void> {
    await this.forms.update({ characterId, isActive: true }, { isActive: false });
  }

  findValues(formId: string): Promise<CharacterFormAttributeValue[]> {
    return this.values.find({ where: { characterFormId: formId } });
  }
  async replaceValues(
    formId: string,
    campaignId: string,
    values: FormAttributeInput[],
  ): Promise<CharacterFormAttributeValue[]> {
    await this.values.delete({ characterFormId: formId });
    if (values.length === 0) return [];
    const rows = values.map((v) =>
      this.values.create({
        characterFormId: formId,
        campaignId,
        attributeId: v.attributeId,
        value: v.value,
      }),
    );
    return this.values.save(rows);
  }

  findAbilities(formId: string): Promise<CharacterFormAbility[]> {
    return this.abilities.find({ where: { characterFormId: formId } });
  }
  async replaceAbilities(
    formId: string,
    campaignId: string,
    abilities: FormAbilityInput[],
  ): Promise<CharacterFormAbility[]> {
    await this.abilities.delete({ characterFormId: formId });
    if (abilities.length === 0) return [];
    const rows = abilities.map((a) =>
      this.abilities.create({
        characterFormId: formId,
        campaignId,
        abilityDefinitionId: a.abilityDefinitionId,
        isVisibleToPlayers: a.isVisibleToPlayers,
      }),
    );
    return this.abilities.save(rows);
  }

  createSprite(data: Partial<CharacterFormSessionSprite>): CharacterFormSessionSprite {
    return this.sprites.create(data as DeepPartial<CharacterFormSessionSprite>);
  }
  saveSprite(sprite: CharacterFormSessionSprite): Promise<CharacterFormSessionSprite> {
    return this.sprites.save(sprite);
  }
  findSpriteById(id: string): Promise<CharacterFormSessionSprite | null> {
    return this.sprites.findOne({ where: { id } });
  }
  findSpritesByForm(formId: string): Promise<CharacterFormSessionSprite[]> {
    return this.sprites.find({ where: { characterFormId: formId } });
  }
  findSpriteByFormDirection(
    formId: string,
    direction: string,
  ): Promise<CharacterFormSessionSprite | null> {
    return this.sprites.findOne({
      where: { characterFormId: formId, direction: direction as SpriteDirection },
    });
  }
}
