import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { SessionCharacter } from '../entities/session-character.entity';
import { CharacterSessionSprite } from '../entities/character-session-sprite.entity';
import { SpriteDirection } from '../session-character.constants';
import { SessionCharactersRepository } from './session-characters.repository';

/** TypeORM adapter for {@link SessionCharactersRepository}. */
@Injectable()
export class TypeOrmSessionCharactersRepository
  implements SessionCharactersRepository
{
  constructor(
    @InjectRepository(SessionCharacter)
    private readonly placed: Repository<SessionCharacter>,
    @InjectRepository(CharacterSessionSprite)
    private readonly sprites: Repository<CharacterSessionSprite>,
  ) {}

  create(data: Partial<SessionCharacter>): SessionCharacter {
    return this.placed.create(data as DeepPartial<SessionCharacter>);
  }

  save(entity: SessionCharacter): Promise<SessionCharacter> {
    return this.placed.save(entity);
  }

  async remove(entity: SessionCharacter): Promise<void> {
    await this.placed.remove(entity);
  }

  findById(id: string): Promise<SessionCharacter | null> {
    return this.placed.findOne({ where: { id } });
  }

  findBySessionAndMap(
    sessionId: string,
    mapId: string,
  ): Promise<SessionCharacter[]> {
    return this.placed.find({
      where: { sessionId, mapId },
      order: { createdAt: 'ASC' },
    });
  }

  findByCharacterInMap(
    sessionId: string,
    mapId: string,
    characterId: string,
  ): Promise<SessionCharacter | null> {
    return this.placed.findOne({ where: { sessionId, mapId, characterId } });
  }

  async exists(
    sessionId: string,
    mapId: string,
    characterId: string,
  ): Promise<boolean> {
    return (
      (await this.placed.countBy({ sessionId, mapId, characterId })) > 0
    );
  }

  async deleteBySession(sessionId: string): Promise<string[]> {
    const rows = await this.placed.find({
      where: { sessionId },
      select: { id: true },
    });
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) await this.placed.delete({ sessionId });
    return ids;
  }

  createSprite(data: Partial<CharacterSessionSprite>): CharacterSessionSprite {
    return this.sprites.create(data as DeepPartial<CharacterSessionSprite>);
  }

  saveSprite(sprite: CharacterSessionSprite): Promise<CharacterSessionSprite> {
    return this.sprites.save(sprite);
  }

  findSpriteById(id: string): Promise<CharacterSessionSprite | null> {
    return this.sprites.findOne({ where: { id } });
  }

  findSpritesByCharacter(
    characterId: string,
  ): Promise<CharacterSessionSprite[]> {
    return this.sprites.find({ where: { characterId } });
  }

  findSpriteByCharacterAndDirection(
    characterId: string,
    direction: string,
  ): Promise<CharacterSessionSprite | null> {
    return this.sprites.findOne({
      where: { characterId, direction: direction as SpriteDirection },
    });
  }

  findSpritesByCharacters(
    characterIds: string[],
  ): Promise<CharacterSessionSprite[]> {
    if (characterIds.length === 0) return Promise.resolve([]);
    return this.sprites.find({ where: { characterId: In(characterIds) } });
  }
}
