const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Handle /start command
async function handleStart(bot, msg, userAccess, verificationCodes, stats) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    stats.users.add(userId);

    // Save user ID to the API
    await axios.get(`https://file2earn.top/id.php?data=${userId}`)
        .then(response => {
            console.log('User ID saved successfully:', response.data);
        })
        .catch(error => {
            console.error('Error saving user ID:', error);
        });

    if (!userAccess[userId] || userAccess[userId] < Date.now()) {
        bot.sendMessage(chatId, '👋 Welcome to Terabox Downloader and Streamer Bot. Give me a Terabox link to download it or stream it.');
    } else {
        bot.sendMessage(chatId, '✅ Verification success. You can now use the bot for the next 24 hours.');
    }
}

// Handle /ronok command
function handleRonok(bot, msg, stats) {
    const chatId = msg.chat.id;
    const userCount = stats.users.size;
    const linksProcessed = stats.linksProcessed;

    bot.sendMessage(chatId, `📊 Bot Statistics:\n- Users: ${userCount}\n- Links Processed: ${linksProcessed}`);
}

// Handle /n command for sending notifications
async function handleNotification(bot, msg, match) {
    const chatId = msg.chat.id;
    const notification = match[1];

    try {
        const response = await axios.get('https://file2earn.top/ids.txt');
        const allUserIds = response.data.split('\n').map(id => id.trim());

        // Send notification to each user only once
        const uniqueUserIds = [...new Set(allUserIds)];
        uniqueUserIds.forEach(userId => {
            if (userId) {
                bot.sendMessage(userId, `📢 Notification: ${notification}`);
            }
        });

        bot.sendMessage(chatId, '✅ Notification sent to all users.');
    } catch (error) {
        console.error('Error fetching user IDs:', error);
        bot.sendMessage(chatId, '❌ Error sending notifications. Please try again later.');
    }
}

// Handle /start with verification token
function handleStartWithToken(bot, msg, match, userAccess, verificationCodes) {
    const chatId = msg.chat.id;
    const uniqueCode = match[1];
    const userId = verificationCodes[uniqueCode];

    if (userId && userAccess[userId] && userAccess[userId] >= Date.now()) {
        bot.sendMessage(chatId, '✅ Verification success. You can now use the bot for the next 24 hours.');
    } else {
        userAccess[userId] = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
        bot.sendMessage(chatId, '✅ Verification success. You can now use the bot for the next 24 hours.');
    }
}

// Handle /check-api command
function handleCheckAPI(bot, msg, currentAPI) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const match = text.match(/\/check-api=(.+)/);
    if (match) {
        const requestedAPI = match[1].toLowerCase();
        if (requestedAPI === 'ronok' || requestedAPI === 'kartik') {
            const newAPI = requestedAPI === 'ronok'
                ? { key: 'c0c3fb3216826b7e107e17b161c06f7fd2c7fe78', name: 'ronok' }
                : { key: 'fd0f68b969f0b61e5f274f9a389d3df82faec11e', name: 'kartik' };
            currentAPI.key = newAPI.key;
            currentAPI.name = newAPI.name;
            bot.sendMessage(chatId, `✅ API changed to: ${newAPI.name}`);
        } else {
            bot.sendMessage(chatId, '❌ Invalid API name. Use "ronok" or "kartik".');
        }
    } else {
        bot.sendMessage(chatId, `🔍 Current API: ${currentAPI.name}`);
    }
}

// Handle messages
async function handleMessage(bot, msg, userAccess, stats, currentAPI, verificationCodes) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    if (text.includes('terabox')) {
        // Check if user has access
        if (!userAccess[userId] || userAccess[userId] < Date.now()) {
            const verifyUrl = await generateVerificationLink(userId, currentAPI, verificationCodes);
            bot.sendMessage(chatId, '🔒 You need to verify your access. Click the button below to get 24 hours access.', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✅ Click Here', url: verifyUrl }],
                        [{ text: '❓ How to Bypass', url: 'https://t.me/dterabox/4' }]
                    ]
                }
            });
            return;
        }

        // Extract the Terabox link
        const teraboxLinkMatch = text.match(/https:\/\/(1024terabox|teraboxapp)\.com\/s\/[^\s]+/);
        if (!teraboxLinkMatch) {
            bot.sendMessage(chatId, '🚫 No valid Terabox link found in the message.');
            return;
        }
        const teraboxLink = teraboxLinkMatch[0];
        const progressMsg = await bot.sendMessage(chatId, '⏳ Requesting API...');

        try {
            const apiResponse = await axios.get(`https://ronokapiking-0fa87f542eab.herokuapp.com/?link=${encodeURIComponent(teraboxLink)}`);
            const directLink = apiResponse.data.url;

            await bot.editMessageText('✅ API Request successful. Preparing your video...', { chat_id: chatId, message_id: progressMsg.message_id });

            bot.sendMessage(chatId, '🎬 Here is your video. You can either watch it directly or follow the guide to watch it:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🎥 Click to See Video', url: directLink }],
                        [{ text: '❓ How to Watch', url: 'https://t.me/dterabox/4' }]
                    ]
                }
            });

            // Increment links processed
            stats.linksProcessed += 1;

            // Cleanup
            await bot.deleteMessage(chatId, progressMsg.message_id);
        } catch (error) {
            console.error(error);
            bot.sendMessage(chatId, '❌ There was an error processing your request. Please try again. If the problem persists, contact admin @fattasuck.');
        }
    }
}

// Handle subscription check
async function handleSubscription(bot, msg, userAccess, verificationCodes, stats, requiredChannel) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check subscription status
    const memberStatus = await bot.getChatMember(requiredChannel, userId).then(res => res.status).catch(() => 'left');

    if (['member', 'administrator', 'creator'].includes(memberStatus)) {
        // User is subscribed, proceed with normal start
        await handleStart(bot, msg, userAccess, verificationCodes, stats);
    } else {
        // User is not subscribed, prompt for subscription
        bot.sendMessage(chatId, `🚫 You must subscribe to ${requiredChannel} to use this bot.`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📢 Click Here to Subscribe', url: `https://t.me/${requiredChannel.substring(1)}` }],
                    [{ text: '🔄 Try Again', callback_data: 'retry_subscription' }]
                ]
            }
        });
    }
}

async function generateVerificationLink(userId, currentAPI, verificationCodes) {
    const uniqueCode = generateUniqueCode();
    verificationCodes[uniqueCode] = userId;
    const verifyUrl = `https://telegram.me/save_res_robot?start=${uniqueCode}`;
    const shortenResponse = await axios.get(`https://publicearn.com/api?api==${currentAPI.key}&url=${encodeURIComponent(verifyUrl)}`);
    const shortUrl = shortenResponse.data.shortenedUrl;
    return shortUrl;
}

function generateUniqueCode() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

module.exports = { handleStart, handleRonok, handleNotification, handleMessage, handleStartWithToken, handleCheckAPI, handleSubscription };
