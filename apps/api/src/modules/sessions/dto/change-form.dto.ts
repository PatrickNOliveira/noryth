import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Change the active form of a placed session character. Master only. */
export class ChangeFormDto {
  @IsUUID()
  formId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMutationId?: string;
}
