import { IsUUID } from 'class-validator';
import { SessionDto } from './session.dto';

/** Body to switch the active session's map. Master only. */
export class ChangeMapDto {
  @IsUUID()
  mapId!: string;
}

/** Result of a map change: the updated session + what was cleared. */
export interface ChangeMapResultDto {
  session: SessionDto;
  previousMapId: string;
  removedSessionCharacterIds: string[];
}
