$(function() {
	
	//assuming a single wall
	var wall = $("ul.wall").attr('id'); // #wall-{ID}
	var wallId = wall.split("-")[1];
	wall = "ul#" + wall; // for retrieving the element
  var channel = "/wall/" + wallId;
  
  console.log("Channel: " + channel);
  
  var connectionOptions = {
  	channels: [channel],
  	credentials: 'It is meeee!'
  }
  
  window.pushIt = new PushIt(connectionOptions);
  
  function onError(data){
    console.log("ERROR!");
  }
  
  function onSuccess(data){
  	//console.log("Success");
    //console.log("SENDING: SUCCESS CONFIRMATION RECEIVED");
  }
  
  sendMessage = function(data) {
    window.pushIt.publish({
    	channel: channel,
    	data: data,
    }, onError, onSuccess);
  }  
  
  
  $('a#reconnect').click(function(event) {
  		event.preventDefault();
  		$(function() {
  			window.pushIt.initConnection(connectionOptions);
  		});
  });
  function reconnect() {

  	//window.pushIt.subscribe(channel, onSuccess, onError);
  }
  
  function syncSend() {
		$(wall + ' li.card').each(function() {
			var card = $(this);
			sendMessage({
				action: 'updateCard',
				id: card.attr('id'),
				position: card.position(),
				title: card.find('textarea').val()
			});
		});
  }
  
  pushIt.onMessageReceived = function(message){
    if (message.data.agentId !=  window.pushIt.agentId) {
  	  switch(message.channel) {
  	    case '/meta/subscribe' : 
  	      // Have success message
  	      console.log('Connected to channel');
  	      $(function() {
  	        sendMessage({action: 'sync'});
  	        //syncSend();
  	      });
  	      break;
  	    
  	    case channel :
  	      var action = message.data.data.action;
  	      var data = message.data.data;
  	      switch (action) {
  	        case 'newCard' :
  	          cardSet.newCardFromRemote(data);
  	        break;
  	        case 'moveCard' :
    	        $('#card-'+data.card.id).animate({
    	          top: data.card.position.split(',')[1],
    	          left: data.card.position.split(',')[0]
    	        }, 0);
  	        break;
  	        case 'updateText' :
  	          $('#card-'+data.card.id).find('textarea').val(data.card.title);
  	        break;
  	        case 'updateCard' :
  	          if ( $('#card-'+data.card.id).length == 0) {
  	            //doesn't yet exist
  	            cardSet.newCardFromRemote(data);
  	          }
  	          else {
  	            // card exists
  	            $('#'+data.card.id).find('textarea').val(data.title);
  	            $('#'+data.card.id).animate({
  	              top: data.card.position.split(',')[1],
  	              left: data.card.position.split(',')[1]
  	            }, 0);
  	          }
  	          break;
  	      }
      }
    }
  
  };


  var cardSet = new CardSet();
  cardSet.init();
  cardSet.newCardInHand();
  cardSet.newCardInHand();
  cardSet.newCardInHand();
  
  $('a#newCard').click(function(event) {
  		event.preventDefault();
  		cardSet.newCardInHand();
  });
  
  function CardSet() {
    var myCount = 0;
    
    this.init = function() {
      // set up the drop point
      $(wall).droppable({
        accept: 'li.card',
        hoverClass: 'hovered',
        drop: this.dropCard
      });
      // make any existing cards draggable
      $(wall + " li.card")
        .draggable( {
              containment: wall,
              helper: 'clone',
              cursor: 'move',
              start: this.draggableStart,
              drag: this.draggableDrag,
              stop: this.draggableStop
        });   
      
      // setup typing 
      $(wall).delegate('li textarea', 'keyup', function() {
         var card = $(this).parent();
         sendMessage({
           action: 'updateText',
           card: {
						 id: card.attr('id').split('-')[1],
						 title: card.find('textarea').val()
					 }
         });
      });    
    }
    
    this.createCardHtml = function( id, title ) {      
      if (id == undefined) {
        id = window.pushIt.agentId + myCount++;
      }
      
      if (title == undefined) {
        title = '';
      }
      
      var html = '<li id="card-'+id+'" class="card">'
               +   '<textarea>' + title + '</textarea>'
               + '</li>';
      return html;
    }
    
    this.newCardInHand = function() {  
      $(this.createCardHtml())
        .prependTo('ul#hand')
        .draggable( {
              containment: '#content',
              appendTo: wall,
              helper: 'clone',
              cursor: 'move',
              revert: true,
              start: this.draggableStart,
              stop: this.draggableStop
        });   
    }
    
    this.draggableStart = function(event, ui) {
        $(this).css('opacity', 0);
        // set the textarea (for some reason they
        // aren't visible when dragging unless
        // text() is set to val()
        var text = $(this).find('textarea').val()
        $(this).find('textarea').text(text);
        ui.helper.find('textarea').text(text);
    }
    
    this.draggableDrag = function(event,ui) {
    	var card = $(this);
    	var helper = $(ui.helper);
    	var position = helper.position(); // b/c we're moving the helper
    	
      sendMessage({
        action: 'moveCard',
        card: {
          id: card.attr('id').split('-')[1],
          position: position.left + ',' + position.top
        }
      });
    };
    
    this.draggableStop = function(event, ui) {
      $(this).css('opacity', 1);
    }
    
    /**
     *  Callback for droppable on #wall
     */
    this.dropCard = function(event, ui) {
      var self = this;
      var card = $(ui.draggable);
      var cardId = card.attr('id').split('-')[1];
      var action = 'moveCard';
      
      // if not on a .wall, must add it
      if (!(card.parent().hasClass("wall"))) {
        action = 'newCard';
        card.appendTo(wall);
        card.draggable( 'option', 'revert', false ); 
        card.draggable( 'option', 'containment', wall );
        card.draggable( 'option', 'drag', this.draggableDrag);
      }
      // change the position of the draggable to the
      // position of the helper (which is relative to the 
      // proper parent e.g. #wall)
      card.position({
        of: wall,
        at: 'left top',
        my: 'left top',
        offset: ui.position.left + ' ' + ui.position.top
      });
      var position = card.position();

      sendMessage({
        action: action,
        card: {
					id: cardId,
					title: card.find('textarea').val(),
					position: position.left + ',' + position.top
				}
      });
    }
    
    this.newCardFromRemote = function(data) {
      var card = data.card;
      $(this.createCardHtml(card.id, card.title))
        .appendTo(wall)
        .position({ //have it fly in from the top-center
          of: wall,
          at: 'center top',
          my: 'center top',
          offset: '0 0'
        })
        .animate({
          left: data.card.position.split(",")[0],
          top: data.card.position.split(",")[1]
        }, 1500)
        .draggable({
              containment: wall,
              helper: 'clone',
              cursor: 'move',
              start: this.draggableStart,
              drag: this.draggableDrag,
              stop: this.draggableStop
        });
    }

  }
});
