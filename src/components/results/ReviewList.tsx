import type { BatchEvaluationResponse } from '@/types/evaluation';
import type { CompletedTurn } from '@/types/practice';
import { SentenceReview } from './SentenceReview';

export function ReviewList({
  evaluation,
  turns,
}: {
  evaluation: BatchEvaluationResponse;
  turns: CompletedTurn[];
}) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {evaluation.results.map((result) => {
        const turn = turns.find((t) => String(t.promptId) === String(result.id));
        if (!turn) return null;
        return <SentenceReview key={result.id} result={result} turn={turn} />;
      })}
    </div>
  );
}
