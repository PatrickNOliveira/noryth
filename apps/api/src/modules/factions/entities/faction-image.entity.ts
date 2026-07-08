import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/abstractions/base.entity';
import { FactionImageStatus } from '../faction.constants';

/**
 * History of symbols generated for a faction. Every generation/regeneration is
 * kept; only one may be `isApproved` at a time (enforced by the service).
 * Image fields are nullable because a record is created (status "queued")
 * BEFORE the async job produces the actual image.
 */
@Entity({ name: 'faction_images' })
export class FactionImage extends BaseEntity {
  @Index('IDX_faction_images_faction')
  @Column({ name: 'faction_id', type: 'uuid' })
  factionId!: string;

  @Column({ name: 'image_path', type: 'varchar', length: 512, nullable: true })
  imagePath!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 1024, nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  prompt!: string | null;

  @Column({ name: 'negative_prompt', type: 'text', nullable: true })
  negativePrompt!: string | null;

  /** Adjustment notes that produced this image, if any. */
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status!: FactionImageStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'is_approved', type: 'boolean', default: false })
  isApproved!: boolean;
}
