require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Replace with your bot token
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Ensure download and output directories exist
const downloadDir = path.join(__dirname, 'downloads');
const outputDir = path.join(__dirname, 'outputs');

if (!fs.existsSync(downloadDir)){
    fs.mkdirSync(downloadDir);
}

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}

bot.on('message', async (msg) => {
    if (msg.video) {
        const chatId = msg.chat.id;
        const fileId = msg.video.file_id;

        // Inform user that the process has started
        bot.sendMessage(chatId, 'Downloading and processing your video...');

        // Get the file path
        const fileUrl = await bot.getFileLink(fileId);

        // Download the video
        const videoPath = path.join(downloadDir, `${fileId}.mp4`);
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(fs.createWriteStream(videoPath))
        .on('finish', () => {
            // Watermark the video
            const outputPath = path.join(outputDir, `watermarked-${fileId}.mp4`);

            bot.sendMessage(chatId, 'Watermarking video...');

            ffmpeg(videoPath)
                .videoFilter("drawtext=text='Ronok':fontcolor=white:fontsize=24:x=10:y=10")
                .save(outputPath)
                .on('progress', (progress) => {
                    if (progress.percent) {
                        bot.sendMessage(chatId, `Progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    // Send the watermarked video back to the user
                    bot.sendVideo(chatId, outputPath)
                    .then(() => {
                        // Cleanup files
                        fs.unlinkSync(videoPath);
                        fs.unlinkSync(outputPath);
                    });

                    bot.sendMessage(chatId, 'Video processing complete.');
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
