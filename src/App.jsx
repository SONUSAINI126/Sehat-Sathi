import React from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { AppStateProvider } from '@/state/store';
import { AuthProvider } from '@/lib/auth';
import { RequireRole } from '@/components/RequireRole';
import { Header } from '@/components/Header';
import { SideNav } from '@/components/SideNav';
import { BottomNav } from '@/components/BottomNav';
import { FloatingAssistantMic } from '@/components/FloatingAssistantMic';

// Citizen pages
import { Landing } from '@/pages/Landing';
import { Onboarding } from '@/pages/Onboarding';
import { UserHome } from '@/pages/UserHome';
import { Assistant } from '@/pages/Assistant';
import { Schemes } from '@/pages/Schemes';
import { SchemeDetail } from '@/pages/SchemeDetail';
import { Care } from '@/pages/Care';
import { Emergency } from '@/pages/Emergency';
import { EmergencyContacts } from '@/pages/EmergencyContacts';
import { ImageAssist } from '@/pages/ImageAssist';
import { Benefits } from '@/pages/Benefits';
import { Notifications } from '@/pages/Notifications';
import { Messages } from '@/pages/Messages';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';

// ASHA portal — its own chrome, its own rules
import { AshaLogin } from '@/pages/AshaLogin';
import { AshaRegister } from '@/pages/asha/Register';
import { AshaDashboard } from '@/pages/asha/Dashboard';
import { AshaAlerts } from '@/pages/asha/Alerts';
import { AshaAlertDetail } from '@/pages/asha/AlertDetail';
import { AshaReferrals } from '@/pages/asha/Referrals';
import { AshaReferralDetail } from '@/pages/asha/ReferralDetail';
import { AshaHealthcare } from '@/pages/asha/Healthcare';
import { AshaSchemes } from '@/pages/asha/Schemes';
import { AshaCamps } from '@/pages/asha/Camps';
import { AshaBroadcast } from '@/pages/asha/Broadcast';
import { AshaMessages } from '@/pages/asha/Messages';
import { AshaProfile } from '@/pages/asha/Profile';


// Admin — the ASHA approval queue
import { AdminAshaRequests } from '@/pages/admin/AshaRequests';

/**
 * Routes that run edge-to-edge with no citizen chrome around them.
 *
 * The whole /asha tree is bare because the portal carries its own
 * shell — identity bar, section nav, footer. Stacking the citizen
 * header on top of it would give a worker two navigations and two
 * places to sign out. /admin is bare for the same reason.
 */
const BARE_EXACT = ['/', '/onboarding'];
const BARE_PREFIX = ['/asha', '/admin'];

function isBare(location) {
  if (BARE_EXACT.includes(location)) return true;
  return BARE_PREFIX.some((p) => location === p || location.startsWith(`${p}/`));
}

function AppLayout({ children }) {
  const [location] = useLocation();
  const bare = isBare(location);

  if (bare) return <div className="min-h-screen bg-paper text-ink">{children}</div>;

  return (
    <div className="min-h-screen bg-paper text-ink relative">
      <Header />
      <div className="flex">
        <SideNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <FloatingAssistantMic />
      <BottomNav />
    </div>
  );
}

/**
 * One wrapper for every worker route. The guard is a courtesy — it
 * decides what renders, not what the database will hand over. A
 * citizen who types /asha/referrals gets bounced here, and would get
 * nothing but empty result sets even if they weren't.
 */
function Asha({ component: Component, params }) {
  return (
    <RequireRole role="asha">
      <Component params={params} />
    </RequireRole>
  );
}

/**
 * Admin routes. Separate from Asha() because an admin can promote
 * workers and an ASHA worker cannot — collapsing the two would hand
 * every worker the approval queue.
 */
function Admin({ component: Component, params }) {
  return (
    <RequireRole role="admin">
      <Component params={params} />
    </RequireRole>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <AppLayout>
          <Switch>
            {/* Public */}
            <Route path="/" component={Landing} />
            <Route path="/onboarding" component={Onboarding} />

            {/* Citizen app */}
            <Route path="/app" component={UserHome} />
            <Route path="/assistant" component={Assistant} />
            <Route path="/schemes" component={Schemes} />
            <Route path="/schemes/:id" component={SchemeDetail} />
            <Route path="/care" component={Care} />
            <Route path="/emergency" component={Emergency} />
            <Route path="/emergency-contacts" component={EmergencyContacts} />
            <Route path="/image-assist" component={ImageAssist} />
            <Route path="/benefits" component={Benefits} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/messages" component={Messages} />
            <Route path="/messages/:id" component={Messages} />
            <Route path="/profile" component={Profile} />
            <Route path="/settings" component={Settings} />

            {/* ASHA portal. /asha/login and /asha/register must stay
                outside the guard: signing in would otherwise require
                being signed in, and applying to become a worker would
                require already being one. */}
            <Route path="/asha/login" component={AshaLogin} />
            <Route path="/asha/register" component={AshaRegister} />

            <Route path="/asha">
              <Asha component={AshaDashboard} />
            </Route>
            <Route path="/asha/alerts">
              <Asha component={AshaAlerts} />
            </Route>
            <Route path="/asha/alerts/:id">
              {(params) => <Asha component={AshaAlertDetail} params={params} />}
            </Route>
            <Route path="/asha/referrals">
              <Asha component={AshaReferrals} />
            </Route>
            <Route path="/asha/referrals/:id">
              {(params) => <Asha component={AshaReferralDetail} params={params} />}
            </Route>
            <Route path="/asha/healthcare">
              <Asha component={AshaHealthcare} />
            </Route>
            <Route path="/asha/schemes">
              <Asha component={AshaSchemes} />
            </Route>
            <Route path="/asha/camps">
              <Asha component={AshaCamps} />
            </Route>
            <Route path="/asha/broadcast">
              <Asha component={AshaBroadcast} />
            </Route>
            <Route path="/asha/messages">
              <Asha component={AshaMessages} />
            </Route>
            <Route path="/asha/messages/:id">
              {(params) => <Asha component={AshaMessages} params={params} />}
            </Route>
            <Route path="/asha/profile">
              <Asha component={AshaProfile} />
            </Route>

            {/* Admin */}
            <Route path="/admin/asha-requests">
              <Admin component={AdminAshaRequests} />
            </Route>

            <Route component={UserHome} />
          </Switch>
        </AppLayout>
      </AppStateProvider>
    </AuthProvider>
  );
}
