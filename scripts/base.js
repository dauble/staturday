const WebClient = require("@slack/client").WebClient;
const attach = require("../formats/sample-attach");
const CfbApi = require("../utils/cfb-api")
const EspnApi = require("../utils/espn-api")
const generateScoreBlocks = require("../utils/scoreformat")
const moment = require("moment")

function _processGameState(gm) {
    return `search successful for game ${gm.id}`;
}

module.exports = function(robot) {
    robot.receiveMiddleware((context, next, done) => {
        robot.logger.info(`"${context.response.message.text}" received from @${context.response.message.user.name}`)
        next(done);
    });

    var web = new WebClient(robot.adapter.options.token)
    function sendSlackMessage(res, text, options, shouldChannelify) {
        if (options == null) {
            options = {};
        }
        if (robot.adapter.options.token != null) {
            options.thread_ts = (res.message.thread_ts != null || shouldChannelify) ? res.message.thread_ts : res.message.rawMessage.ts;
        }
        return web.chat.postMessage(res.message.room, text, options);
    };

    //
    // robot.hear(/\!box/i, (res) => {
    //     return sendSlackMessage(res, "georgia -100, Georgia Tech 6969", {"blocks":JSON.stringify(require("../formats/sample-block").blocks)},false);
    // })

    function _isFreshData(timeString) {
        if (timeString == null) {
            return false
        }
        var lastUpdated = moment(timeString).toNow();
        if (lastUpdated.includes("seconds") || lastUpdated.includes("minute")) {
            return true
        } else if (lastUpdated.includes("minutes")) {
            var cleaner = lastUpdated.replace("in ","").replace(/ minutes?/i,"");
            return parseInt(cleaner) <= 2
        } else {
            return false
        }
    }

    robot.hear(/live/i, (res) => {
        var gameData = robot.brain.get("most-recent");
        robot.logger.info(`Loading live again`)
        if (gameData != null && _isFreshData(gameData.last_updated)) {
            robot.logger.info(`Referring to existing data, last loaded on ${gameData.last_updated}`)
            var games = gameData.results;
            var blocks = generateScoreBlocks(games);
            return sendSlackMessage(res, "", {blocks:JSON.stringify(blocks)}, true);
        } else {
            robot.logger.info(`Loading new data from ESPN...`)
            EspnApi.retrieveFreshCFBGames()
            .then(games => {
                var blocks = generateScoreBlocks(games);
                robot.brain.set("most-recent",{results:games,last_updated:moment().format()})
                return sendSlackMessage(res, "", {blocks:JSON.stringify(blocks)}, true);
            })
            .catch(err => {
                robot.logger.error(`Error while retrieving games from ESPN: ${err}`);
                return sendSlackMessage(res, `Error while retrieving games from ESPN: ${err}`, null, false);
            })
        }
    });

    // robot.hear(/\!score\s?(.*)?/i, (res) => {
    //     // if (res.match.length < 2 || res.match[1] == null || res.match[1].length == 0) {
    //     //     return sendSlackMessage(res, `No team provided to search for.`, null, false);
    //     // }
    //     var cleanedTeamName = res.match.length > 1 ? (res.match[1] != null ? res.match[1] : "").trim() : "";
    //     EspnApi.retrieveFreshCFBGames()
    //     .then(games => {
    //         // robot.logger.info("games");
    //         if (cleanedTeamName.length != 0) {
    //             var teams = games.map((item) => item.homeTeam.location.toLowerCase()).concat(games.map(item => item.awayTeam.location.toLowerCase()));
    //             var gameIds = games.map((item) => item.id).concat(games.map(item => item.id));
    //             var index = teams.indexOf(cleanedTeamName.toLowerCase());
    //             if (cleanedTeamName != -1) {
    //                 var relevantGames = games.filter(item => item.id == gameIds[index]);
    //                 if (relevantGames.length == 0) {
    //                     robot.logger.error(`Can not find "${cleanedTeamName}" in action at this time.`);
    //                     return sendSlackMessage(res, `Can not find "${cleanedTeamName}" in action at this time.`, null, false);
    //                 } else {
    //                     var gm = relevantGames[0];
    //                     return sendSlackMessage(res, _processGameState(gm), null, true);
    //                 }
    //             } else {
    //                 robot.logger.error(`Can not find "${cleanedTeamName}" in action at this time.`);
    //                 return sendSlackMessage(res, `Can not find "${cleanedTeamName}" in action at this time.`, null, false);
    //             }
    //         } else {
    //             var mass = "";
    //             games.forEach(item => {
    //                 mass += ("\n" + _processGameState(item))
    //             });
    //             return sendSlackMessage(res, mass, null, true);
    //         }
    //     })
    //     .catch(err => {
    //         robot.logger.error(`Error while looking for "${cleanedTeamName}": ${err}`);
    //         return sendSlackMessage(res, `Error while looking for "${cleanedTeamName}": ${err}`, null, false);
    //     })
    // });
};