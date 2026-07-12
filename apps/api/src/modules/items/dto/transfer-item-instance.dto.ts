import { IsUUID } from 'class-validator';

/** Transfer a specific existing instance to a character. */
export class TransferItemInstanceDto {
  @IsUUID()
  characterId!: string;
}
