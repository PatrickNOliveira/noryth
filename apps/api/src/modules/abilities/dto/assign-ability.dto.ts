import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Master assigns an approved ability to a character. */
export class AssignAbilityDto {
  @IsUUID()
  abilityDefinitionId!: string;

  @IsOptional()
  @IsBoolean()
  isVisibleToPlayers?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  customDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  masterNotes?: string;
}
