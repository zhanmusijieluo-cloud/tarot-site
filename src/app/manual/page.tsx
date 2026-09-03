'use client';

import PageShell from '@/components/PageShell';
import ManualSection from '@/components/ManualSection';
import { useI18n } from '@/i18n';

export default function ManualPage() {
  const { t } = useI18n();
  return (
    <PageShell
      label={t('page.manual.label')}
      title={t('page.manual.title')}
      subtitle={t('page.manual.subtitle')}
    >
      <ManualSection />
    </PageShell>
  );
}
