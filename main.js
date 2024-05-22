const TelegramBot = require('node-telegram-bot-api');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Your Telegram bot token
const token = '6709247078:AAHp8UF5DWeUrjC9_Q8TUO2giHKUblifpR8';
const bot = new TelegramBot(token, { polling: true });

// Directories for downloads and outputs
const downloadDir = path.join(__dirname, 'downloads');
const outputDir = path.join(__dirname, 'outputs');

// Ensure the download and output directories exist
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

bot.on('message', async (msg) => {
    if (msg.video) {
        const chatId = msg.chat.id;
        const fileId = msg.video.file_id;

        try {
            // Inform user that the process has started
            await bot.sendMessage(chatId, 'Downloading and processing your video...');

            // Get the file URL
            const fileUrl = await bot.getFileLink(fileId);
            console.log(`File URL: ${fileUrl}`);

            // Define paths for the downloaded and output video files
            const videoPath = path.join(downloadDir, `${fileId}.mp4`);
            const outputPath = path.join(outputDir, `watermarked-${fileId}.mp4`);

            // Download the video
            const response = await axios({
                url: fileUrl,
                method: 'GET',
                responseType: 'stream'
            });

            response.data.pipe(fs.createWriteStream(videoPath))
                .on('finish', async () => {
                    console.log(`Video downloaded: ${videoPath}`);

                    // Watermark the video
                    ffmpeg(videoPath)
                        .videoFilter("drawtext=text='Ronok':fontcolor=white:fontsize=24:x=10:y=10")
                        .on('progress', (progress) => {
                            if (progress.percent) {
                                console.log(`Progress: ${Math.round(progress.percent)}%`);
                                bot.sendMessage(chatId, `Progress: ${Math.round(progress.percent)}%`);
                            }
                        })
                        .on('end', async () => {
                            console.log(`Video processed: ${outputPath}`);

                            // Send the watermarked video back to the user
                            await bot.sendVideo(chatId, outputPath);
                            console.log(`Watermarked video sent: ${outputPath}`);

                            // Cleanup files
                            fs.unlinkSync(videoPath);
                            fs.unlinkSync(outputPath);
                            console.log(`Temporary files cleaned up`);

                            await bot.sendMessage(chatId, 'Video processing complete.');
                        })
                        .on('error', (err) => {
                            console.error('Error processing video:', err);
                            bot.sendMessage(chatId, 'There was an error processing your video.');
                        })
                        .save(outputPath);
                })
                .on('error', (err) => {
                    console.error('Error downloading video:', err);
                    bot.sendMessage(chatId, 'There was an error downloading your video.');
                });

        } catch (error) {
            console.error('Error handling message:', error);
            bot.sendMessage(chatId, 'There was an error handling your request.');
        }
    } else {
        bot.sendMessage(msg.chat.id, 'Please send a video to watermark.');
    }
});
