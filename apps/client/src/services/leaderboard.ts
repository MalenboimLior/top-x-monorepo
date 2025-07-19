// apps/client/src/services/leaderboard.ts
import axios from 'axios';
import { LeaderboardEntry } from '@top-x/shared/types/game';

export async function getTopLeaderboard(
  gameId: string = 'smartest_on_x',
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  try {
    const response = await axios.get('/getTopLeaderboard', {
      params: { gameId, limit }
    });
    console.log('getTopLeaderboard response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching top leaderboard:', error);
    throw error;
  }
}

export async function getAroundLeaderboard(
  gameId: string = 'smartest_on_x',
  uid: string
): Promise<LeaderboardEntry[]> {
  try {
    const response = await axios.get('/getAroundLeaderboard', {
      params: { gameId, uid }
    });
    console.log('getAroundLeaderboard response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching around leaderboard:', error);
    throw error;
  }
}

export async function getFriendsLeaderboard(
  gameId: string = 'smartest_on_x',
  uid: string
): Promise<LeaderboardEntry[]> {
  try {
    const response = await axios.get('/getFriendsLeaderboard', {
      params: { gameId, uid }
    });
    console.log('getFriendsLeaderboard response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching friends leaderboard:', error);
    throw error;
  }
}

export async function getPercentileRank(
  gameId: string = 'smartest_on_x',
  uid: string
): Promise<{ percentile: number; usersTopped: number }> {
  try {
    const response = await axios.get('/getPercentileRank', {
      params: { gameId, uid }
    });
    console.log('getPercentileRank response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching percentile rank:', error);
    throw error;
  }
}

export async function getVipLeaderboard(
  gameId: string = 'smartest_on_x'
): Promise<LeaderboardEntry[]> {
  try {
    const response = await axios.get('/getVipLeaderboard', {
      params: { gameId }
    });
    console.log('getVipLeaderboard response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching VIP leaderboard:', error);
    throw error;
  }
}