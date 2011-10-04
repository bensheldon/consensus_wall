var PORT = 57953;

var PushIt = require ('push-it').PushIt,
    fs = require('fs'),
    connect = require('connect'),
    sys = require('sys'),
    Jade = require('jade'),
    redis = require('redis');

try {
   var options = JSON.parse(fs.readFileSync(__dirname+"/options.json"));  
}
catch(e) {
   console.error("Could not load the options file!: ", e.toString());
   process.exit();
}


var views = {
  wall: fs.readFileSync(__dirname + '/views/wall.jade', 'utf8')
};

// Connect to the database
var database = redis.createClient();
database.auth(options.databaseAuth);
database.on('error', function(err) {
    console.log('Error ' + err);
});
console.log("Database connected...");

// Load Models
var Wall = require("./models/wall");
var Card = require("./models/card");


var server = connect.createServer();

/** Load a wall **/
server.use(connect.bodyParser());
server.use(connect.router(function(server){
  server.post('/wall/new', function(req, res, next) {
    console.log(req.body);
    if (req.body.action == "new-wall") {
      var wall = new Wall(database);
      wall.create();
      
      // redirect to that page.
      res.writeHead(302, {
        Location: "/wall/" + wall.id
      });
      res.end();
    }
  });
  server.get('/wall/:id', function(req, res, next){
    var wallId = req.params.id; //from the GET path
    var wall = new Wall(database);
    wall.load(req.params.id, true, function(wall) {    
      // if no ID, it doesn't exist
      if (wall.id !== null) {
        var data = {
          wall: wall
        };
        // temp for debugging
        views.wall = fs.readFileSync(__dirname + '/views/wall.jade', 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        var renderWall = Jade.compile(views.wall, {locals: true});
        res.write(renderWall(data));
        res.end();    
      } else {
        // Wall doesn't exist => 404
        res.writeHead(404, {'content-type': 'text/html'});
        views.notFound = fs.readFileSync(__dirname + '/views/404.jade', 'utf8');
        var renderNotFound = Jade.compile(views.notFound, {locals: true});
        res.write(renderNotFound());
        res.end(); 
      }      
    });
  });
}));

server.use(connect.static(__dirname + '/static'));

server.listen(PORT);
console.log("now connected and listening on "+ PORT);

var pi = new PushIt(server, options);

pi.onConnectionRequest = function(agent){
  agent.connected();
  console.log('connected agent: ' + agent.id);
}

pi.onSubscriptionRequest = function(channel, agent){
  agent.subscribe(channel);
}

pi.onPublicationRequest = function(channel, agent, message){  
  var channelType = String(channel.name).split("/")[1];
  var channelId = String(channel.name).split("/")[2];

  switch(channelType) {
    case 'wall' : 
      var wallId = channelId;
      var data = message.data;
      var action = message.data.action;
      
      switch (action) {
        case 'newCard' :
          var card = new Card(database);
          var newCard = data.card;
          console.log(data.card);
          card.create(newCard.id, wallId, newCard.title, newCard.position);
            channel.publish(message);
            agent.publicationSuccess(message);
          break;
          
        case 'moveCard' :
          var card = new Card(database);      
          card.updatePosition(data.card.id, data.card.position);
          channel.publish(message);
          agent.publicationSuccess(message); //received but don't echo out
          break;
          
        case 'updateText' :
          var card = new Card(database);
          var newText = data.card.title;
          
          card.updateTitle(data.card.id, data.card.title);
          channel.publish(message);
          agent.publicationSuccess(message); //received but don't echo out
          break;
        case 'updateCard' :
          // nothing
          break;
          
        case 'sync' :
          database.lrange("wall:"+wallId+":cards", 0, -1, function (err, cardIds) {
            for (i in cardIds) {
              var card = new Card(database);

              card.load(cardIds[i], function () {
                agent.send({
                  channel: channel.name,
                  data: {
                    agentId: "server",
                    channel: channel.name,
                    data: {
                      action: "updateCard",
                      card: card.data
                    }
                  }
                });
              });
            }
          });
            
          agent.publicationSuccess(message); //received but don't echo out
          break;
      default:
        channel.publish(message);
        agent.publicationSuccess(message);
    }
  }
}

pi.onDisconnect = function(agent){
  console.log("disconnected agent: " + agent.id);
}

