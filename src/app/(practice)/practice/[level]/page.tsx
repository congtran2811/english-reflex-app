import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PracticeArena } from '@/components/practice/PracticeArena';
import { DIFFICULTY_LEVELS, isDifficultyLevel } from '@/types/practice';

interface Props {
  params: Promise<{ level: string }>;
}

export function generateStaticParams() {
  return DIFFICULTY_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level } = await params;
  return { title: `Practice ${level.replace('_', '–')} – English Reflex` };
}

export default async function PracticeLevelPage({ params }: Props) {
  const { level } = await params;
  if (!isDifficultyLevel(level)) notFound();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)] px-2.5 py-4 sm:px-4 sm:py-12 w-full min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center">
        <PracticeArena level={level} />
      </div>
    </main>
  );
}
