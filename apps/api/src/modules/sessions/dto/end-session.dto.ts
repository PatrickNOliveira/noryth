/** Result of ending the active session. */
export interface EndSessionResultDto {
  sessionId: string;
  tableId: string;
  status: string;
  endedAt: Date | null;
  endedByUserId: string | null;
}
