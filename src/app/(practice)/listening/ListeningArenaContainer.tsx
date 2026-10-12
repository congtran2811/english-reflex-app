'use client';

import { useSearchParams } from 'next/navigation';
import { ListeningArena } from '@/components/practice/ListeningArena';
import { ListeningLoadingView } from '@/components/common/LoadingStates';

export function ListeningArenaContainer() {
  const searchParams = useSearchParams();
  const queryLevel = searchParams.get('level')?.toUpperCase().replace('-', '_');
  const validLevel = queryLevel && ['A1_A2', 'B1', 'B2', 'C1'].includes(queryLevel) ? queryLevel : 'B1';

  return <ListeningArena initialLevel={validLevel} />;
}
