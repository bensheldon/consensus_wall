$(function() {
	
	//assuming a single wall
	var wall = $("ul.wall").attr('id'); // #wall-{ID}
	var wallId = wall.split("-")[1];
	wall = "ul#" + wall; // for retrieving the element
  var channel = "/wall/" + wallId;
  
  console.log(channel);
  
  var successful = [];
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
				text: card.find('textarea').val()
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
    	        $('#'+data.card.id).animate({
    	          top: data.card.position.top,
    	          left: data.card.position.left
    	        }, 0);
  	        break;
  	        case 'updateText' :
  	          $('#'+data.card.id).find('textarea').val(data.card.text);
  	        break;
  	        case 'updateCard' :
  	          if ( $('#'+data.card.id).length == 0) {
  	            //doesn't yet exist
  	            cardSet.newCardFromRemote(data);
  	          }
  	          else {
  	            // card exists
  	            $('#'+data.id).find('textarea').val(data.text);
  	            $('#'+data.id).animate({
  	              top: data.position.top,
  	              left: data.position.left
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
      var that = this;
      // set up the drop point
      $(wall).droppable({
        accept: 'li.card',
        hoverClass: 'hovered',
        drop: this.repositionCard
      });
      
      // make any existing cards draggable
      $(wall + " li.card")
        .draggable( {
              containment: '#wall',
              helper: 'clone',
              cursor: 'move',
              start: this.draggableStart,
              drag: this.draggableDrag,
              stop: this.draggableStop
        });   
      
      $(wall).delegate('li textarea', 'keyup', function() {
         var card = $(this).parent();
         sendMessage({
           action: 'updateText',
           card: {
						 id: card.attr('id'),
						 text: card.find('textarea').val()
					 }
         });
      });    
    
    }
    
    this.createCardHtml = function( id, textarea ) {
      var that = this;
      
      if (id == undefined) {
        id = 'card-' + window.pushIt.agentId + '-' + myCount++;
      }
      if (textarea == undefined) {
        textarea = '';
      }
      
      var html = '<li id="'+id+'" class="card">'
               +   '<textarea>' + textarea + '</textarea>'
               + '</li>';
      return html;
    }
    
    this.newCardInHand = function() {
      var that = this;
      
      $(this.createCardHtml())
        .prependTo('ul#hand')
        .draggable( {
              containment: '#content',
              appendTo: wall,
              helper: 'clone',
              cursor: 'move',
              revert: true,
              start: this.draggableStart,
              drag: this.draggableDrag,
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
      sendMessage({
        action: 'moveCard',
        card: {
					id: card.attr('id'),
					position: helper.position()
				}
      });
    }
    
    this.draggableStop = function(event, ui) {
      $(this).css('opacity', 1);
      var card = $(this);
      
      sendMessage({
        action: 'moveCard',
        card: {
					id: card.attr('id'),
					position: card.position(),
					text: card.find('textarea').val(),
				}
      });
        
    }
    
    /**
     *  Callback for droppable on #wall
     */
    this.repositionCard = function(event, ui) {
      var card = $(ui.draggable);
      var action = 'repositionCard';
      console.log(wall);

      
      
      // if not on a .wall, must add it
      if (!(card.parent().hasClass("wall"))) {
        action = 'newCard';
        card.appendTo(wall);
        card.draggable( 'option', 'revert', false ); 
        card.draggable( 'option', 'containment', wall );
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

         
      sendMessage({
        action: action,
        card: {
					id: card.attr('id'),
					position: card.position(),
					text: card.find('textarea').val()
				}
      });
    }
    
    this.newCardFromRemote = function(data) {
      
      $(this.createCardHtml(data.card.id, data.card.text))
        .appendTo(wall)
        .position({ //have it fly in from the top-center
          of: wall,
          at: 'center top',
          my: 'center top',
          offset: '0 0'
        })
        .animate({
          top: data.card.position.top,
          left: data.card.position.left
        }, 1500)
        .draggable( {
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

    










