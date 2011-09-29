var PORT = 57953;

var PushIt = require ('push-it').PushIt,
    fs = require('fs'),
    connect = require('connect'),
    //express = require('express'),
    sys = require('sys'),
    redis = require('redis');

try{
   var options = JSON.parse(fs.readFileSync(__dirname+"/options.json"))  
}catch(e){
   console.error("Could not load the options file!: ", e.toString());
   process.exit()
}

// Connect to the database
var database = redis.createClient();
database.auth(options.databaseAuth);
database.on('error', function(err) {
    console.log('Error ' + err);
});
console.log("Database connected...");


var server = connect.createServer();
server.use(connect.static(__dirname + '/static'));

/** Load a wall **/
server.use(connect.router(function(server){
  server.get('/wall/:id', function(req, res, next){
    // populates req.params.id
/* 
    database.get('wall:'+ req.params.id, JSON.parse( obj ), function() {
            var msg = 'The snippet has been saved at <a href="/'+id+'">'+req.headers.host+'/'+id+'</a>';
            res.respond( msg );
          } );
 */

    
    
    res.writeHead(200, { 'Content-Type': 'text/plain' });
  	res.end('hello world');
  });
}));


function loadWall(req, res, next) {
  // You would fetch your user from the db
  var user = {name: 'ben'}
  if (user) {
    req.user = user;
    next();
  } else {
    next(new Error('Failed to load user ' + req.params.id));
  }
}

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
			var data = message.data
			var action = data.action;
			var wallId = channelId;
			console.log(action);

			switch (action) {
				case 'newCard' :
					database.set('card:'+ data.card.id, JSON.stringify( data.card ), function() {});
					database.rpush('wall:'+wallId+":cards", 'card:'+ data.card.id, function() {});
						console.log('saved card: ' + data.card.id);
						channel.publish(message);
						agent.publicationSuccess(message);
					break;
				case 'moveCard' :
					channel.publish(message);
					agent.publicationSuccess(message); //received but don't echo out
					break;
				case 'updateText' :
					break;
				case 'updateCard' :

					break;
				case 'sync' :
					database.lrange("wall:"+wallId+":cards", 0, -1, function (err, cardIds) {
						database.mget(cardIds, function (err, cards) {
							for (i in cards) {
								var card = JSON.parse(cards[i]);
								agent.send({
									channel: channel.name,
									data: {
										agentId: "server",
										channel: channel.name,
										data: {
											action: "newCard",
											card: card
										}
									}
								});
							}
						});
					});
					agent.publicationSuccess(message); //received but don't echo out
					break;
			}
	}
  

}

pi.onDisconnect = function(agent){
  console.log("disconnected agent: " + agent.id);
}
