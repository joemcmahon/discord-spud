// Modelled after the Digital Ocean example.
// Load required modules.
const discordBotkit = require('botkit-discord');
const express = require('express')
require('dotenv').config();

const _ = require('lodash');
const request = require('request');

const {logger, readLog} = require('./utils/logger')
const app = express()

// Various state variables tracking the server.
const stopper = `I wasn't listening...`

// Listener count monitor
var numListeners = 0
var maxListeners = 0

// Track history monitor
var previousTrack = stopper
var currentTrack = stopper
var testTrack = `Nol`
var trackHistory = []
var numTracks = 0
var maxTracks = 10
var histIndex = 0
var oldMessage = ''
var candidateMessage = ''
var lastIcecastUpdate = 0
var lastSuccessfulLogFetch = null
var lastMonitorErrorTime = null
var lastMonitorError = ''

var webhookError = ''
var webhookCode = 0
var webhookStatus = ''

var failing = false

function localDate() {
  return new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"})
}

// Track startup time
let startTime = localDate();

// Set up log fetch
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info("Spud started on port " + PORT);
})

app.get("/api/health", (request, response) => {
  const result = {
    'failing' : failing,
    'webhookCode' : webhookCode,
    'webHookError' : webhookError,
    'webhookStatus' : webhookStatus,
    'lastIcecastUpdate': lastIcecastUpdate,
    'lastSuccessfulLogFetch': lastSuccessfulLogFetch,
    'listeners': maxListeners
  };
  logger.info("health checked");
  response.set('Content-Type', 'application/json')
  return response.send(result);
})

app.get("/api/logs", (request, response) => {
  try {
    const result = readLog();
    console.log(result);
    response.set('Content-Type', 'text/plain');
    return response.send(result);
    lastSuccessfulLogFetch = localDate();
  } catch(e) {
    console.log(e);
    return response.sendStatus(500);
  }
});

var Monitor = require('icecast-monitor');

// The Icecast monitor.
var monitor = new Monitor({
  host: 'radio.radiospiral.net',
  port: 8000,
  user: process.env.RADIO_USER,
  password: process.env.RADIO_PASSWORD,
});

// Configure Icecast monitoring
monitor.createFeed(function(err, feed) {

  // Untracked errors
  if (err) {
    lastMonitorError = err
    lastMonitorErrorTime = localDate();
    failing = true
  }

  // Handle wildcard events
  //feed.on('*', function(event, data, raw) {
  //  console.log(event, data, raw);
  // });

  // Handle listener change
  feed.on('mount.listeners', function(listeners, raw) {
    failing = false
    numListeners = raw;
    if (numListeners > maxListeners) {
      maxListeners = numListeners
      logger.info('Max listeners now ' + maxListeners);
    }
  });

  // Handle track title change
  feed.on('mount.title', function(title, track) {
    failing = false
    logger.info('Now playing: ' + track);         // for debugging right now. should mean the track has changed
    testTrack = track;                            // not sure what type track is, so force it to a string
    if (currentTrack !== testTrack) {
        previousTrack = currentTrack;               // save the no longer current track as the previous
        currentTrack = track;                       // now store the current track
        logger.info("Track change: " + track);
	      let now = localDate();
        failing = false
        webHookError = ''
        webhookCode = 200
        webhookStatus = 'OK'
        // Tell Discord we switched tracks
        request({
          url: process.env.NOW_PLAYING_WEBHOOK,
          method: 'POST',
           json: { content: '['+now+'] ' + currentTrack }
      }),
        // ...or not
        function(error, response, body) {
          if (error || response.statusCode !== 200) {
            failing = true
            webHookError = error
            webhookCode = response.statusCode
            webhookStatus = response.statusText
            logger.error('webhook error: '+ error)
            logger.error('code: ' + response.statusCode)
            logger.error('status: ' + response.statusText)
          }
        }
    }
    trackHistory = _.concat(trackHistory,previousTrack);  // save previous track
    if (trackHistory.length > maxTracks) {
        trackHistory = _.drop(trackHistory);
    } else {
      logger.info('**dupEvent ' + currentTrack + ' is equal to ' + testTrack);
    }

    histIndex = numTracks;

    while (histIndex > 0) {
      logger.info('track history: ' + trackHistory[histIndex]); //works, backwards I think
      histIndex = histIndex - 1;
    }
  });
});


// Set up Botkit controller
const configuration = {
    token: process.env.BOT_TOKEN
};

const discordBot = discordBotkit(configuration);

// We're probably not going to use prefixes but this might change
const prefix = "!";

// Basic bot health/connectivity check
discordBot.hears('ping', 'direct_message', (bot, message) => {
    if (message.author.bot) return;
    logger.info("pinged")
    // ! Do not forget to pass along the message as the first parameters
    bot.reply(message, "Poit!");
});

// Help command
discordBot.hears('help', 'mention', (bot, message) => {
  let text = `
I will respond to the following messages:
\`help\` - to see this message.
\`track\` - to see what the current track is.
\`listeners\` - report on the peak listener count.
\`history\` - to get a list of previously played tracks.
I am very polite as well.
`;
  bot.reply(message, text);
});

// Listeners command
discordBot.hears('listeners', 'mention', (bot, message) => {
  var s = 's'
  if (numListeners == 1) {
    s = ''
  }
  bot.reply(message, numListeners + " listener" + s + " (max of " + maxListeners + " as of " + startTime + " SL time)");
});

discordBot.hears('track', 'mention', (bot, message) => {
  bot.reply(message, 'Now playing: ' + currentTrack + ' (' + numListeners + ' listening)');
});

// Snark if mentioned but no recognized command
discordBot.hears(".*", 'mention', (bot, message) => {
    snark(bot, message);
});


function snark(bot, message) {
    options = [
        ':wave:',
        ':pray:',
        ':raised_hands:',
        'Word.',
        ':wink:',
        'Did you say something?',
        ':innocent:',
        ':smirk:',
        ':stuck_out_tongue:',
        ':sparkles:',
        ':punch:',
        ':boom:',
        ':smiling imp:',
    ];
    if (Math.random() < 0.9) {
        let i = Math.floor(Math.random() * options.length)
        bot.reply(message, options[i])
    }
}
