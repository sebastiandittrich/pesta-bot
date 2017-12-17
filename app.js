var builder = require('botbuilder');
var restify = require('restify');
var fs = require('fs');
var stringSimilarity = require('string-similarity');

var prepareEntities = function(entities) {
    ret = {}
    for(entity in entities) {
        entity = entities[entity];
        ret[entity.type.split('::')[0]] = entity
    }
    return ret
}

var getTeacherInfo = function(name, callback) {
    getAllTeachers(function(data) {
        namesarray = []
        for(teacher in data) {
            teacher = data[teacher];
            namesarray.push(teacher.name)
        }
        matches = stringSimilarity.findBestMatch(name, namesarray)
        callback(data.filter(function(element) {
            if(element.name == matches.bestMatch.target) {
                return true;
            }
        })[0])
    })
}

var prepareInfoString = function(teacher, info_str) {
    strings = {
        email: '%g %t hat die E-Mail: %i',
        name: '%g %t heißt mit vollem Namen: %i',
        first_name: '%g %t heißt mit Vornamen %i',
        last_name: '%g %t heißt mit Nachnamen %i',
        subjects: '%g %t unterrichtet %i',
        extra_functions: '%g %t ist %i'
    }
    info = teacher[info_str]
    i_string = ''
    if(typeof info == typeof '') {
        i_string = info
    } else {
        last = info.pop()
        i_string = info.join(', ') + ' und ' + last
    }
    return strings[info_str].replace('%t', teacher.last_name).replace('%i', i_string).replace('%g', teacher.title)
}

var getAllTeachers = function(callback) {
    fs.readFile('teacherdata.json', function(err, data) {
        callback(JSON.parse(data))
    })
}

var prepareAllTeachersList = function(teachers) {
    string = ''
    for(teacher in teachers) {
        string += '\n' + teachers[teacher].name
    }
    return string
}

// Set environment variables
process.env.MICROSOFT_APP_ID = '37ea7dee-4aa0-4504-a3c3-2d4127c704ac';
process.env.MICROSOFT_APP_PASSWORD = 'FjKiFtGDV29tbORkRSv9d27';
process.env.LUIS_MODEL_URL = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/3b2a9108-9d5b-4aee-9fcd-9b93a6fe6de8?subscription-key=b72e103b28f2428e9d271cdaf286b8b0&spellCheck=true&bing-spell-check-subscription-key=933aa50d3fe84a84bd29ec050cbcb2d5&verbose=true&timezoneOffset=0&q=";

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
var bot = new builder.UniversalBot(connector, function(session) {
    session.send('Ich habe dich nicht verstanden. Das tut mit leid.')
});

// Setup Luis
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

// ----------- //
// Bot Dialogs //
// ----------- //

// Lehrer Info
bot.dialog('TeacherInfo', function(session, args) {
    session.sendTyping()
    if(session.message.text.toLowerCase().indexOf('danke') > -1) {
        session.send('Gerne')
        session.endDialog()
        return true;
    }
    entities = prepareEntities(args.intent.entities);
    needed = ['TeacherName', 'TeacherInfo'];
    filled = true;
    for(need in needed) {
        if(!(needed[need] in entities)) {
            if(session.userData.history.lastEntities != undefined && (needed[need] in session.userData.history.lastEntities)) {
                entities[needed[need]] = session.userData.history.lastEntities[needed[need]]
            } else {
                filled = false
                console.log('Need: %s', need)
            }
        }
    }
    if(session.userData.history == undefined) {
        session.userData.history = {}
    }
    session.userData.history.lastEntities = entities
    if(!filled) {
        session.send('Anscheinend habe ich nicht alles verstanden. Das tut mir leid!');
    } else {
        infoname = entities.TeacherInfo.resolution.values[0]
        getTeacherInfo(entities.TeacherName.entity, function(teacher) {
            if(infoname != "all") {
                session.send(prepareInfoString(teacher, infoname))
            } else {
                session.send(new builder.Message(session).addAttachment({
                    contentType: "application/vnd.microsoft.card.adaptive",
                    content: {
                        type: "AdaptiveCard",
                        body: [
                                {
                                    "type": "TextBlock",
                                    "text": teacher.name,
                                    "size": "large",
                                    "weight": "bolder"
                                },
                                {
                                    "type": "TextBlock",
                                    "text": teacher.email
                                },
                                {
                                    "type": "TextBlock",
                                    'text': "Fächer",
                                    "weight": "bolder"
                                },
                                {
                                    "type": "TextBlock",
                                    'text': teacher.subjects.join(', ')
                                },
                                {
                                    "type": "TextBlock",
                                    'text': "Funktionen",
                                    "weight": "bolder"
                                },
                                {
                                    "type": "TextBlock",
                                    'text': teacher.extra_functions.join(', ')
                                }
                            ]
                    }
                }));   
            }
        })
    }
}).triggerAction({
    matches: 'TeacherInfo'
})

bot.dialog('Greet', function(session) {
    session.send('Hallo! Ich bin der Pestabot. Du kannst mir Fragen zu Lehrern aus dem Pestalozzi-Gymnasium stellen.')
    session.endDialog()
}).triggerAction({
    matches: 'Greet'
})

bot.dialog('None', function(session) {
    session.send('Ok. Ich glaube du hast mir nichts gesagt.')
    session.endDialog()
}).triggerAction({
    matches: 'None'
})

bot.dialog('AllTeachers', function(session) {
    getAllTeachers(function(list) {
        session.send(prepareAllTeachersList(list))
        session.endDialog()
    })
}).triggerAction({
    matches: 'AllTeachers'
})
