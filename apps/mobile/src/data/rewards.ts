import { DictionaryKey } from "../i18n";
import { ScoreEntry } from "./types";

export type RewardDefinition = {
  id: "perfect_score" | "clear_win" | "close_call" | "photo_finish";
  titleKey: DictionaryKey;
  descriptionKey: DictionaryKey;
  emoji: string;
};

export const rewardDefinitions: RewardDefinition[] = [
  {
    id: "perfect_score",
    titleKey: "rewardPerfectTitle",
    descriptionKey: "rewardPerfectBody",
    emoji: "✨"
  },
  {
    id: "clear_win",
    titleKey: "rewardClearTitle",
    descriptionKey: "rewardClearBody",
    emoji: "🏁"
  },
  {
    id: "close_call",
    titleKey: "rewardCloseTitle",
    descriptionKey: "rewardCloseBody",
    emoji: "🌙"
  },
  {
    id: "photo_finish",
    titleKey: "rewardTieTitle",
    descriptionKey: "rewardTieBody",
    emoji: "🤝"
  }
];

const rewardById: Record<RewardDefinition["id"], RewardDefinition> = {
  perfect_score: rewardDefinitions[0],
  clear_win: rewardDefinitions[1],
  close_call: rewardDefinitions[2],
  photo_finish: rewardDefinitions[3]
};

export function getRewardForResults({
  scores,
  total,
  userId
}: {
  scores: ScoreEntry[];
  total: number;
  userId?: number;
}): RewardDefinition | null {
  if (!userId || scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const myScore = scores.find((entry) => entry.userId === userId)?.score ?? null;
  const topScore = sorted[0]?.score ?? null;
  if (myScore === null || topScore === null) return null;

  if (myScore === total) {
    return rewardById.perfect_score;
  }

  const topCount = sorted.filter((entry) => entry.score === topScore).length;
  if (myScore === topScore && topCount > 1) {
    return rewardById.photo_finish;
  }
  if (myScore === topScore) {
    const runnerUpScore = sorted[1]?.score ?? Math.max(0, topScore - 1);
    const margin = myScore - runnerUpScore;
    return margin >= 2 ? rewardById.clear_win : rewardById.close_call;
  }

  return null;
}
