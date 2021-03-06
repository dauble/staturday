const request = require("request-promise-native");
const ESPN_CFB_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?lang=en&region=us&calendartype=blacklist&limit=300&showAirings=true&groups=80';
//const ESPN_MLS_URL = 'http://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?lang=en&region=us&calendartype=blacklist&limit=300&showAirings=true';

let leagueMapping = {
    "mls" : "usa.1",
    "usl" : "usa.usl.1",
    "usoc" : "USA.OPEN",
    "open cup" : "USA.OPEN",
    "nwsl" : "USA.NWSL",

    "epl" : "eng.1",
    "premier league" : "eng.1",
    "english premier league" : "eng.1",
    "championship" : "eng.2",
    "english championship" : "eng.2",
    "fa cup" : "ENG.FA",
    "fa wsl" : "eng.w.1",
    "wsl" : "eng.w.1",

    "bundesliga" : "ger.1",

    "ligue 1" : "fra.1",
    "french ligue 1" : "fra.1",

    "la liga" : "esp.1",
    "spanish primera división" : "esp.1",

    "italian serie a" : "ita.1",
    "serie a" : "ita.1",

    "ccl" : "CONCACAF.CHAMPIONS",
    "concacaf nations league" : "CONCACAF.NATIONS.LEAGUE",
    "gold cup" : "CONCACAF.GOLD",

    "ucl" : "UEFA.CHAMPIONS",
    "champions league" : "UEFA.CHAMPIONS",
    "uel" : "UEFA.EUROPA",
    "europa league" : "UEFA.EUROPA",
    "europa" : "UEFA.EUROPA",
    "euros" : "UEFA.EURO",
    "euro" : "UEFA.EURO",
    "uefa nations league" : "UEFA.NATIONS",
    "womens champions league" : "UEFA.WCHAMPIONS",

    "isl" : "IND.1",
    "indian super league" : "IND.1",

    "ncaam" : "USA.NCAA.M.1",
    "ncaaw" : "USA.NCAA.W.1",

    "world cup" : "FIFA.WORLD",
    "womens world cup" : "FIFA.WWC",
    "wwc" : "FIFA.WWC",
    "uefa wcq" : "FIFA.WORLDQ.UEFA",
    "concacaf wcq" : "FIFA.WORLDQ.CONCACAF",
    "afc wcq" : "FIFA.WORLDQ.AFC",
    "conmebol wcq" : "FIFA.WORLDQ.CONMEBOL",
    "ofc wcq" : "FIFA.WORLDQ.OFC",
    "caf wcq" : "FIFA.WORLDQ.CAF",

    "mens olympics" : "FIFA.OLYMPICS",
    "womens olympics" : "FIFA.W.OLYMPICS",

    "mnt" : "FIFA.FRIENDLY",
    "friendlies" : "FIFA.FRIENDLY",
    "wnt" : "FIFA.FRIENDLY.W",
    "womens friendlies" : "FIFA.FRIENDLY.W"
}

