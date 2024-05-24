const TelegramBot = require('node-telegram-bot-api');
const { saveStatsToAPI, rotateAPI } = require('./worker');
const { handleStart, handleRonok, handleNotification, handleMessage, handleStartWithToken, handleCheckAPI, handleSubscription } = require('./command');
const axios = require('axios');

// Bot token
const token = '6701652400:AAHoPAbSEf55Tz_aDGSiOz7CPf0xJl8TDts';
const bot = new TelegramBot(token, { polling: true });

// In-memory store for user access tokens with expiry times and stats
let userAccess = {};
let verificationCodes = {};
let stats = {
    users: new Set(),
    linksProcessed: 0
};
let currentAPI = {
    key: '1166d17c61fcc77480e3778ee44627b1f1ffbcb0',
    name: 'ronok'
};
const requiredChannel = '@terabox_video_down';

// Global error handling to keep the bot running
process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Save stats every 24 hours and rotate API
setInterval(() => {
    saveStatsToAPI(stats);
    currentAPI = rotateAPI(currentAPI);
}, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

// Command handlers
bot.onText(/\/start$/, (msg) => handleSubscription(bot, msg, userAccess, verificationCodes, stats, requiredChannel));
bot.onText(/\/start (.+)/, (msg, match) => handleStartWithToken(bot, msg, match, userAccess, verificationCodes));
bot.onText(/\/ronok/, (msg) => handleRonok(bot, msg, stats));
bot.onText(/\/n (.+)/, (msg, match) => handleNotification(bot, msg, match));
bot.onText(/\/check-api/, (msg) => handleCheckAPI(bot, msg, currentAPI));
bot.on('message', (msg) => handleMessage(bot, msg, userAccess, stats, currentAPI, verificationCodes));

// Handle callback queries (for retrying subscription check)
bot.on('callback_query', async (callbackQuery) => {
    const action = callbackQuery.data;
    const msg = callbackQuery.message;

    if (action === 'retry_subscription') {
        await handleSubscription(bot, msg, userAccess, verificationCodes, stats, requiredChannel);
    }
});

// Expose bot and currentAPI for testing
module.exports = { bot, currentAPI };
