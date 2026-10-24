export interface StreakStanding {
  current: number;
  longest: number;
  activeToday: boolean;
}

const days = (count: number): string =>
  `${count} ${count === 1 ? "day" : "days"}`;

export const streakHeadline = ({ current }: StreakStanding): string =>
  current === 0 ? "No streak yet" : `${days(current)} in a row`;

export const streakNudge = ({
  current,
  longest,
  activeToday,
}: StreakStanding): string => {
  if (current === 0) {
    return longest === 0
      ? "Solve a challenge or start an interview to begin one."
      : `Your longest was ${days(longest)}. Practise today to start another.`;
  }

  if (!activeToday) {
    return `Practise today to keep it going${
      longest > current ? `. Your longest is ${days(longest)}` : ""
    }.`;
  }

  return longest > current
    ? `Done for today. Your longest is ${days(longest)}.`
    : "Done for today, and your longest yet.";
};

export const progressPercent = (value: number, target: number): number =>
  target <= 0 ? 0 : Math.min(100, Math.round((value / target) * 100));
