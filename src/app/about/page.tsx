'use client';

import PageShell from '@/components/PageShell';
import AboutSection from '@/components/AboutSection';
import { useI18n } from '@/i18n';

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <PageShell
      label={t('page.about.label')}
      title={t('page.about.title')}
      subtitle={t('page.about.subtitle')}
    >
      <AboutSection />
    </PageShell>
  );
}
