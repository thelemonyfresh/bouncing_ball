/*bouncing_ball.js -- A simple bouncing ball app by Daniel Porter.

This app implements the following specification:

- Display a round ball within the browser’s frame using browser native SVG.
- Allow the ball size to be adjusted via a control in the lower right corner 
    of the window.
- Let the user set the ball in motion with the mouse (here implemented using 
    mousedown-drag-mouseup scheme).
- Uses the window edges to contain the ball - i.e. when the ball encounters 
    a window edge, it bounces off and continues its motion.

It also implements additional features:

- Multiple balls: adding new balls with a button and choosing which one the 
    ball-size slider controls with a "select" element.
- Gravity in the vertical direction, pointed downwards.
- Fluid resistance, following a simple model where deceleration is 
    proportional to the square of velocity times the cross-sectional "area"
    (here the ball diameter d), giving component accelerations of 
    Ax = Vxf-Vxi = - Vtot * Vx * d * const.
- Inifinite Improbability Drive: will produce unexpected results.

*/

// Initialize mouse position variables:
var mouse_x;
var mouse_y;

// Assign html elements:
var svg = document.getElementById("main_svg");
var ball_selector = document.getElementById("ball_selector");
var ball_size_range = document.getElementById("ball_size_range");

// Create container for Balls:
var balls = []

// Track mouse position:
document.addEventListener("mousemove", function(event){
    mouse_x = event.pageX;
    mouse_y = event.pageY;
});

// Once SVG loaded, initialize first ball and begin animation:
svg.addEventListener("load",function(){
    add_ball();
    setInterval(advance_frame,25);
});

	     
var Ball = function(pos_x, pos_y, rad){
    /* Container for Ball objects.
       
       Parameters:
       pos_x: initial x position, zero on left-hand side of window frame.
       pos_y: initial y position, zero on top of window frame.
       rad: initial radius of ball in px.

       Methods:
       start_drag: starts dragging this Ball, called on "mousedown" event fired on this element.
       stop_drag: releases this Ball, called on "mouseup" event or when dragged over an edge.

      */

    // Velocity in horizontal (x) and vertical (y) coordinates:
    this.vel_x = 0;
    this.vel_y = 0;

    // SVG "circle" element displaying this Ball:
    this.elem = document.createElementNS("http://www.w3.org/2000/svg","circle");
    
    // Initialize SVG element attributes
    this.elem.setAttribute("cx",pos_x);
    this.elem.setAttribute("cy",pos_y);
    this.elem.setAttribute("r", rad);
    this.elem.setAttribute("fill", "blue");
    svg.appendChild(this.elem);
    
    // Contains "DragState" object if this Ball is being dragged:
    this.drag_state = null;

    this.start_drag = function(){
	
	// Zero velocity so this ball is no longer animnated:
	this.vel_x = 0;
	this.vel_y = 0;

	// Start dragging this ball by assigning a new "DragState" object. 
	// Pass x and y "offets", the distance from the mouse cursor to the center of the Ball.
	this.drag_state = new DragState(
	    mouse_x - parseInt(this.elem.getAttribute("cx")),
	    mouse_y - parseInt(this.elem.getAttribute("cy"))
	);	
    }

    this.stop_drag = function(){

	// Update this Ball's velocity to the latest mouse velocity:
	this.vel_x = this.drag_state.vel_x;
	this.vel_y = this.drag_state.vel_y;

	// Reset drag_state:
	this.drag_state = null;
    }

    // Handle click events on this Ball object:
    this.handleEvent = function(event) {
	switch(event.type) {
	    case 'mousedown':
	        this.start_drag();
	        break;
	     case 'mouseup':
	        this.stop_drag();
	        break;
	}
    }

    // Add listeners for mousedown and mouseup events on this Ball object:
    this.elem.addEventListener("mousedown",this,false);
    this.elem.addEventListener("mouseup",this,false);
}


