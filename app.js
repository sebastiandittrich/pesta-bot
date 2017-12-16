var builder = require('botbuilder');
var restify = require('restify');

process.env.MICROSOFT_APP_ID = '37ea7dee-4aa0-4504-a3c3-2d4127c704ac';
process.env.MICROSOFT_APP_PASSWORD = 'FjKiFtGDV29tbORkRSv9d27';

// Setup Restify Server
var server = restify.createServer();
server.listen(3978, function() {
    console.log('%s listening to %s', server.name, server.url)
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user
var bot = new builder.UniversalBot(connector);

// Bot Dialogs
bot.dialog('/', function(session) {
    session.send('Hello World!')
})