function generateESPNSoccerUrl(league) {
    var cleanedLeague = league.replace(/['"’]/g,"").toLowerCase()
    var lgMapped = leagueMapping[cleanedLeague];
    return `http://site.api.espn.com/apis/site/v2/sports/soccer/${lgMapped}/scoreboard?lang=en&region=us&calendartype=blacklist&limit=300&showAirings=true`;
}

function createESPNTeam(competitorDict) {
    var team = {};
    team.id = competitorDict.team.id;
    team.location = competitorDict.team.location;
    team.name = competitorDict.team.name;
    team.abbreviation = competitorDict.team.abbreviation;
    team.displayName = competitorDict.team.displayName;
    team.color = competitorDict.team.color;
    team.alternateColor = competitorDict.team.alternateColor;
    team.logoUrl = competitorDict.team.logo;
    team.links = {};
    if (competitorDict.team.links && competitorDict.team.links.length > 0) {
        for (var i = 0; i < competitorDict.team.links.length; i++) {
            var linkDict = competitorDict.team.links[i];
            team.links[linkDict.rel[0]] = linkDict.href;
        }
    }
    team.conferenceId = competitorDict.team.conferenceId;
    team.rank = parseInt((competitorDict.curatedRank && competitorDict.curatedRank.current) ? competitorDict.curatedRank.current : "99");
    team.records = {};
    if (competitorDict.records && competitorDict.records.length > 0) {
        if (competitorDict.records.length == 3) {
            team.records.overall = competitorDict.records[0].summary;
            team.records.home = competitorDict.records[1].summary;
            team.records.away = competitorDict.records[2].summary;
        } else if (competitorDict.records.length == 4) {
            team.records.overall = competitorDict.records[0].summary;
            team.records.conference = competitorDict.records[1].summary;
            team.records.home = competitorDict.records[2].summary;
            team.records.away = competitorDict.records[3].summary;
        } else {
            team.records.overall = competitorDict.records[0].summary;
        }
    }
    team.form = competitorDict.form;

    return team;
}

function createESPNGame(gameEvent) {
    var game = {};

    //Basic game data
    game.id = gameEvent.id;
    game.season = gameEvent.season.year;
    game.date = gameEvent.date;
    game.attendance = gameEvent.competitions[0].attendance;
    game.venue = {};
    game.venue.name = (gameEvent.competitions[0].venue != null) ? gameEvent.competitions[0].venue.fullName : null;
    game.venue.city = (gameEvent.competitions[0].venue != null && gameEvent.competitions[0].venue.address != null) ? gameEvent.competitions[0].venue.address.city : null;
    game.venue.state = (gameEvent.competitions[0].venue != null && gameEvent.competitions[0].venue.address != null) ? gameEvent.competitions[0].venue.address.state : null;
    game.venue.country = (gameEvent.competitions[0].venue != null && gameEvent.competitions[0].venue.address != null) ? gameEvent.competitions[0].venue.address.country : null;
    if (gameEvent.competitions[0].notes && gameEvent.competitions[0].notes.length > 0) {
        game.headline = gameEvent.competitions[0].notes[0].headline;
    } else {
        game.headline = '';
    }
    game.scores = {};
    game.scores.home = gameEvent.competitions[0].competitors[0].score;
    game.scores.away = gameEvent.competitions[0].competitors[1].score;

    //Game Status
    game.status = gameEvent.status;
    game.situation = gameEvent.competitions[0].situation;
    //Teams
    game.homeTeam = createESPNTeam(gameEvent.competitions[0].competitors[0]);
    game.awayTeam = createESPNTeam(gameEvent.competitions[0].competitors[1]);

    // Broadcasts
    game.airings = gameEvent.competitions[0].airings;
    game.geoBroadcasts = gameEvent.competitions[0].geoBroadcasts;
    game.possession = (game.situation != null) ? ((game.situation.possession != null) ? ((game.situation.possession == game.awayTeam.id) ? game.awayTeam.abbreviation : game.homeTeam.abbreviation) : null) : null;

    game.odds = gameEvent.competitions[0].odds;
    return game;
}

module.exports = {
    retrieveFreshCFBGames: function() {
        return request({ uri: `${ESPN_CFB_URL}&${Date.now()}`, method: 'GET', json: true, headers: { "User-Agent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0"} })
        .then(data => {
            var rawEvents = data.events;
            var games = [];
            rawEvents.forEach((item) => {
                var gm = createESPNGame(item);
                games.push(gm);
            });
            return games;
        });
    },
    retrieveFreshSoccerMatches: function(league) {
        return request({ uri: `${generateESPNSoccerUrl(league)}&${Date.now()}`, method: 'GET', json: true, headers: { "User-Agent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0"} })
        .then(data => {
            var rawEvents = data.events;
            var games = [];
            rawEvents.forEach((item) => {
                var gm = createESPNGame(item);
                games.push(gm);
            });
            return games;
        });
    },
    formatESPNJson: createESPNGame
};
