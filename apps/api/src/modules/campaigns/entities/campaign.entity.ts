import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import {
  CampaignStatus,
  CampaignVisibility,
} from '../campaign.constants';

/**
 * Campaign aggregate — the "book" that will later hold players, characters,
 * factions, maps, sessions and lore. `passwordHash` never leaves the API.
 */
@Entity({ name: 'campaigns' })
export class Campaign extends BaseEntity {
  @Index('IDX_campaigns_owner')
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'master_id', type: 'uuid' })
  masterId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  /** Stored slug, or free text when the theme is "custom". */
  @Column({ type: 'varchar', length: 120 })
  theme!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 280 })
  shortDescription!: string;

  @Column({ type: 'text' })
  premise!: string;

  /** Stored slug, or free text when the tone is "custom". */
  @Column({ type: 'varchar', length: 120 })
  tone!: string;

  @Column({ name: 'main_language', type: 'varchar', length: 16 })
  mainLanguage!: string;

  @Column({ type: 'varchar', length: 16 })
  visibility!: CampaignVisibility;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'max_players', type: 'int', nullable: true })
  maxPlayers!: number | null;

  @Column({ name: 'cover_image_path', type: 'varchar', length: 512, nullable: true })
  coverImagePath!: string | null;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 1024, nullable: true })
  coverImageUrl!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: CampaignStatus;

  /**
   * Global art direction for this campaign's character portraits (master-only).
   * Empty = no global direction; the prompt builder folds it into every
   * character image unless a generation explicitly ignores it.
   */
  @Column({ name: 'character_art_direction', type: 'text', default: '' })
  characterArtDirection!: string;

  /** Global art direction for this campaign's maps (master-only). */
  @Column({ name: 'map_art_direction', type: 'text', default: '' })
  mapArtDirection!: string;

  /** Default attribute-point budget copied to new player characters. Null = unset. */
  @Column({
    name: 'default_player_character_attribute_points',
    type: 'int',
    nullable: true,
  })
  defaultPlayerCharacterAttributePoints!: number | null;

  /** Global art direction for this campaign's item images (master-only). */
  @Column({ name: 'item_art_direction', type: 'text', default: '' })
  itemArtDirection!: string;
}
