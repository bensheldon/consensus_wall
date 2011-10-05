// don't define this.database
// assume this.database object;

var Card = function(database){
  this.database = database;
};

Card.prototype = {

  data: {
    id: null,
    wallId: null,
    created: null,
    title: null,
    imagePath: null,
    position: null
  },
  
  create: function(id, wallId, title, imagePath, position){
    // create a new wallID (should probably check that it doesn't already exist)
    (id || (id = UUID(10, 64)));
    var card = this.data;
    
    card.id = id;
    card.wallId = wallId;
    card.created = String(Math.round(new Date().getTime() / 1000));
    
    if (typeof imagePath === "undefined") {
      delete card.imagePath;
    }
    else {
      card.imagePath = imagePath;
    }
    
    if (typeof title === "undefined") {
      delete card.title;
    }
    else {
      card.title = title;
    }
    
    card.position = position;
      
    // save it to the this.database
    this.database.hmset("card:" + card.id, card);
    this.database.rpush("card:all", card.id);
    this.database.rpush("wall:" + card.wallId + ":cards", card.id);
  },
  
  load: function(id, callback) {
    var self = this;
    
    //try to load the card
    this.database.hgetall("card:" + id, function (err, card) {
      if (card.id != undefined) {
        self.data = card;
        callback(self);
      }
      else {
        callback(self); // return the empty object
      }
    });
  },
  
  updateTitle: function(id, title){
    this.database.hmset("card:" + id, {
      title: title
    });
  },
  
  updatePosition: function(id, position){
    this.database.hmset("card:" + id, {
      position: position
    });
  }
};

module.exports = Card;

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