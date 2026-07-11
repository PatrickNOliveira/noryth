import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body for (re)generating a map's 2.5D session scene. */
export class GenerateSessionSceneDto {
  /** Optional free-text tweaks the master wants applied to the scene. */
  @IsOptional()
  @IsString()
  @MaxLength(600)
  adjustments?: string;
}
