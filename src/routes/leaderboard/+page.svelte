<script>
  import { onMount } from 'svelte';
  import { db } from '$lib/database/index.js';
  import { formatAddress, formatEther, formatTimeAgo } from '$lib/database/index.js';
  import MetaTags from '$lib/components/MetaTags.svelte';
  import UserDisplay from '$lib/components/UserDisplay.svelte';

  let topPlayers = [];
  let recentShots = [];
  let userProfiles = new Map();
  let loading = true;
  let error = null;

  onMount(async () => {
    try {
      // Fetch top players and recent shots in parallel
      const [playersData, shotsData] = await Promise.all([
        db.getTopPlayers(50, 'total_shots'),
        db.getRecentShots(10)
      ]);
      
      topPlayers = playersData;
      recentShots = shotsData;
      
      // Collect all unique addresses from both players and shots
      const allAddresses = new Set();
      topPlayers.forEach(player => allAddresses.add(player.address));
      recentShots.forEach(shot => allAddresses.add(shot.player_address));
      
      // Fetch user profiles for all addresses
      if (allAddresses.size > 0) {
        const profiles = await db.getUserProfiles(Array.from(allAddresses));
        
        // Create a map for quick profile lookup
        userProfiles = new Map();
        profiles.forEach(profile => {
          userProfiles.set(profile.wallet_address.toLowerCase(), profile);
        });
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      error = 'Failed to load leaderboard data';
    } finally {
      loading = false;
    }
  });

  // Get profile for a player
  function getPlayerProfile(address) {
    return userProfiles.get(address.toLowerCase()) || null;
  }

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };
</script>

<MetaTags
  title="Leaderboard - ETH Shot Top Players & Winners"
  description="View the top players and winners in ETH Shot. See who's taken the most shots and won the biggest jackpots! Compete for the top spot on the leaderboard."
  keywords="ethereum, eth, jackpot, leaderboard, top players, winners, rankings, competition"
  type="website"
/>

<div class="max-w-4xl mx-auto space-y-8">
  <!-- Header -->
  <div class="text-center space-y-4">
    <h1 class="text-4xl md:text-6xl font-black bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
      🏆 Leaderboard
    </h1>
    <p class="text-xl text-gray-300 max-w-2xl mx-auto">
      The top players who've taken the most shots at the ETH jackpot
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>
  {:else if error}
    <div class="text-center py-12">
      <p class="text-red-400 text-lg">{error}</p>
      <button 
        class="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
        on:click={() => window.location.reload()}
      >
        Try Again
      </button>
    </div>
  {:else if topPlayers.length === 0}
    <div class="text-center py-12">
      <img src="/logo.svg" alt="ETH Shot" class="w-16 h-16 mx-auto mb-4" />
      <h3 class="text-2xl font-bold text-gray-300 mb-2">No Players Yet</h3>
      <p class="text-gray-400">Be the first to take a shot and claim the top spot!</p>
      <a href="/" class="inline-block mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors">
        Take Your Shot
      </a>
    </div>
  {:else}
    <!-- Leaderboard Table -->
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-900/50">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Rank</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Player</th>
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Shots</th>
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Spent</th>
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Total Won</th>
              <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Win Rate</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {#each topPlayers as player, index}
              <tr class="hover:bg-gray-700/30 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center space-x-2">
                    <span class="text-2xl {getRankColor(index + 1)}">
                      {getRankIcon(index + 1)}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <UserDisplay
                    walletAddress={player.address}
                    profile={getPlayerProfile(player.address)}
                    size="sm"
                    showAddress={true}
                  />
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="font-bold text-white">
                    {player.total_shots || 0}
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="font-mono text-gray-300">
                    {formatEther(player.total_spent || '0')} ETH
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="font-mono text-green-400">
                    {formatEther(player.total_won || '0')} ETH
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="text-sm text-gray-400">
                    {player.total_shots > 0 ? ((parseFloat(player.total_won || '0') > 0 ? 1 : 0) / player.total_shots * 100).toFixed(1) : '0.0'}%
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent Shots Section -->
    <div class="space-y-6">
      <div class="text-center space-y-2">
        <h2 class="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          🎯 Last 10 Shots
        </h2>
        <p class="text-lg text-gray-300">
          The most recent shots taken at the ETH jackpot
        </p>
      </div>

      {#if recentShots.length === 0}
        <div class="text-center py-8">
          <div class="text-gray-400 text-lg">No recent shots yet</div>
          <p class="text-gray-500 mt-2">Be the first to take a shot!</p>
        </div>
      {:else}
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-900/50">
                <tr>
                  <th class="px-6 py-4 text-left text-sm font-semibold text-gray-300">Player</th>
                  <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Amount</th>
                  <th class="px-6 py-4 text-center text-sm font-semibold text-gray-300">Result</th>
                  <th class="px-6 py-4 text-right text-sm font-semibold text-gray-300">Time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                {#each recentShots as shot}
                  <tr class="hover:bg-gray-700/30 transition-colors">
                    <td class="px-6 py-4">
                      <UserDisplay
                        walletAddress={shot.player_address}
                        profile={getPlayerProfile(shot.player_address)}
                        size="sm"
                        showAddress={true}
                      />
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="font-mono text-white">
                        {formatEther(shot.amount)} ETH
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      {#if shot.won}
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                          🏆 Won
                        </span>
                      {:else}
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900/50 text-gray-400 border border-gray-600">
                          💥 Miss
                        </span>
                      {/if}
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="text-sm text-gray-400">
                        {formatTimeAgo(shot.timestamp)}
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>

    <!-- Back to Game -->
    <div class="text-center">
      <a
        href="/"
        class="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold"
      >
        <img src="/logo.svg" alt="ETH Shot" class="w-4 h-4" />
        <span>Back to Game</span>
      </a>
    </div>
  {/if}
</div>