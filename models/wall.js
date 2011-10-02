var Wall = function(database){
  this.database = database;
} 

Wall.prototype = {
  id: null,
  database: null,
  pushIt: null,
  cards: [],
  title: null,

  create: function(id){
    // create a new wallID (should probably check that it doesn't already exist)
    (id || (id = UUID(10, 64)));
    this.id = id;
    
    // save it to the database
    this.database.hset("wall:" + this.id, "id", this.id);
    this.database.hset("wall:" + this.id, "title", "");
    this.database.hset("wall:" + this.id, "created", 
      String(Math.round(new Date().getTime() / 1000)));
    this.database.rpush("wall:all", "wall:" + this.id);
  },
  
  load: function(id, setLastAccess, callback) {
    var self = this;
    var database = this.database;
    
    setLastAccess || (setLastAccess = false);
    
    //try to load the Wall
    database.hgetall("wall:" + id, function (err, wall) {
    	if (wall.id != undefined) {
    	  self.id = wall.id;
    	  self.title = wall.title;
    	  
    	  if (setLastAccess) {
    	    database.hset("wall:" + this.id, "lastAccess", 
            String(Math.round(new Date().getTime() / 1000)));
    	  }
				// Load the wall's cards
				database.lrange("wall:"+self.id+":cards", 0, -1, function (err, cardIds) {
					database.mget(cardIds, function (err, cards) {
						for (var i in cards) {
							self.cards[i] = JSON.parse(cards[i]); // parse each card
						}
						callback(self);
    	    }); 
    	  });
      }
      else {
        callback(self); // return the empty object
      }
    });
  },
  
  publish: function(src){

  }
};

module.exports = Wall;

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
}