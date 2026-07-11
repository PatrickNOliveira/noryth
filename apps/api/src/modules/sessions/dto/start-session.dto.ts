import { IsUUID } from 'class-validator';

/** Payload to start a session: the master picks the initial map. */
export class StartSessionDto {
  @IsUUID()
  initialMapId!: string;
}
