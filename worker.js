const axios = require('axios');

// Function to save stats data to the API every 24 hours
function saveStatsToAPI(stats) {
    const statsData = {
        userCount: stats.users.size,
        linksProcessed: stats.linksProcessed
    };
    axios.get(`https://file2earn.top/?data=${encodeURIComponent(JSON.stringify(statsData))}`)
        .then(response => {
            console.log('Stats saved successfully:', response.data);
        })
        .catch(error => {
            console.error('Error saving stats:', error);
        });
}

// Function to rotate API keys every 24 hours
function rotateAPI(currentAPI) {
    const newAPI = currentAPI.key === 'fd0f68b969f0b61e5f274f9a389d3df82faec11e'
        ? { key: 'fd0f68b969f0b61e5f274f9a389d3df82faec11e', name: 'kartik' }
        : { key: 'c0c3fb3216826b7e107e17b161c06f7fd2c7fe78', name: 'ronok' };
    console.log(`API rotated to: ${newAPI.name}`);
    return newAPI;
}

module.exports = { saveStatsToAPI, rotateAPI };