var DragState = function(offset_x,offset_y){
    /* Contains information about Ball's state (offset, velocity) when dragged.

       Parameters:
       offset_x: horizontal distance between center of Ball and mouse pointer.
       offset_y: vertical distance between center of Ball and mouse pointer.

       Methods:
       update_velocity: update the velocity with which the mouse drags this Ball.

      */

    this.offset_x = offset_x;
    this.offset_y = offset_y;
    
    // Velocity of mouse pointer between previous and current frame.
    this.vel_x = 0;
    this.vel_y = 0;
  
    // Position of mouse pointer in previous frame:
    this.pos_x = 0 ;
    this.pos_y = 0 ;
  
    // Update drag velocity using mouse displacement between previous and current frames:
    this.update_velocity = function (new_x, new_y){
	this.vel_x = new_x - this.pos_x
	this.vel_y = new_y - this.pos_y

	this.pos_x = new_x;
	this.pos_y = new_y;
    };
}

function add_ball(){
    /* Create a new ball and add it to the page. */

    // Default position in middle of page, Ball radius of 20.
    balls.push(new Ball(svg.width.animVal.value / 2, 
			svg.height.animVal.value / 2,
			20));

    // Update ball selector with option for new Ball:
    var new_option = document.createElement("option");
    new_option.text = balls.length;
    new_option.value = balls.length;
    ball_selector.add(new_option);
    select_ball(new_option.value);
}

function select_ball(ball_num){
    /* Update page content, Ball objects to reflect change of "selected" Ball. */

    // Ensure ball_selector is set to correct value:
    ball_selector.value = ball_num;

    // Update ball_size_range slider to radius of currently selected Ball:
    ball_size_range.value = parseInt(balls[ball_num - 1].elem.getAttribute("r"));

    // Clear 'highlight" formatting from all Balls:
    for (i=0; i < balls.length; i++){
	balls[i].elem.removeAttribute("stroke");
	balls[i].elem.removeAttribute("stroke-width");
    }

    // Highlight currently selected Ball with red outline
    balls[ball_num - 1].elem.setAttribute("stroke","red");
    balls[ball_num - 1].elem.setAttribute("stroke-width","4");
}

function advance_frame(){
    /* Advances animation by one frame.
       
       Perform calculations to obtain changes in velocity (gravity, fluid resistance),
           position (ball velocity movement, mouse drag movement), and update svg and Ball 
           objects with results. 
    */

 
    for (i=0; i<balls.length; i++){

	// Calculate effect of gravitational acceleration on y-component of velocity for 
	//     non-dragged Balls:
	if (document.getElementById("gravity_checkbox").checked == true){
	    if (balls[i].drag_state == null){
		balls[i].vel_y += 1;
	    }
	}
	
	// Calculate effect of fluid resistance on velocity components of non-dragged Balls.
	//     This uses a crude approximation for fluid resistance where deceleration is 
	//     proportional to the square of velocity times the cross-sectional "area",
	//     here the ball diameter d.
	//
	//     Thus, component velocity change is given by: 
	//     x_accel = Vxf-Vxi = - Vtot * Vx * d * const
	if (document.getElementById("resistance_checkbox").checked == true){
	    if (balls[i].drag_state == null){
		
		// Compute x_accel and y_accel velocity changes based on model:
		var x_accel = Math.round(
		    Math.sqrt(Math.pow(balls[i].vel_y, 2) + Math.pow(balls[i].vel_x,2))  
			* balls[i].vel_x * 0.0002 * parseInt(balls[i].elem.getAttribute("r")));
		var y_accel = Math.round(
		    Math.sqrt(Math.pow(balls[i].vel_y, 2) + Math.pow(balls[i].vel_x,2))
			* balls[i].vel_y * 0.0002 * parseInt(balls[i].elem.getAttribute("r")));

		// Compensate for discreet model error occurring if velocity change in a given 
		//     step is greater than the actual velocity; zero velocity component if 
		//     this is the case, otherwise update the velocities:
		if (x_accel > Math.abs(balls[i].vel_x)) {balls[i].vel_x = 0;}
		else {balls[i].vel_x -= x_accel}
		if (y_accel > Math.abs(balls[i].vel_y)) {balls[i].vel_y = 0}
		else balls[i].vel_y -= y_accel
	    }
	}

	// Update Ball position given position and velocity:
	balls[i].elem.setAttribute("cx",
				   parseInt(balls[i].elem.getAttribute("cx"))
				   + balls[i].vel_x);
	balls[i].elem.setAttribute("cy",
				   parseInt(balls[i].elem.getAttribute("cy")) 
				   + balls[i].vel_y);
	
	// Update Ball if it is being dragged:
	if (balls[i].drag_state != null){	    
	    
	    // Update position relative to current mouse position:
	    balls[i].elem.setAttribute("cx",mouse_x 
				       - balls[i].drag_state.offset_x);
	    balls[i].elem.setAttribute("cy",mouse_y
				       - balls[i].drag_state.offset_y);
	    
	    // Update velocity of Ball's DragState based on current mouse position:
	    balls[i].drag_state.update_velocity(mouse_x,mouse_y);
	}

    }

    // Handle Ball collisions after this frame's updates:
    handle_collisions();
}

