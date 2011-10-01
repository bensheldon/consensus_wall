$(function() {
  var channel = 'consensus-wall';
  var successful = [];
  
  function onError(data){
    console.log("ERROR!");
    console.log(data);
  }
  
  function onSuccess(data){
    //console.log("SENDING: SUCCESS CONFIRMATION RECEIVED");
  }
  
  
	window.pushIt = new PushIt({
		channels: [channel]
	});
	
	console.log('agentId: ' + window.pushIt.agentId);
	
	pushIt.onMessageReceived = function(message){
	  if (message.data.agentId !=  window.pushIt.agentId) {
  	  switch(message.channel) {
  	    case '/meta/subscribe' : 
  	      // Have success message
  	      console.log('Connected to channel');
  	      break;
  	    
  	    case channel :
  	      var action = message.data.data.action;
  	      var data = message.data.data;
  	      switch (action) {
  	        case 'newCard' :
  	          var generateCard = new Card().newCard(data.id);
  	          console.log(generateCard);
  	        break;
  	        case 'moveCard' :
    	        $('#'+data.id).position ({
    	          my : 'left top',
    	          of : '#wall',
    	          at : 'left top',
    	          offset : data.position.left + ' ' + data.position.top
    	        });
  	        break;
  	      }
	    }
	  }
	
	};


  function Card( id ) {
    var card = $(id);
    var text = card.find($('textarea').value);
    var parent = card.parent;  
    
    
    this.newCard = function( newID ) {
      card
        .clone(true, true)
        .insertAfter('#prototype')
        .attr('id', newID)
        .show()
        
    }
    
    
    /**
     * Callback for droppable #wall
     * Is called both when new card is added to #wall
     * And when card is moved on #wall
     */
    this.repositionOnWall = function(event, ui) {
            
    }
    
    this.addToWall = function(event, ui) {  
      //var helperPosition = ui.position();
      ui.draggable.draggable( 'option', 'revert', false ); 
      ui.draggable.draggable( 'option', 'containment', 'ul#wall' );
      
      // change the position of the draggable to the
      // position of the helper (which is relative to the 
      // proper parent e.g. #wall)
      ui.draggable.position({
        of: '#wall',
        at: 'left top',
        my: 'left top',
        offset: ui.position.left + ' ' + ui.position.top
      });
      
      // push the new card
      var newCard = ui.draggable;
      window.pushIt.publish({
      	channel: channel,
      	data: {
      	  action: 'newCard', 
      	  id: newCard.attr('id'),
      	  position: newCard.position(),
      	  text: newCard.find('textarea').val()
      	  }
        }, onError, onSuccess);
    }
  
    this.pushIt = function( id, action ) {
      window.pushIt.publish({
      	channel: window.pushIt,
      	data: {test: 'moved', position: '0 0'}
      }, onError, onSuccess);
    } 
  }

  $( init );
  
  function init() {
    var cards = 0;
  
    var card = new Card;
    var blankCard = new Card('ul#hand li#prototype');
    // use the agentID to try to keep cards unique
    blankCard.newCard('card-' + window.pushIt.agentId + '-' + cards++);
    
    // Create a clicker for generating new cards
    $(document).delegate('#newCard', 'click', function(event) {
    		event.preventDefault();
    		blankCard.newCard('card-' + cards++);
    });
    
    // set up the drop point
    $('ul#wall').droppable({
      accept: 'li.card',
      hoverClass: 'hovered',
      drop: card.repositionOnWall
    });
    
  }


});







