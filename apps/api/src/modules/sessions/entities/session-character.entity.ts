import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { SpriteDirection } from '../session-character.constants';

/**
 * A character placed on the active session map. Position is stored as PERCENT
 * (0–100) of the scene, so it stays correct on any screen size. `facing` picks
 * which directional sprite to show. Removing a row only un-places the character;
 * it never deletes the campaign character.
 */
@Entity({ name: 'session_characters' })
@Index('IDX_session_characters_session', ['sessionId'])
@Index('IDX_session_characters_map', ['mapId'])
export class SessionCharacter extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'map_id', type: 'uuid' })
  mapId!: string;

  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  /** Percent 0–100 across the scene (foot anchor of the sprite). */
  @Column({ type: 'double precision', default: 50 })
  x!: number;

  @Column({ type: 'double precision', default: 50 })
  y!: number;

  @Column({ type: 'varchar', length: 16, default: 'FRONT' })
  facing!: SpriteDirection;

  /**
   * Visual scale of the sprite on the map only (never affects the character's
   * sheet, sprite asset or narrative size). 1.0 = the base render height.
   */
  @Column({ name: 'size_scale', type: 'double precision', default: 0.35 })
  sizeScale!: number;

  @Column({ name: 'is_visible_to_players', type: 'boolean', default: false })
  isVisibleToPlayers!: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @Column({ name: 'updated_by_user_id', type: 'uuid' })
  updatedByUserId!: string;
}
