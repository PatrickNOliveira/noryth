import { IsInt, IsUUID } from 'class-validator';

/** One attribute value in a create/update character payload. */
export class CharacterAttributeInput {
  @IsUUID()
  attributeId!: string;

  @IsInt()
  value!: number;
}
