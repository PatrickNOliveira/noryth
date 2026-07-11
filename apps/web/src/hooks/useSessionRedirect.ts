import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { realtime, SESSION_EVENTS } from '../services/realtime';
import { useAppDispatch } from '../store/hooks';
import { sessionStarted } from '../store/slices/session.slice';

/**
 * While mounted on a campaign screen, listens for the master starting a session
 * and takes the participant straight to the session screen. Keeps feature
 * screens free of transport details — everything goes through the realtime
 * abstraction and the campaign room.
 */
export function useSessionRedirect(campaignId: string): void {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!campaignId) return;
    const room = `campaign:${campaignId}`;
    const handler = (payload: unknown) => {
      const p = payload as { tableId?: string; sessionId?: string };
      if (p?.tableId && p.tableId !== campaignId) return;
      if (p?.sessionId) dispatch(sessionStarted({ sessionId: p.sessionId }));
      navigate(`/campaigns/${campaignId}/session`);
    };
    realtime.join(room);
    realtime.on(SESSION_EVENTS.started, handler);
    return () => {
      realtime.off(SESSION_EVENTS.started, handler);
      realtime.leave(room);
    };
  }, [campaignId, navigate, dispatch]);
}
