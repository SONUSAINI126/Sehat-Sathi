import React from 'react';
import { Link } from 'wouter';
import { ArrowRight, Phone, MapPin, Plus, Siren } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/useAsync';
import { getDashboard, updateAlert, severityMeta } from '@/services/asha';
import { AshaShell } from '@/components/asha/AshaShell';
import {
  Btn,
  Card,
  Figure,
  Eyebrow,
  Stamp,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ds';
import { SeverityBadge, AlertStatusBadge, relativeTime } from '@/components/asha/parts';

/* =============================================================
   /asha — Today.

   One question this page answers: who needs me, and in what order.
   Everything else is secondary and placed below the fold.
   ============================================================= */

export function AshaDashboard() {
  const { profile, user } = useAuth();
  const hi = (profile?.language ?? 'Hindi') !== 'English';
  const t = (en, dev) => (hi ? dev : en);
  const ashaId = user?.id;

  const {
    data,
    error,
    loading: fetching,
    reload,
    setData,
  } = useAsync(() => getDashboard(ashaId), [ashaId], { skip: !ashaId });

  // RequireRole only renders this once there is a signed-in worker, so
  // a missing id means auth is still resolving — that is loading, not
  // an empty register.
  const loading = fetching || !ashaId;

  async function acknowledge(alertId) {
    // Optimistic: a worker on a weak signal should see the tap land.
    setData((prev) =>
      prev
        ? {
            ...prev,
            queue: prev.queue.map((a) =>
              a.id === alertId ? { ...a, status: 'acknowledged' } : a,
            ),
          }
        : prev,
    );
    try {
      await updateAlert(alertId, { status: 'acknowledged' });
    } catch {
      reload();
    }
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('Good morning', 'सुप्रभात');
    if (h < 17) return t('Good afternoon', 'नमस्ते');
    return t('Good evening', 'शुभ संध्या');
  })();

  const firstName = (profile?.full_name || '').split(' ')[0];

  return (
    <AshaShell
      eyebrow={t('Register 001 · Today', 'रजिस्टर 001 · आज')}
      title={firstName ? `${greeting}, ${firstName}` : greeting}
      sub={t(
        'Sorted by how urgent it is, then by how long it has been waiting.',
        'पहले सबसे ज़रूरी, फिर सबसे पुराना।',
      )}
     action={
  <div className="flex flex-wrap gap-2">
    <Btn as={Link} href="/asha/referrals?new=1" variant="asha">
      <Plus size={17} aria-hidden="true" />
      {t('New referral', 'नया रेफरल')}
    </Btn>

    <Btn as={Link} href="/asha/broadcast" variant="outline">
      🔔 {t('Send update', 'सूचना भेजें')}
    </Btn>
  </div>
}
    >
      {loading ? (
        <LoadingState label={t('Loading your day', 'आपका दिन लोड हो रहा है')} rows={4} />
      ) : error ? (
        <ErrorState
          title={t("Couldn't load your dashboard", 'डैशबोर्ड लोड नहीं हुआ')}
          body={t(
            'The connection dropped before your alerts arrived. Nothing has been lost — try again.',
            'कनेक्शन टूट गया। कुछ खोया नहीं है — फिर कोशिश करें।',
          )}
          onRetry={reload}
          retryLabel={t('Try again', 'फिर कोशिश करें')}
        />
      ) : (
        <>
          {/* Counts. Urgent first and in siren red — it is the only
              number that changes what you do in the next hour. */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Figure
              value={data.counts.urgent}
              label={t('Needs you now', 'तुरंत ज़रूरी')}
              tone={data.counts.urgent > 0 ? 'siren' : 'neutral'}
              hint={t('Critical or high', 'अति गंभीर या गंभीर')}
            />
            <Figure
              value={data.counts.openAlerts}
              label={t('Open alerts', 'खुली सूचनाएँ')}
              tone="amber"
            />
            <Figure
              value={data.counts.openReferrals}
              label={t('Referrals in hand', 'चालू रेफरल')}
              tone="asha"
            />
            <Figure
              value={data.counts.households}
              label={t('Households', 'परिवार')}
              tone="seal"
              hint={profile?.asha?.sub_centre || undefined}
            />
          </div>

          {/* The queue */}
          <section className="mt-12">
            <div className="reg-rule" />
            <div className="flex flex-wrap items-end justify-between gap-4 pt-5">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="reg-index">002</span>
                  <Eyebrow>{t('Your queue', 'आपकी सूची')}</Eyebrow>
                </div>
                <h2 className="display-md mt-3 text-2xl sm:text-3xl">
                  {t('Who needs you', 'किसे आपकी ज़रूरत है')}
                </h2>
              </div>
              <Btn as={Link} href="/asha/alerts" variant="outline">
                {t('All alerts', 'सभी सूचनाएँ')}
                <ArrowRight size={16} aria-hidden="true" />
              </Btn>
            </div>

            <div className="mt-6 space-y-3">
              {data.queue.length === 0 ? (
                <EmptyState
                  title={t('Nothing waiting', 'कुछ बाकी नहीं')}
                  body={t(
                    'Every alert assigned to you has been acknowledged or closed. New ones will appear here.',
                    'आपकी सभी सूचनाएँ देखी या बंद हो चुकी हैं। नई यहाँ दिखेंगी।',
                  )}
                />
              ) : (
                data.queue
                  .slice(0, 6)
                  .map((alert) => (
                    <QueueRow key={alert.id} alert={alert} hi={hi} onAcknowledge={acknowledge} />
                  ))
              )}
            </div>
          </section>

          {/* Referral status spread */}
          <section className="mt-14">
            <div className="reg-rule" />
            <div className="flex items-baseline gap-3 pt-5">
              <span className="reg-index">003</span>
              <Eyebrow>{t('Referral register', 'रेफरल रजिस्टर')}</Eyebrow>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.byStatus.map((s) => (
                <Link
                  key={s.value}
                  href={`/asha/referrals?status=${s.value}`}
                  className="block focus-visible:outline-none"
                >
                  <Card tone={s.tone} lift className="p-4">
                    <Eyebrow>{hi ? s.label_hi : s.label}</Eyebrow>
                    <p className="figure mt-2 text-3xl">{s.count}</p>
                    <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-faint">{s.help}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* Emergency reminder. Not a design flourish — the brief
              requires 108 to be reachable from anywhere. */}
          <section className="mt-14">
            <Card tone="siren" className="flex flex-wrap items-center justify-between gap-5 p-6">
              <div className="min-w-0">
                <Stamp kind="urgent" label="Emergency" />
                <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft">
                  {t(
                    'For anything life-threatening, call 108 first and record the referral afterwards. Do not wait for this app.',
                    'जान का खतरा हो तो पहले 108 पर कॉल करें, रेफरल बाद में दर्ज करें। ऐप का इंतज़ार न करें।',
                  )}
                </p>
              </div>
              <Btn as="a" href="tel:108" variant="siren" size="lg">
                <Siren size={19} aria-hidden="true" />
                {t('Call 108', '108 पर कॉल करें')}
              </Btn>
            </Card>
          </section>
        </>
      )}
    </AshaShell>
  );
}

function QueueRow({ alert, hi, onAcknowledge }) {
  const t = (en, dev) => (hi ? dev : en);
  const meta = severityMeta(alert.severity);
  const urgent = alert.severity === 'critical' || alert.severity === 'high';

  return (
    <Card tone={meta.tone} lift className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} hi={hi} />
            <AlertStatusBadge status={alert.status} hi={hi} />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-faint">
              {relativeTime(alert.created_at, hi)}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">{alert.title}</h3>

          {alert.body ? (
            <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-ink-soft">
              {alert.body}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.85rem] text-ink-faint">
            <span className="font-semibold text-ink-soft">{alert.citizen_name || '—'}</span>
            {alert.village ? (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" />
                {alert.village}
              </span>
            ) : null}
            {alert.citizen_phone ? (
              <a
                href={`tel:${alert.citizen_phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-1.5 font-semibold text-seal hover:underline"
              >
                <Phone size={13} aria-hidden="true" />
                {alert.citizen_phone}
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {alert.status === 'new' ? (
            <Btn
              variant={urgent ? 'siren' : 'outline'}
              onClick={() => onAcknowledge(alert.id)}
            >
              {t('Acknowledge', 'देख लिया')}
            </Btn>
          ) : null}
          <Btn as={Link} href={`/asha/alerts/${alert.id}`} variant="outline">
            {t('Open', 'खोलें')}
            <ArrowRight size={15} aria-hidden="true" />
          </Btn>
        </div>
      </div>
    </Card>
  );
}
