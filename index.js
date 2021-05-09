const discordBotkit = require('botkit-discord');
require('dotenv').config();

const _ = require('lodash');
const request = require('request');

console.log(process.env.BOT_TOKEN);
console.log(process.env.RADIO_USER);
console.log(process.env.RADIO_PASSWORD);

const configuration = {
    token: process.env.BOT_TOKEN
};

// Set up the Icecast monitor.
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

var Monitor = require('icecast-monitor');

var monitor = new Monitor({
  host: 'radio.radiospiral.net',
  port: 8000,
  user: process.env.RADIO_USER,
  password: process.env.RADIO_PASSWORD,
});

const stopper = `I wasn't listening...`

var numListeners = 0
var maxListeners = 0

var previousTrack = stopper
var currentTrack = stopper
var testTrack = `Nol`
var trackHistory = []
var numTracks = 0
var maxTracks = 10
var histIndex = 0
var oldMessage = ''
var candidateMessage = ''

let startTime = new Date
function readableDate(d) {
  return d.toLocaleTimeString('en-US')
}

monitor.createFeed(function(err, feed) {
  if (err) throw err;

  // Handle wildcard events
  //feed.on('*', function(event, data, raw) {
  //  console.log(event, data, raw);
  // });
  // Handle listener change
  feed.on('mount.listeners', function(listeners, raw) {
    numListeners = raw;
    if (numListeners > maxListeners) {
      maxListeners = numListeners
    }
  });

  // Handle track title change here

  feed.on('mount.title', function(title, track) {
    console.log('Now playing: ' + track);         // for debugging right now. should mean the track has changed
    testTrack = track;                            // not sure what type track is, so force it to a string
    if (currentTrack !== testTrack) {
        //console.log(currentTrack + " is not equal to " + testTrack);    // debug, they aren't equal, so yes
        console.log('Track change to ' + testTrack);
        previousTrack = currentTrack;               // save the no longer current track as the previous
        currentTrack = track;                       // now store the current track
	console.log("Telling Discord about it...");
        request({
	        url: process.env.NOW_PLAYING_WEBHOOK,
	        method: 'POST',
	   	    json: { content: currentTrack }
	    }),
        function(error, response, body) {
            if (error || response.statusCode === 200) {
		        console.log('error: '+ error)
	   	    	console.log('code: ' + response.statusCode)
	     	    console.log('status: ' + response.statusText)
	        }
	    }
    }
    trackHistory = _.concat(trackHistory,previousTrack);  // save previous track
    if (trackHistory.length > maxTracks) {
	console.log("dropped one old track");
        trackHistory = _.drop(trackHistory);
    } else {
      console.log('**dupEvent ' + currentTrack + ' is equal to ' + testTrack);
    }

    histIndex = numTracks;

    while (histIndex > 0) {
    console.log('track history: ' + trackHistory[histIndex]); //works, backwards I think
      histIndex = histIndex - 1;
    }
  });
});


// This is commonly known as the Botkit controller
const discordBot = discordBotkit(configuration);
const prefix = "!";

// The connector supports other types as well
discordBot.hears('ping', 'direct_message', (bot, message) => {
    if (message.author.bot) return;
    // ! Do not forget to pass along the message as the first parameters
    bot.reply(message, "Poit!");
});

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

discordBot.hears('listeners', 'mention', (bot, message) => {
  var s = 's'
  if (numListeners == 1) {
    s = ''
  }
  bot.reply(message, numListeners + " listener" + s + "(max of " + maxListeners + "as of " + readableDate(startTime) + ")");
});

discordBot.hears('track|playing|hearing|tune|listening|music', 'mention', (bot, message) => {
  bot.reply('Now playing: ' + currentTrack + ' (' + numListeners + ' listening)');
});

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
