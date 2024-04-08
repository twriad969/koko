const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const uddoktapayApiKey = process.env.UDDOKTAPAY_API_KEY;

const bot = new TelegramBot(telegramToken, { polling: true });

app.use(bodyParser.json());

// Map to store user data
const userData = new Map();

// Function to send a message to Telegram user
function sendMessageToUser(chatId, message, options) {
  bot.sendMessage(chatId, message, options);
}

// Welcome message and membership selection buttons
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Delete old 150tk button message if exists
  if (userData.has(chatId)) {
    const storedData = userData.get(chatId);
    bot.deleteMessage(chatId, storedData.messageId);
    userData.delete(chatId);
  }

  const welcomeMsg = "Welcome to our bot!🔥\n\nPlease select your membership plan:";
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Lifetime Membership (150tk)', callback_data: 'lifetime' }],
        [{ text: '1 Month Membership (50tk)', callback_data: 'monthly' }]
      ]
    }
  };

  sendMessageToUser(chatId, welcomeMsg, options);
});

// Handler for membership selection buttons
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const membership = callbackQuery.data;

  let amount;
  let description;

  if (membership === 'lifetime') {
    amount = '150';
    description = "\n" +
      "150BDT LIFETIME PLAN\n\n" +
      "✅ DESI CONTENT REGULAR\n" +
      "✅ DOWNLOAD OPTION ON\n" +
      "✅ TANGO CONTENT\n" +
      "✅ DESI NUDE/S\n" +
      "✅ INDIAN MODEL NUD/ES\n" +
      "✅ 40 EXCLUSIVE CHANNELS";

  } else if (membership === 'monthly') {
    amount = '50';
    description = "\n" +
      "150BDT 1 MONTH PLAN\n\n" +
      "✅ DESI CONTENT REGULAR\n" +
      "❌ DOWNLOAD OPTION OFF\n" +
      "❌ TANGO CONTENTS\n" +
      "✅ DESI NUDE/S\n" +
      "✅ PREMIUM VIDEOS\n" +
      "✅ 20 PAID CHANNELS";
  } else {
    return;
  }

  const payload = {
    full_name: callbackQuery.from.first_name,
    email: callbackQuery.from.username + "@gmail.com",
    amount: amount,
    metadata: {
      chat_id: chatId.toString(),
      membership: membership
    },
    redirect_url: process.env.REPLIT_URL + '/payment-complete',
    return_type: 'GET',
    cancel_url: process.env.REPLIT_URL + '/payment-cancel',
    webhook_url: process.env.REPLIT_URL + '/payment-complete'
  };

  const options = {
    url: 'https://payment.mlobd.online/api/checkout-v2',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'RT-UDDOKTAPAY-API-KEY': uddoktapayApiKey
    },
    body: JSON.stringify(payload)
  };

  // Send request to UddoktaPay API
  request(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const data = JSON.parse(body);
      const paymentUrl = data.payment_url;

      // Store user data
      const messageId = callbackQuery.message.message_id;
      userData.set(chatId, {
        paymentUrl: paymentUrl,
        messageId: messageId
      });

      // Send membership description and payment link
      const message = `${description}\n\nClick the button below to make payment:\nYou have 2 minutes to complete your payment`;
      const payButton = {
        inline_keyboard: [
          [{ text: 'Make Payment', url: paymentUrl }]
        ]
      };

      // Edit the existing message with payment link
      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: JSON.stringify(payButton)
      });

      // Schedule payment link removal after 2 minutes
      setTimeout(() => {
        if (userData.has(chatId)) {
          const storedData = userData.get(chatId);
          bot.deleteMessage(chatId, storedData.messageId);
          userData.delete(chatId);
        }
      }, 120000);
    } else {
      sendMessageToUser(chatId, 'Error occurred while generating payment link.');
    }
  });
});

// Endpoint to handle payment completion notification
app.get('/payment-complete', (req, res) => {
  const invoiceId = req.query.invoice_id;

  // Verify payment using invoice ID
  const verifyPayload = { invoice_id: invoiceId };
  const verifyOptions = {
    url: 'https://payment.mlobd.online/api/verify-payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'RT-UDDOKTAPAY-API-KEY': uddoktapayApiKey
    },
    body: JSON.stringify(verifyPayload)
  };

  request(verifyOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const paymentData = JSON.parse(body);
      const chatId = paymentData.metadata ? paymentData.metadata.chat_id : null;

      if (!chatId) {
        res.status(400).send('Invalid chat ID');
        return;
      }

      // Send success message to user
      sendMessageToUser(chatId, 'Congratulations! Your payment was successful✅');

      // Delete old messages
      const storedData = userData.get(chatId);
      if (storedData) {
        bot.deleteMessage(chatId, storedData.messageId);
        userData.delete(chatId);
      }

      // Send buttons for premium channels
      const premiumChannelsButtons = {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Premium Channel 1', url: 'https://t.me/+jwVA1088ntI4NTY1' }],
            [{ text: 'Premium Channel 2', url: 'https://t.me/+HtfDVNyNaPcxNWVl' }]
          ]
        }
      };

      sendMessageToUser(chatId, "You now have access to our premium content🔥", premiumChannelsButtons);

      res.sendStatus(200);
    } else {
      console.error('Error occurred while verifying payment.');
    }
  });
});

// Endpoint to handle payment cancellation notification
app.post('/payment-cancel', (req, res) => {
  res.send('Payment cancelled.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
