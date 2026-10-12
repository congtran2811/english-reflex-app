import type { Metadata } from 'next';
import { RoleplayArena } from '@/components/practice/RoleplayArena';

export const metadata: Metadata = {
  title: 'Real-time AI Role-play Debate – English Reflex',
  description: 'Tranh biện và đối thoại giả lập thời gian thực với AI bằng giọng nói tiếng Anh.',
};

export default function RoleplayPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)] p-4">
      <RoleplayArena />
    </main>
  );
}
