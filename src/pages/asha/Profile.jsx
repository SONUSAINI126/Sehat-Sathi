import React, { useMemo, useState } from 'react';
import { Phone, LogOut, Check, ShieldCheck, Users, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updateAshaProfile } from '@/services/asha';
import { AshaShell } from '@/components/asha/AshaShell';
import { Btn, Card, Eyebrow, Figure, Pill, Stamp, LoadingState, ErrorState } from '@/components/ds';
import { Detail, formatDate } from '@/components/asha/parts';

/* =============================================================
   /asha/profile — who this account is, and the small set of things
   the worker is allowed to change about it.

   Deliberately NOT editable here: role, asha_code, and the villages
   assigned to her. Those are set by the block office. The database
   refuses a role change from the account holder outright — this page
   simply doesn't pretend otherwise.
   ============================================================= */

const LANGUAGES = ['English', 'Hindi'];

export function AshaProfile() {
  const { user, profile, role, signOut, refreshProfile, demoMode, loading, error: authError } =
    useAuth();
  const hi = (profile?.language ?? 'Hindi') !== 'English';
  const t = (en, dev) => (hi ? dev : en);

  const asha = profile?.asha ?? {};

  const initial = useMemo(
    () => ({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      language: profile?.language ?? 'Hindi',
      district: profile?.district ?? '',
      state: profile?.state ?? '',
      supervisor_name: asha.supervisor_name ?? '',
      supervisor_phone: asha.supervisor_phone ?? '',
      households: asha.households ?? 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile],
  );

  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setErr(null);
    setSaved(false);

    if (!form.full_name.trim()) {
      setErr(t('Your name cannot be empty.', 'नाम खाली नहीं हो सकता।'));
      return;
    }

    setBusy(true);
    try {
      await updateAshaProfile(user?.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        language: form.language,
        district: form.district.trim() || null,
        state: form.state.trim() || null,
        supervisor_name: form.supervisor_name.trim() || null,
        supervisor_phone: form.supervisor_phone.trim() || null,
        households: Number(form.households) || 0,
      });
      await refreshProfile?.();
      setSaved(true);
      setEditing(false);
    } catch (e2) {
      setErr(e2.message || t('Could not save your details.', 'विवरण सेव नहीं हुआ।'));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !profile) {
    return (
      <AshaShell
        eyebrow={t('Register 007 · Account', 'रजिस्टर 007 · खाता')}
        title={t('Your details', 'आपका विवरण')}
      >
        <LoadingState label={t('Loading your account', 'खाता लोड हो रहा है')} rows={2} />
      </AshaShell>
    );
  }

  /* A profile is never legitimately empty — if there is no row after
     loading finished, something is wrong rather than blank. */
  if (!profile) {
    return (
      <AshaShell
        eyebrow={t('Register 007 · Account', 'रजिस्टर 007 · खाता')}
        title={t('Your details', 'आपका विवरण')}
      >
        <ErrorState
          title={t("Couldn't load your account", 'खाता लोड नहीं हुआ')}
          body={
            authError?.message ||
            t(
              'Your worker record could not be read. Sign out and back in; if it keeps happening your block office needs to check the account.',
              'आपका रिकॉर्ड नहीं पढ़ा जा सका। साइन आउट कर फिर साइन इन करें; बार-बार हो तो ब्लॉक कार्यालय से कहें।',
            )
          }
          onRetry={() => refreshProfile?.()}
          retryLabel={t('Try again', 'फिर कोशिश करें')}
        />
      </AshaShell>
    );
  }

  return (
    <AshaShell
      eyebrow={t('Register 007 · Account', 'रजिस्टर 007 · खाता')}
      title={t('Your details', 'आपका विवरण')}
      sub={t(
        'Your name, phone and language. Your ASHA code and the villages you cover are set by the block office.',
        'आपका नाम, फ़ोन और भाषा। आपका ASHA कोड और गाँव ब्लॉक कार्यालय तय करता है।',
      )}
      action={
        !editing ? (
          <Btn variant="asha" onClick={() => { setForm(initial); setEditing(true); }}>
            {t('Edit details', 'विवरण बदलें')}
          </Btn>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* Identity — read only, on purpose */}
          <Card tone="asha" className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Eyebrow>{t('ASHA worker', 'आशा कार्यकर्ता')}</Eyebrow>
                <h2 className="display-md mt-2 text-2xl">
                  {profile?.full_name || t('Name not set', 'नाम दर्ज नहीं')}
                </h2>
                <p className="mt-2 font-mono text-[0.8rem] uppercase tracking-[0.1em] text-ink-faint">
                  {asha.asha_code || t('Code not issued', 'कोड जारी नहीं')}
                  {asha.sub_centre ? ` · ${asha.sub_centre}` : ''}
                </p>
              </div>
              <Stamp
                kind={asha.active === false ? 'none' : 'verified'}
                label={asha.active === false ? t('Inactive', 'निष्क्रिय') : t('Active', 'सक्रिय')}
              />
            </div>

            <div className="mt-7 grid gap-5 border-t border-rule pt-6 sm:grid-cols-2">
              <Detail label={t('Role', 'भूमिका')} value={role === 'admin' ? t('Administrator', 'प्रशासक') : t('ASHA worker', 'आशा कार्यकर्ता')} />
              <Detail label={t('Sub-centre', 'उप-केंद्र')} value={asha.sub_centre} />
              <Detail label={t('Block', 'ब्लॉक')} value={asha.block} />
              <Detail label={t('District', 'ज़िला')} value={profile?.district} />
              <Detail label={t('State', 'राज्य')} value={profile?.state} />
              <Detail
                label={t('Serving since', 'कब से')}
                value={asha.joined_on ? formatDate(asha.joined_on, hi) : null}
              />
            </div>

            {asha.villages?.length ? (
              <div className="mt-6 border-t border-rule pt-6">
                <Eyebrow>{t('Villages you cover', 'आपके गाँव')}</Eyebrow>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {asha.villages.map((v) => (
                    <Pill key={v} tone="asha">
                      {v}
                    </Pill>
                  ))}
                </div>
                <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-faint">
                  {t(
                    'Changed only by your block office. Ask your ANM if this list is wrong.',
                    'यह सूची ब्लॉक कार्यालय बदलता है। गलत हो तो ANM से कहें।',
                  )}
                </p>
              </div>
            ) : null}
          </Card>

          {/* The editable part */}
          <Card className="p-6">
            <Eyebrow>{t('Details you can change', 'जो आप बदल सकती हैं')}</Eyebrow>

            {!editing ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Detail label={t('Name', 'नाम')} value={profile?.full_name} />
                <Detail label={t('Phone', 'फ़ोन')} value={profile?.phone} />
                <Detail label={t('Language', 'भाषा')} value={profile?.language} />
                <Detail label={t('Households', 'परिवार')} value={asha.households ? String(asha.households) : null} />
                <Detail label={t('Supervisor', 'पर्यवेक्षक')} value={asha.supervisor_name} />
                <Detail label={t('Supervisor phone', 'पर्यवेक्षक फ़ोन')} value={asha.supervisor_phone} />
              </div>
            ) : (
              <form onSubmit={save} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label={t('Name', 'नाम')} required>
                    <input value={form.full_name} onChange={set('full_name')} className="field w-full" required />
                  </FormField>

                  <FormField label={t('Phone', 'फ़ोन')}>
                    <input
                      value={form.phone}
                      onChange={set('phone')}
                      type="tel"
                      inputMode="tel"
                      className="field w-full"
                    />
                  </FormField>

                  <FormField
                    label={t('Language', 'भाषा')}
                    hint={t('Changes the language of this portal.', 'इससे पोर्टल की भाषा बदलती है।')}
                  >
                    <select value={form.language} onChange={set('language')} className="field w-full">
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label={t('Households you cover', 'आपके परिवार')}>
                    <input
                      value={form.households}
                      onChange={set('households')}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      className="field w-full"
                    />
                  </FormField>

                  <FormField label={t('District', 'ज़िला')}>
                    <input value={form.district} onChange={set('district')} className="field w-full" />
                  </FormField>

                  <FormField label={t('State', 'राज्य')}>
                    <input value={form.state} onChange={set('state')} className="field w-full" />
                  </FormField>

                  <FormField label={t('Supervisor name', 'पर्यवेक्षक का नाम')}>
                    <input
                      value={form.supervisor_name}
                      onChange={set('supervisor_name')}
                      className="field w-full"
                    />
                  </FormField>

                  <FormField label={t('Supervisor phone', 'पर्यवेक्षक का फ़ोन')}>
                    <input
                      value={form.supervisor_phone}
                      onChange={set('supervisor_phone')}
                      type="tel"
                      inputMode="tel"
                      className="field w-full"
                    />
                  </FormField>
                </div>

                {err ? (
                  <p className="text-sm font-semibold text-siren" role="alert">
                    {err}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5">
                  <Btn type="submit" variant="asha" disabled={busy}>
                    {busy ? t('Saving…', 'सेव हो रहा है…') : t('Save changes', 'बदलाव सेव करें')}
                  </Btn>
                  <Btn
                    type="button"
                    variant="outline"
                    onClick={() => { setEditing(false); setErr(null); setForm(initial); }}
                    disabled={busy}
                  >
                    {t('Cancel', 'रद्द करें')}
                  </Btn>
                </div>
              </form>
            )}

            {saved && !editing ? (
              <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-seal" role="status">
                <Check size={16} aria-hidden="true" />
                {t('Saved.', 'सेव हो गया।')}
              </p>
            ) : null}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <Eyebrow>{t('Your area', 'आपका क्षेत्र')}</Eyebrow>
            <div className="mt-4 space-y-4">
              <Figure
                value={String(asha.households ?? 0)}
                label={t('Households', 'परिवार')}
                tone="asha"
                hint={<span className="flex items-center gap-1.5"><Home size={12} aria-hidden="true" />{t('On your register', 'आपके रजिस्टर में')}</span>}
              />
              <Figure
                value={String(asha.villages?.length ?? 0)}
                label={t('Villages', 'गाँव')}
                tone="neutral"
                hint={<span className="flex items-center gap-1.5"><Users size={12} aria-hidden="true" />{t('Assigned by the block', 'ब्लॉक द्वारा')}</span>}
              />
            </div>
          </Card>

          {asha.supervisor_phone ? (
            <Card tone="seal" className="p-5">
              <Eyebrow>{t('Your supervisor', 'आपका पर्यवेक्षक')}</Eyebrow>
              <p className="mt-2 text-[0.95rem] font-semibold text-ink">
                {asha.supervisor_name || t('ANM', 'ANM')}
              </p>
              <Btn
                as="a"
                href={`tel:${String(asha.supervisor_phone).replace(/[^\d+]/g, '')}`}
                variant="primary"
                className="mt-4 w-full"
              >
                <Phone size={17} aria-hidden="true" />
                {asha.supervisor_phone}
              </Btn>
            </Card>
          ) : null}

          {/* Says out loud what the database enforces. */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="shrink-0 text-seal" aria-hidden="true" />
              <Eyebrow>{t('Account security', 'खाता सुरक्षा')}</Eyebrow>
            </div>
            <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-soft">
              {t(
                'Your role cannot be changed from this page, or from any page. Only the block administrator can change it, and every change is recorded.',
                'आपकी भूमिका इस या किसी भी पन्ने से नहीं बदली जा सकती। केवल ब्लॉक प्रशासक बदल सकता है, और हर बदलाव दर्ज होता है।',
              )}
            </p>
            <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-faint">
              {t('Signed in as ', 'साइन इन: ')}
              <span className="font-mono">{user?.email || profile?.id}</span>
            </p>
          </Card>

          {demoMode ? (
            <Card tone="amber" className="p-5">
              <Stamp kind="none" label={t('Sample data', 'नमूना डेटा')} />
              <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-soft">
                {t(
                  'You are looking at sample data. Nothing you change here is saved anywhere.',
                  'आप नमूना डेटा देख रही हैं। यहाँ किया कोई बदलाव सेव नहीं होता।',
                )}
              </p>
            </Card>
          ) : null}

          <Btn variant="outline" className="w-full" onClick={() => signOut?.()}>
            <LogOut size={16} aria-hidden="true" />
            {t('Sign out', 'साइन आउट')}
          </Btn>
        </aside>
      </div>
    </AshaShell>
  );
}

function FormField({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="eyebrow">
        {label}
        {required ? <span className="ml-1 text-siren">*</span> : null}
      </span>
      <div className="mt-2">{children}</div>
      {hint ? (
        <span className="mt-2 block text-[0.8rem] leading-snug text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}
