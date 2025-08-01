/**
 * Game Utility Functions
 * 
 * Common utility functions used across the game store modules
 */

import { GAME_CONFIG, calculateUSDValue } from '../../config.js';

/**
 * Safely convert BigInt to number, handling edge cases
 * @param {BigInt|number|string} value - Value to convert
 * @returns {number} Converted number
 */
export const safeBigIntToNumber = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  if (typeof value === 'bigint') {
    // Check if BigInt is within safe integer range
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
      console.warn('BigInt value exceeds safe integer range, converting to string:', value.toString());
      return parseFloat(value.toString());
    }
    return Number(value);
  }
  
  // For other types, try to convert to string first
  try {
    const stringValue = String(value);
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.warn('Failed to convert value to number:', value, error);
    return 0;
  }
};

/**
 * ETH Shot contract ABI (for backward compatibility with ETH-only mode)
 */
export const ETH_SHOT_ABI = [
  // Game functions
  'function commitShot(bytes32 commitment) external payable',
  'function revealShot(uint256 secret) external',
  'function sponsorRound(string calldata name, string calldata logoUrl) external payable',
  'function getCurrentPot() external view returns (uint256)',
  'function getContractBalance() external view returns (uint256)',
  'function getHouseFunds() external view returns (uint256)',
  'function getPlayerStats(address player) external view returns (tuple(uint256 totalShots, uint256 totalSpent, uint256 totalWon, uint256 lastShotTime))',
  'function canCommitShot(address player) external view returns (bool)',
  'function canRevealShot(address player) external view returns (bool)',
  'function hasPendingShot(address player) external view returns (bool)',
  'function getPendingShot(address player) external view returns (bool exists, uint256 blockNumber, uint256 amount)',
  'function getPendingPayout(address player) external view returns (uint256)',
  'function getCooldownRemaining(address player) external view returns (uint256)',
  'function claimPayout() external',
  'function cleanupExpiredPendingShot(address player) external',
  'function getCurrentSponsor() external view returns (tuple(address sponsor, string name, string logoUrl, uint256 timestamp, bool active))',
  'function getRecentWinners() external view returns (tuple(address winner, uint256 amount, uint256 timestamp, uint256 blockNumber)[])',
  'function SHOT_COST() external view returns (uint256)',
  'function SPONSOR_COST() external view returns (uint256)',
  
  // Admin functions (Ownable)
  'function owner() external view returns (address)',
  'function transferOwnership(address newOwner) external',
  'function renounceOwnership() external',
  
  // Test mode functions
  'function setTestMode(bool enabled) external',
  'function setTestFiftyPercentMode(bool enabled) external',
  'function setWinningNumber(uint256 number) external',
  'function getTestModeConfig() external view returns (tuple(bool isTestMode, bool isFiftyPercentMode, uint256 currentChainId))',
  
  // House funds management
  'function withdrawHouseFunds() external',
  
  // Events
  'event ShotTaken(address indexed player, uint256 amount, bool won)',
  'event JackpotWon(address indexed winner, uint256 amount, uint256 timestamp)',
  'event SponsorshipActivated(address indexed sponsor, string name, string logoUrl)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
];

/**
 * Helper function to create provider with retry logic (ETH-only mode)
 * @param {Object} ethers - Ethers library instance
 * @param {Object} networkConfig - Network configuration
 * @param {Function} retryWithBackoff - Retry function
 * @returns {Promise<Object>} Provider instance
 */
export const createProviderWithRetry = async (ethers, networkConfig, retryWithBackoff) => {
  return await retryWithBackoff(async () => {
    const provider = new ethers.JsonRpcProvider(networkConfig.RPC_URL);
    // Test the provider with a simple call
    await provider.getNetwork();
    console.log(`Successfully connected to RPC: ${networkConfig.RPC_URL}`);
    return provider;
  }, 3, 2000);
};

/**
 * Helper function to update USD values for game state
 * @param {Object} state - Current game state
 * @returns {Promise<Object>} Updated state with USD values
 */
