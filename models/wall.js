var Wall = function(id){
  this.id = id;
  this.pushIt = pushIt;
  pushIt.channels[name] = this;
  this.onPublicationRequest = onPublicationRequest;
  this.onSubscriptionRequest = onSubscriptionRequest; 
} 


Wall.prototype = {
  name: "/null",
  pushIt: null,
  onSubscriptionRequest: undefined,
  onPublicationRequest: undefined,

  subscribe: function(agent){
    this.pushIt.subscribe( this, agent);
  },
  
  publish: function(src){
    var msg = {};
    Object.keys(src).forEach(function (prop) { msg[prop] = src[prop] })
    this.pushIt.publish( this, msg);
  }
};

module.exports = Wall;
