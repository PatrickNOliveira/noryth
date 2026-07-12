import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { CharacterImageStatus } from '@modules/characters/character.constants';
import { SpriteDirection } from '@modules/sessions/session-character.constants';

/**
 * A per-direction 2.5D SESSION sprite for a specific character FORM. When the
 * active form changes on the map, the sprite shown is this form's sprite for the
 * current facing. Distinct from the form's ficha image. One row per (form,
 * direction).
 */
@Entity({ name: 'character_form_session_sprites' })
@Index('IDX_character_form_sprites_form', ['characterFormId'])
@Index('IDX_character_form_sprites_character', ['characterId'])
@Unique('UQ_character_form_sprite_direction', ['characterFormId', 'direction'])
export class CharacterFormSessionSprite extends BaseEntity {
  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId!: string;

  @Column({ name: 'character_id', type: 'uuid' })
  characterId!: string;

  @Column({ name: 'character_form_id', type: 'uuid' })
  characterFormId!: string;

  @Column({ type: 'varchar', length: 16 })
  direction!: SpriteDirection;

  @Column({ name: 'image_path', type: 'varchar', length: 512, nullable: true })
  imagePath!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'image_status', type: 'varchar', length: 20, default: 'none' })
  imageStatus!: CharacterImageStatus;

  @Column({ name: 'image_error', type: 'text', nullable: true })
  imageError!: string | null;

  @Column({ name: 'image_job_id', type: 'varchar', length: 128, nullable: true })
  imageJobId!: string | null;

  @Column({ name: 'last_prompt', type: 'text', nullable: true })
  lastPrompt!: string | null;

  @Column({ name: 'last_negative_prompt', type: 'text', nullable: true })
  lastNegativePrompt!: string | null;
}
