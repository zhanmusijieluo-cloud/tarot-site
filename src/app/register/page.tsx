'use client';

import PageShell from '@/components/PageShell';
import LoginPanel from '@/components/LoginPanel';
import { useI18n } from '@/i18n';

export default function RegisterPage() {
  const { t } = useI18n();
  return (
    <PageShell label="ACCOUNT" title={t('nav.register')}>
      <LoginPanel initialMode="up" />
    </PageShell>
  );
}
