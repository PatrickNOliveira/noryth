import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsUUID,
  ValidateNested,
} from 'class-validator';

/** One character resource value to set (current + base max). */
export class CharacterResourceValueInput {
  @IsUUID()
  resourceDefinitionId!: string;

  @IsInt()
  currentValue!: number;

  @IsInt()
  maxValue!: number;
}

/** PUT body to set a character's resource values (master only). */
export class UpdateCharacterResourcesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CharacterResourceValueInput)
  resources!: CharacterResourceValueInput[];
}
