/*
 *	GENESIS Application
 *	FormUtils.js
 *
 *	Copyright (c) 2010-2013 Ventus Networks, LLC | GENESIS Team
 *
 *	Form utilities, including managing tabbing through multi-column forms
 *
 *	maintained by Tom Marra, tmarra@ventusnetworks.com
 *
 *	https://genesis.ventusnetworks.com
 */

define([
     'require'
    ,'jquery'
    ,'underscore'
    ,'amplify'
], function( require) {

    var $ = require('jquery'),
        _ = require('underscore'),
        amplify = require('amplify'),
        ko = require('knockout');
        
    function FormUtils() {
        var self = this;
        
        var iSelects = [];
        var xForm; //hack to refer to this object if a function call is passed without defining a form to edit
        var inputs; //hack to handle select 2
        
        var logging = false; //turns module logging on and off
        
        self.initFocusController = function( form ) {
            var form = $( form );
            xForm = $(form);
            
            //prevents this class form editing non focus controlled forms
            if( form.attr( 'data-focus-controlled' ) ){
                self.getInputs( form );
                self.createOrdering( form );
                self.removeFromPageFlow();
                self.setInOutPoints( form );
                form.attr( 'data-focus-edited', true );
                self.logEls( '%O', iSelects );
            }
        };
        
        self.createOrdering = function( form ){
        	var type = form.data( 'focusControlled' );
        	
            if( type === 'columns' ){
                self.orderCols( form );
            }
            //other conditional rules and functions to add data attr formPos can be added here
            self.setInputs( form );
        }
        
        self.orderCols = function( form ){
            var cols = {};
            var elItter = 1;
            var colsLength = 0;
            
            $.each(inputs, function(){
                if( $( this ).attr( 'data-column' ) ){
                    var col = 'col' + $( this ).data( 'column' );
                    if(!cols[col]){
                        cols[col] = [];   
                        colsLength += 1;                     
                    }
                    cols[col].push( $( this ) );
                }
            });
            
            for( var i = 1; i <= colsLength; i += 1 ){
                var currentCol = 'col'+ i;
                for( var j = 0; j < cols[currentCol].length; j += 1 ){
                    $(cols[currentCol][j]).attr( 'data-form-pos', elItter );
                    elItter += 1;
                };
            };
            
        };
		
		self.getInputs = function( form ){
			self.logEls('fire getInputs');
			var rawInputs = $( ':input', form );
			var containers = []; // holds the select eles for select2 TODO: push global for cleanup or something also realized this is useful for vision 
			var finalInputs = []; //holds the items that become the inputs array
			
			for(var i=0; i < rawInputs.length; i++){
				var item = rawInputs[i];
				if( $(item).data('formControl') !== 'ignore'){
					if( $(item).is( 'select' ) && $( item ).siblings( 'div .select2-container' ).children( '.select2-focusser' ).is( 'input' ) ){
	                    var itemX = $( item ).siblings( 'div .select2-container' ).children( '.select2-focusser' );
	                    //move form data-col to the focuser
	                    if( $( item ).attr( 'data-column' ) ){
	                    	var col = $( item ).data( 'column' );
	                    	itemX.attr( 'data-column', col );
	                    }
	                }else{
	                	finalInputs.push( item );
	                }
               }
			}
			
			inputs = finalInputs;
		};
		        
        self.setInputs = function( form ){
        	self.logEls('fire setInputs');
            var holdingPen = {};
            var orderRay = [];
            
            $.each(inputs, function( index ){
                var formPos = $( this ).data( 'formPos' );
                
                if( formPos !== undefined ){
                    holdingPen[formPos] = $( this );
                    orderRay.push(formPos);
                };//currently leaves inputs with no formPos out of focus control
            });    
            
            orderRay.sort( function( a,b ){return a-b} );
                
            for(var i=0; i < orderRay.length; i++){
                //has to convert num to string
                var string = String( orderRay[i] );
                var item = holdingPen[string];
                
            	formPosSetter( item );
            };
            
            function formPosSetter( node ){
            	//change the formPos to the index
                $( node ).data( 'formPos', i );
                
                $( node ).on( 'keydown.FocusController', {item: $(node)}, self.focusWatch );
                
                iSelects.push( node );
            };
        };
        
        
        self.focusWatch = function( evt ){
            var myindex = $( evt.data.item ).data( 'formPos' ) +1 ;
            var eleAmount = iSelects.length;
            var e = event || evt; // for trans-browser compatibility
            var charCode = e.which || e.keyCode; // for trans-browser compatibility
            
            function visibleLoop( inc ){//pass the pos or neg 1 and it skips hidden elements inline
                var targetIndex = myindex + inc;
                var targetEle = $( xForm ).find( "[data-form-pos='"+ targetIndex +"']" );
                
				if( targetEle.length == 1){
                    if( self.vision(targetEle) ){
                       targetEle.focus(); 
                       e.preventDefault();
                       e.stopImmediatePropagation();
                    }else{
                    	self.logEls('item '+ targetIndex + " is out of bounds")
                        if(inc > 0){
                            var incrementedInc = inc+1;
                        }else{
                            var incrementedInc = inc-1;
                        }                                   
                        visibleLoop( incrementedInc );
                    };     
                };
            };
                        
            if( charCode === 9 ){
                if ( e.shiftKey ) {
                    if( myindex !== 0 ){
                        visibleLoop( -1 );                       
                    };
                }else if( myindex !== eleAmount - 1 ){
                    visibleLoop( 1 );
                };
            };
        };
        
        self.vision = function( target ){
        	 if( target.is(':visible') && target.css( 'visibility' ) !== 'hidden' || target.hasClass( 'select2-focusser' ) || target.is(':radio') ){
                 return true;
             }else return false;
        };//TODO: write separate functions to determine if exceptions for select2 and radio element parents are hidden
        
        self.removeFromPageFlow = function(){
            $( iSelects ).each( function(){
                $( this ).attr( 'tabindex', -1 );
            });
        };
        
        self.returnToPageFlow = function(){
            $( iSelects ).each(function(){
                $( this ).removeAttr( 'tabindex' );
            });
        };
        
        self.setInOutPoints = function( form ){
            var visibleEls = []
            
            $(iSelects).each(function(){
                if( self.vision( $( this ) ) ){
                    visibleEls.push( $( this ) );
                };
            });
            
            if( visibleEls.length >= 1 ){
                $( visibleEls[0] ).attr( 'tabindex', 0 );
                if( visibleEls.length > 1 ){
                    $( visibleEls[visibleEls.length-1] ).attr( 'tabindex', 0 );
                }
                self.logEls( visibleEls.length + ' visible form elements' );
            }else self.logEls( 'No visible elements in tabcontrolled form!' );
        };
        
        self.unBindAll = function(){
            $( iSelects ).each( function(){
                $( this ).off( '.FocusController' );
                $( this ).removeAttr( 'data-form-pos' );
                $( this ).removeData();
            });
        };
        
        self.update = function( form ){ //needs to be called in somehow
        	self.logEls('update Fired!');

            var form = form || xForm;
            form = $( form );
			
			//detach
            self.unBindAll();
            iSelects = [];
            inputs = [];
			
			//reattach
            self.getInputs( form );
            self.createOrdering( form );
            self.removeFromPageFlow();
            self.setInOutPoints( form );
            self.logEls( '%O', iSelects );
        };
        
        self.removeColOrder = function(){
            $.each(inputs, function(){
                $( this ).removeAttr( 'data-form-pos' );
            });
        };
        
        self.destroyFocusController = function( form ){
            var form = form || xForm;
            if(form !== undefined){
                if( form.attr( 'data-focus-edited' ) && form.data( 'focusEdited' ) === true ){
                    
                    var type = form.data( 'focusControlled' );
                    
                    if( type === 'columns' ){
                        self.removeColOrder( form );
                    }//other conditional rules and functions to add data attr formPos can be added here
                    self.returnToPageFlow();
                    self.unBindAll();
                    iSelects = [];
                    form.removeAttr( 'data-focus-edited' );
                }//else don't destroy the focus controller, because this form didn't have the data el to have anything done to it in the first place
            };
        };
        
        self.selectFirstEl = function (){
        	
        }
        
        self.logEls = function( message, object ){
        	if(logging === true){
        		if(!object){
		        	console.log( message );
        		}else{
        			console.log( message, object );
        		}
        	}
        };
    }
    
    return FormUtils;
});