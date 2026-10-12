import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ListeningArenaContainer } from './ListeningArenaContainer';
import { ListeningLoadingView } from '@/components/common/LoadingStates';

export const metadata: Metadata = {
  title: 'Luyện Nghe Phản Xạ Theo Cấp Độ (Listening Reflex Arena) – English Reflex',
  description: 'Luyện nghe phản xạ phân cấp A1-A2, B1, B2, C1 với Audio Echo, bắt từ khóa, tăng tốc độ và môi trường âm thanh thực tế.',
};

export default function ListeningPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_60%)] p-4 pt-10">
      <Suspense fallback={<ListeningLoadingView />}>
        <ListeningArenaContainer />
      </Suspense>
    </main>
  );
}
