const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new TelegramBot('6709247078:AAHp8UF5DWeUrjC9_Q8TUO2giHKUblifpR8', { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.video) {
    const video = msg.video;
    const fileId = video.file_id;
    const file = await bot.getFile(fileId);
    const videoUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // Create folder if it doesn't exist
    const outputFolder = path.join(__dirname, 'output');
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    // Watermark the video using ffmpeg
    const outputFilename = path.join(outputFolder, 'watermarked_video.mp4');
    const ffmpegProcess = spawn('ffmpeg', [
      '-i', videoUrl,
      '-vf', `drawtext=text='ronok':x=10:y=10:fontsize=24:fontcolor=white`,
      outputFilename
    ]);

    ffmpegProcess.on('close', () => {
      // Send the watermarked video back to the user
      bot.sendVideo(chatId, fs.readFileSync(outputFilename));
      // Remove the temporary file
      fs.unlinkSync(outputFilename);
    });
  }
});
