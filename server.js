var PORT = 57953;

var PushIt = require ('push-it').PushIt,
    fs = require('fs'),
    connect = require('connect'),
    sys = require('sys'),
    Jade = require('jade'),
    redis = require('redis'),
    formidable = require('formidable');


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
  
  server.post('/upload', function(req, res, next){
    var form = new formidable.IncomingForm(),
        files = [];
    form.uploadDir = "./uploads/images/tmp";
    form
      .on('file', function(field, file) {
        if (file.size > 1) {
          var extension = (/[.]/.exec(file.name)) ? /[^.]+$/.exec(file.name) : undefined;
          var filename = UUID(10, 64) + '.'+ extension;
          fs.renameSync(file.path, "./uploads/images/"+ filename);
          files.push("/images/"+ filename);
        }
      })
      .on('end', function() {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(JSON.stringify(files));
        res.end();   
      });
    form.parse(req);
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
server.use(connect.static(__dirname + '/uploads'));


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
          card.create(newCard.id, wallId, newCard.title, 
                      newCard.imagePath, newCard.position);
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
          console.log("Sync: " + wallId);
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

/**
 * 
 */ 
var UUID = function(len, radix) {
  var BASE64CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''); 
  var chars = BASE64CHARS, uuid = [], i=0;
  radix = radix || chars.length;
  len = len || 22;

  for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
  return uuid.join('');
};
