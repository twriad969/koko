require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const axios = require('axios');

// Replace with your bot token
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
    if (msg.video) {
        const chatId = msg.chat.id;
        const fileId = msg.video.file_id;
        
        // Get the file path
        const fileUrl = await bot.getFileLink(fileId);
        
        // Download the video
        const videoPath = `./downloads/${fileId}.mp4`;
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });
        
        response.data.pipe(fs.createWriteStream(videoPath))
        .on('finish', () => {
            // Watermark the video
            const outputPath = `./outputs/watermarked-${fileId}.mp4`;
            ffmpeg(videoPath)
                .input('path/to/watermark.png')
                .complexFilter('[0:v][1:v] overlay=10:10')
                .save(outputPath)
                .on('end', () => {
                    // Send the watermarked video back to the user
                    bot.sendVideo(chatId, outputPath)
                    .then(() => {
                        // Cleanup files
                        fs.unlinkSync(videoPath);
                        fs.unlinkSync(outputPath);
                    });
                })
                .on('error', (err) => {
                    console.error('Error processing video: ', err);
                    bot.sendMessage(chatId, 'There was an error processing your video.');
                });
        })
        .on('error', (err) => {
            console.error('Error downloading video: ', err);
            bot.sendMessage(chatId, 'There was an error downloading your video.');
        });
    } else {
        bot.sendMessage(msg.chat.id, 'Please send a video to watermark.');
    }
});
