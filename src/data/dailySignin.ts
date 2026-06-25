// 7-day rotating sign-in track
export const DAILY_SIGNIN = [
  { day: 1, label: '100 Gold', rewards: { gold: 100 } },
  { day: 2, label: '20 Gems', rewards: { gems: 20 } },
  { day: 3, label: '200 Gold', rewards: { gold: 200 } },
  { day: 4, label: '5 Friend Pts', rewards: { friendPoints: 5 } },
  { day: 5, label: '50 Gems', rewards: { gems: 50 } },
  { day: 6, label: '500 Gold', rewards: { gold: 500 } },
  { day: 7, label: '100 Gems', rewards: { gems: 100 } },
] as const;

export type SigninReward = typeof DAILY_SIGNIN[number];
