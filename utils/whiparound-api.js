const request = require("request-promise-native");
const cron = require("node-cron");
const ScoreFormatter = require("../utils/scoreformat")

// in cron job:
// pull spicy game diffs
// create game blocks + spice meter
// post to slack
function retrieveDiffs(url, logging) {
    return request({ uri: `${url}/diff`, method: 'GET', json: true })
        .then(data => {
            var rawEvents = data.diffs;
            var games = [];
            rawEvents.forEach((item) => {
                games.push(item);
            });
            return games;
        });
}

module.exports = {
    startCronJob: function(url, cronSched, logger, callback) {
        logger.info("Scheduling data refresh based on ENV cron schedule: " + cronSched)
        cron.schedule(cronSched, function() {
            logger.info("---- Checking Whiparound Diffs ----");
            retrieveDiffs(url)
            .then(games => {
                var blocks = ScoreFormatter.generateCFBScoreBlocks(games, true);
                callback(blocks);
            }).catch(err => {
                logger.info(`Error while loading Whiparound diffs: ${err}`);
            });
        });
    }
};