export const updateUSDValues = async (state) => {
  try {
    const [potUSD, shotUSD, sponsorUSD] = await Promise.all([
      calculateUSDValue(state.currentPot),
      calculateUSDValue(state.shotCost),
      calculateUSDValue(state.sponsorCost)
    ]);

    return {
      ...state,
      currentPotUSD: potUSD,
      shotCostUSD: shotUSD,
      sponsorCostUSD: sponsorUSD
    };
  } catch (error) {
    console.warn('Failed to update USD values:', error);
    return state;
  }
};

/**
 * Format time remaining in human-readable format
 * @param {number} seconds - Seconds remaining
 * @returns {string} Formatted time string
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Check for pot milestones and notify if crossed
 * @param {string} previousPot - Previous pot amount
 * @param {string} newPotAmount - New pot amount
 * @param {Function} notifyPotMilestone - Notification function
 */
export const checkPotMilestones = (previousPot, newPotAmount, notifyPotMilestone) => {
  if (!previousPot || newPotAmount === previousPot) return;
  
  const prevValue = parseFloat(previousPot);
  const newValue = parseFloat(newPotAmount);
  
  // Check if we crossed a milestone
  const milestones = [1, 5, 10, 25, 50, 100];
  for (const milestone of milestones) {
    if (prevValue < milestone && newValue >= milestone) {
      notifyPotMilestone(`${milestone} ETH`);
      console.log(`🚀 Pot milestone reached: ${milestone} ETH`);
      break;
    }
  }
};

/**
 * Validate contract deployment status
 * @param {string} contractAddress - Contract address to validate
 * @returns {Object} Validation result
 */
export const validateContractDeployment = (contractAddress) => {
  if (!contractAddress || contractAddress === '0x1234567890123456789012345678901234567890') {
    return {
      isValid: false,
      error: 'Smart contract not deployed yet. Please deploy the contract first.'
    };
  }
  
  return { isValid: true };
};

/**
 * Create initial game state
 * @returns {Object} Initial game state
 */
export const createInitialGameState = () => ({
  // Contract/Program info
  contractAddress: '',
  contract: null,
  contractDeployed: null, // null = unknown, true = deployed, false = not deployed

  // Game state
  currentPot: '0',
  currentPotUSD: '0', // USD value of current pot
  shotCost: '0',
  shotCostUSD: '0', // USD value of shot cost
  sponsorCost: '0',
  sponsorCostUSD: '0', // USD value of sponsor cost
  
  // Player state
  playerStats: null,
  canShoot: false,
  cooldownRemaining: 0,
  
  // Sponsor info
  currentSponsor: null,
  
  // Leaderboard and winners
  recentWinners: [],
  topPlayers: [],
  
  // UI state
  loading: false,
  takingShot: false,
  error: null,
  
  // Multi-crypto state
  activeCrypto: 'ETH', // Default to ETH for backward compatibility
  gameConfig: null,
  isMultiCryptoMode: false, // Flag to determine which wallet store to use
  
  // Referral system state
  availableDiscounts: [],
  referralStats: null,
  referralProcessed: false,
  
  // Real-time updates
  lastUpdate: null,
});

/**
 * Handle contract/adapter errors with appropriate error messages
 * @param {Error} error - The error to handle
 * @param {string} cryptoType - The cryptocurrency type
 * @returns {string} User-friendly error message
 */
export const handleContractError = (error, cryptoType) => {
  let errorMessage = `${cryptoType} contract not found at the configured address.`;
  
  if (error.message.includes('not yet implemented')) {
    errorMessage = error.message;
  } else if (error.message.includes('Too Many Requests')) {
    errorMessage = 'RPC provider rate limit exceeded. Please try again later.';
  } else if (error.message.includes('missing response')) {
    errorMessage = 'Unable to connect to blockchain network. Please check your internet connection.';
  }
  
  return errorMessage;
};