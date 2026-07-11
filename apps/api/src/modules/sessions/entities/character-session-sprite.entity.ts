import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { SpriteDirection, SpriteImageStatus } from '../session-character.constants';

/**
 * A per-direction 2.5D session sprite for a character — a full-body, third-person
 * asset for placement on the session map. This is a DISTINCT asset from the
 * character's portrait (`Character.imageUrl`), which is only used as a reference.
 * One row per (character, direction).
 */
@Entity({ name: 'character_session_sprites' })
@Index('IDX_character_session_sprites_character', ['characterId'])
@Unique('UQ_character_session_sprite_direction', ['characterId', 'direction'])
export class CharacterSessionSprite extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  @Column({ type: 'varchar', length: 16 })
  direction!: SpriteDirection;

  @Column({ name: 'image_path', type: 'varchar', length: 512, nullable: true })
  imagePath!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'image_status', type: 'varchar', length: 20, default: 'none' })
  imageStatus!: SpriteImageStatus;

  @Column({ name: 'image_error', type: 'text', nullable: true })
  imageError!: string | null;

  @Column({ name: 'image_job_id', type: 'varchar', length: 128, nullable: true })
  imageJobId!: string | null;

  @Column({ name: 'last_prompt', type: 'text', nullable: true })
  lastPrompt!: string | null;

  @Column({ name: 'last_negative_prompt', type: 'text', nullable: true })
  lastNegativePrompt!: string | null;
}
