import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullScreenLoader } from '../components/FullScreenLoader';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NewCampaignPage } from '../pages/NewCampaignPage';
import { CampaignDetailPage } from '../pages/CampaignDetailPage';
import { CampaignJoinPage } from '../pages/CampaignJoinPage';
import { CampaignAttributesPage } from '../pages/CampaignAttributesPage';
import { CampaignParticipantsPage } from '../pages/CampaignParticipantsPage';
import { FactionsListPage } from '../pages/FactionsListPage';
import { NewFactionPage } from '../pages/NewFactionPage';
import { FactionDetailPage } from '../pages/FactionDetailPage';
import { CharactersListPage } from '../pages/CharactersListPage';
import { CharacterArtDirectionPage } from '../pages/CharacterArtDirectionPage';
import { NewCharacterPage } from '../pages/NewCharacterPage';
import { CharacterDetailPage } from '../pages/CharacterDetailPage';
import { CharacterEditPage } from '../pages/CharacterEditPage';
import { MyCharacterPage } from '../pages/MyCharacterPage';
import { MapsListPage } from '../pages/MapsListPage';
import { MapArtDirectionPage } from '../pages/MapArtDirectionPage';
import { NewMapPage } from '../pages/NewMapPage';
import { MapDetailPage } from '../pages/MapDetailPage';
import { MapEditPage } from '../pages/MapEditPage';
import { ItemsListPage } from '../pages/ItemsListPage';
import { ItemArtDirectionPage } from '../pages/ItemArtDirectionPage';
import { NewItemPage } from '../pages/NewItemPage';
import { ItemDetailPage } from '../pages/ItemDetailPage';
import { ItemEditPage } from '../pages/ItemEditPage';
import { AbilitiesPage } from '../pages/AbilitiesPage';
import { NewAbilityPage } from '../pages/NewAbilityPage';
import { AbilityEditPage } from '../pages/AbilityEditPage';
import { SessionPage } from '../pages/SessionPage';

/**
 * Route table.
 *
 *   /login, /register  → public-only (redirect to /dashboard if logged in)
 *   /dashboard         → protected (redirect to /login if logged out)
 *   /                  → resolves to the right place based on auth state
 */
export function AppRoutes() {
  const { initializing, isAuthenticated } = useAuth();

  // Hold routing until a persisted session has been validated.
  if (initializing) {
    return <FullScreenLoader />;
  }

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* Full-viewport game screen — intentionally outside the admin shell. */}
        <Route path="/campaigns/:campaignId/session" element={<SessionPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campaigns/new" element={<NewCampaignPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="/campaigns/:id/join" element={<CampaignJoinPage />} />
          <Route path="/campaigns/:id/attributes" element={<CampaignAttributesPage />} />
          <Route path="/campaigns/:id/participants" element={<CampaignParticipantsPage />} />
          <Route path="/campaigns/:campaignId/factions" element={<FactionsListPage />} />
          <Route path="/campaigns/:campaignId/factions/new" element={<NewFactionPage />} />
          <Route path="/campaigns/:campaignId/factions/:factionId" element={<FactionDetailPage />} />
          <Route path="/campaigns/:campaignId/characters" element={<CharactersListPage />} />
          <Route path="/campaigns/:campaignId/characters/art-direction" element={<CharacterArtDirectionPage />} />
          <Route path="/campaigns/:campaignId/characters/new" element={<NewCharacterPage />} />
          <Route path="/campaigns/:campaignId/characters/:characterId" element={<CharacterDetailPage />} />
          <Route path="/campaigns/:campaignId/characters/:characterId/edit" element={<CharacterEditPage />} />
          <Route path="/campaigns/:campaignId/my-character" element={<MyCharacterPage />} />
          <Route path="/campaigns/:campaignId/maps" element={<MapsListPage />} />
          <Route path="/campaigns/:campaignId/maps/art-direction" element={<MapArtDirectionPage />} />
          <Route path="/campaigns/:campaignId/maps/new" element={<NewMapPage />} />
          <Route path="/campaigns/:campaignId/maps/:mapId" element={<MapDetailPage />} />
          <Route path="/campaigns/:campaignId/maps/:mapId/edit" element={<MapEditPage />} />
          <Route path="/campaigns/:campaignId/items" element={<ItemsListPage />} />
          <Route path="/campaigns/:campaignId/items/art-direction" element={<ItemArtDirectionPage />} />
          <Route path="/campaigns/:campaignId/items/new" element={<NewItemPage />} />
          <Route path="/campaigns/:campaignId/items/:itemId" element={<ItemDetailPage />} />
          <Route path="/campaigns/:campaignId/items/:itemId/edit" element={<ItemEditPage />} />
          <Route path="/campaigns/:campaignId/abilities" element={<AbilitiesPage />} />
          <Route path="/campaigns/:campaignId/abilities/new" element={<NewAbilityPage />} />
          <Route path="/campaigns/:campaignId/abilities/:abilityId/edit" element={<AbilityEditPage />} />
        </Route>
      </Route>

      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
        }
      />
    </Routes>
  );
}
