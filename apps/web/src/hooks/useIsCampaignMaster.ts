import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCampaign } from '../store/slices/campaigns.slice';

export interface CampaignMasterState {
  /** True only once the campaign is known AND the user is its current master. */
  isMaster: boolean;
  /** False while the campaign is still being resolved (avoids wrong redirects). */
  resolved: boolean;
}

/**
 * Resolves whether the authenticated user is the CURRENT master of the campaign
 * — the gate for narrative/playable configuration (factions, attributes, …).
 * Mirrors the backend rule (`campaign.masterId === user.id`); the server stays
 * the real authority, this only drives UX.
 *
 * Reads the campaign from whatever the store already has (selected or "mine")
 * and fetches it once if absent, so it works on deep links too.
 */
export function useCampaignMaster(campaignId: string): CampaignMasterState {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((s) => s.auth.user?.id);
  const selected = useAppSelector((s) => s.campaigns.selectedCampaign);
  const mine = useAppSelector((s) => s.campaigns.myCampaigns);

  const campaign =
    selected?.id === campaignId
      ? selected
      : mine.find((c) => c.id === campaignId);

  useEffect(() => {
    if (campaignId && !campaign) dispatch(fetchCampaign(campaignId));
  }, [campaignId, campaign, dispatch]);

  return {
    isMaster: !!campaign && !!userId && campaign.masterId === userId,
    resolved: !!campaign,
  };
}

/** Convenience boolean for the common "hide the button" case. */
export function useIsCampaignMaster(campaignId: string): boolean {
  return useCampaignMaster(campaignId).isMaster;
}
