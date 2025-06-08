const FUNCTION_BASE_URL = 'u6yhyetroa-uc.a.run.app';


interface LeaderboardEntry {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  score: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  console.log('Fetching:', url);
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json() as T;
    return data;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

export async function getTopLeaderboard(
  gameId: string = 'trivia',
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const url = `https://gettopleaderboard-${FUNCTION_BASE_URL}?gameId=${gameId}&limit=${limit}`;
  const data = await fetchJson<LeaderboardEntry[]>(url);
  console.log('getTopLeaderboard response:', data);
  return data;
}

export async function getAroundLeaderboard(
  gameId: string = 'trivia',
  uid: string
): Promise<LeaderboardEntry[]> {
  const url = `https://getaroundleaderboard-${FUNCTION_BASE_URL}?gameId=${gameId}&uid=${uid}`;
  const data = await fetchJson<LeaderboardEntry[]>(url);
  console.log('getAroundLeaderboard response:', data);
  return data;
}

export async function getFriendsLeaderboard(
  gameId: string = 'trivia',
  uid: string
): Promise<LeaderboardEntry[]> {
  const url = `https://getfriendsleaderboard-${FUNCTION_BASE_URL}?gameId=${gameId}&uid=${uid}`;
  const data = await fetchJson<LeaderboardEntry[]>(url);
  console.log('getFriendsLeaderboard response:', data);
  return data;
}

export async function getPercentileRank(
  gameId: string = 'trivia',
  uid: string
): Promise<{ percentile: number, usersTopped: number }> {
  const url = `https://getpercentilerank-${FUNCTION_BASE_URL}?gameId=${gameId}&uid=${uid}`;
  const data = await fetchJson<{ percentile: number, usersTopped: number }>(url);
  console.log('getPercentileRank response:', data);
  return data;
}

export async function getVipLeaderboard(
  gameId: string = 'trivia'
): Promise<LeaderboardEntry[]> {
  const url = `https://getvipleaderboard-${FUNCTION_BASE_URL}?gameId=${gameId}`;
  const data = await fetchJson<LeaderboardEntry[]>(url);
  console.log('getVipLeaderboard response:', data);
  return data;
}