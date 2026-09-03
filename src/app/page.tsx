'use client';

import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ClosingSection from '@/components/ClosingSection';
import HomeCoreFeatures from '@/components/HomeCoreFeatures';

export default function Home() {
  return (
    <main className="relative w-full">
      <Navbar />
      <Hero />
      <HomeCoreFeatures />
      <ClosingSection />
    </main>
  );
}
