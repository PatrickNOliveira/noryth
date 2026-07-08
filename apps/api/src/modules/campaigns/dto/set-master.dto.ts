import { IsNotEmpty, IsUUID } from 'class-validator';

/** Payload for the owner to designate a participant as the campaign master. */
export class SetMasterDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;
}
