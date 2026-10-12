'use client';

import Link from 'next/link';
import type { BatchEvaluationResponse } from '@/types/evaluation';
import type { CompletedTurn } from '@/types/practice';
import { ScoreCard } from './ScoreCard';
import { ReviewList } from './ReviewList';
import { Button, buttonVariants } from '@/components/common/Button';
import { RefreshCcw, LayoutGrid } from 'lucide-react';

export function ResultSummary({
  evaluation,
  turns,
  onRetry,
}: {
  evaluation: BatchEvaluationResponse;
  turns: CompletedTurn[];
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-12 animate-[fadeUp_0.3s_ease-out]">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          Hoàn thành phiên luyện tập! 🎉
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Dưới đây là bảng phân tích chi tiết phản xạ và thành tích của bạn.
        </p>
      </div>

      <ScoreCard evaluation={evaluation} turns={turns} />
      
      <ReviewList evaluation={evaluation} turns={turns} />

      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <Button onClick={onRetry} className="px-8 py-3">
          <RefreshCcw className="h-4 w-4" /> Luyện tập lại lượt này
        </Button>
        <Link href="/practice" className={buttonVariants('secondary', 'px-8 py-3')}>
          <LayoutGrid className="h-4 w-4" /> Đổi cấp độ khác
        </Link>
        <Link href="/" className={buttonVariants('ghost', 'px-6 py-3 text-slate-400 hover:text-white')}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