function handle_collisions(){
    /* Detect and handle ball/wall collisions for all balls. */
    for (i=0; i<balls.length; i++){

	// Horizontal wall collisions:

	if (parseInt(balls[i].elem.getAttribute("cx")) 
	    - parseInt(balls[i].elem.getAttribute("r")) <= 0)
	{
	    // Release dragged Balls:
	    if (balls[i].drag_state != null) balls[i].stop_drag();

	    // Reverse Ball velocity:
	    balls[i].vel_x = -balls[i].vel_x;

	    // Move Ball just inside wall (prevent misbehaviour if Ball velocity
	    //     is high or ball radius is changed near a wall):
	    balls[i].elem.setAttribute("cx", 1 + parseInt(balls[i].elem.getAttribute("r"))); 
	}
	if (parseInt(balls[i].elem.getAttribute("cx")) 
	    + parseInt(balls[i].elem.getAttribute("r")) >= svg.width.animVal.value)
	{
	    if (balls[i].drag_state != null) balls[i].stop_drag();
	    balls[i].vel_x = -balls[i].vel_x;
	    balls[i].elem.setAttribute("cx", svg.width.animVal.value - 1
				       - parseInt(balls[i].elem.getAttribute("r")));
	}
	
	// Vertical wall collisions:

	if (parseInt(balls[i].elem.getAttribute("cy")) 
	    - parseInt(balls[i].elem.getAttribute("r")) <= 0)
	{
	    if (balls[i].drag_state != null) balls[i].stop_drag();
	    balls[i].vel_y = -balls[i].vel_y;
	    balls[i].elem.setAttribute("cy", 1 + parseInt(balls[i].elem.getAttribute("r")));
	}
	
	if (parseInt(balls[i].elem.getAttribute("cy")) 
	    + parseInt(balls[i].elem.getAttribute("r")) >= svg.height.animVal.value)
	{
    	    if (balls[i].drag_state != null) balls[i].stop_drag();
	    balls[i].vel_y = -balls[i].vel_y;
	    balls[i].elem.setAttribute("cy", svg.height.animVal.value - 1
				       - parseInt(balls[i].elem.getAttribute("r")));

	}
    }
}

function infinite_improbability_drive(){
    /*
      "The infinite improbability drive is a wonderful new method of crossing interstellar 
          distances in a mere nothingth of a second, without all that tedious mucking about 
          in hyperspace." -- Hitchhiker's Guide to the Galaxy
      */
    
    // Activate infinite improbability drive for all balls:
    for (i=0; i<balls.length; i++){
	balls[i].elem.setAttribute("fill", "#" 
				   + rdm_hex_pair() + rdm_hex_pair() + rdm_hex_pair());
	balls[i].elem.setAttribute("cx",
				   Math.round(Math.random() * svg.width.animVal.value));
	balls[i].elem.setAttribute("cy",
				   Math.round(Math.random() * svg.height.animVal.value));
	balls[i].elem.setAttribute("r",
				   (Math.round(Math.random() * 145) + 5));
	balls[i].vel_x = Math.round(Math.random() * 50);
	balls[i].vel_y = Math.round(Math.random() * 50);
    }

    // Generate a random hexadecimal value pair as a string:
    function rdm_hex_pair(){
	var pair =  Math.floor(Math.random() * 256).toString(16);
	if (pair.length < 2){
	    pair = "0" + pair
	}
	return pair;
    }
    
    // Call select_ball to reset the ball_size_range slider for selected Ball:
    select_ball(ball_selector.value);
}
