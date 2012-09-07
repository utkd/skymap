/*
	main.js
	Script to initialize data objects, load them on screen and register event handlers
*/

$(function(){
	var skyobjlist = fetchdata();
	setDefaults(true);
	registerHandlers();
	//Initialize the converter object
	var c = new Converter(skyobjlist);
	c.setLocation(getInputLatitude(), getInputLongitude());
	c.setViewTime(getInputTime());
	c.computePosition();
	
	//Create the draw surface
	var divElem = $("#skymap")[0];
	var paperPadding = 20;			//Extra space around the skymap
	var dimension = parseInt($("#skymap").css('width')) - paperPadding*2;
	var radius = dimension / 2;
	var paper = new Raphael(divElem, dimension+paperPadding*2, dimension+paperPadding*2);
	var centerX = dimension / 2 + paperPadding;
	var centerY = dimension / 2 + paperPadding;
	
	//Draw the grid and show the skymap with initial settings
	loadGrid(paper, centerX, centerY, radius, paperPadding);
	refreshSkymap(skyobjlist, paper, radius, centerX, centerY);
	
	//Update button even handler
	$("#update_btn").click(function() {
		c.setLocation(getInputLatitude(), getInputLongitude());
		c.setViewTime(getInputTime());
		c.computePosition();
		refreshSkymap(skyobjlist, paper, radius, centerX, centerY);
		clearDetails();
		return false;
	});
	
	//Reset button event handler
	$("#reset_btn").click(function() {
		c.setViewTime(new Date());
		setDefaults(false);
		c.computePosition();
		refreshSkymap(skyobjlist, paper, radius, centerX, centerY);
		clearDetails();
		return false;
	});
});

function refreshSkymap(skyobjlist, paper, radius, centerX, centerY){
	//Offset to display text related to sky objects
	var txtXoffset = 15;
	var txtYoffset = -15;
	
	//Display sky objects 
	for(var o in skyobjlist) {
		var currSkyObj = skyobjlist[o];
		var mappos = convertCoordinates(currSkyObj.az, currSkyObj.alt, radius);
		
		if(currSkyObj.elem){
			//If object is already drawn, recompute its position
			var elem = currSkyObj.elem;
			var elemtxt = currSkyObj.txtelem;
			elem.attr({ cx: centerX + mappos.x, cy: centerY - mappos.y});
			elemtxt.attr({ x: centerX + mappos.x + txtXoffset, y: centerY - mappos.y + txtYoffset});
		}
		else{
			//Else, create a new Circle object and assign in properties corresponding to its skyobject
			var screenObj = paper.circle(centerX + mappos.x, centerY - mappos.y, 3);
			var objText = paper.text(centerX + mappos.x + txtXoffset, centerY - mappos.y + txtYoffset, currSkyObj.id);
			objText.hide();
			currSkyObj.elem = screenObj;
			currSkyObj.txtelem = objText;
			
			var objColor = determineColor(currSkyObj.category, currSkyObj.objtype);
			screenObj.attr({fill: objColor, stroke: objColor, 'stroke-width': 1});
			objText.attr({stroke: '#ddd', 'stroke-width': 1, 'font-size': 14});
			screenObj.node.id = currSkyObj.id;	
			screenObj.data('objref', currSkyObj);
			
			//Add an event handler to the object. On click, display details in sidebar
			screenObj.click(function(){
				var this_skyobj = this.data('objref');
				$("#obj_name").text(this_skyobj.id);
				$("#alternate_name").text(this_skyobj.commonname);
				$("#obj_az").text(Math.round(this_skyobj.az*100)/100);
				$("#obj_alt").text(Math.round(this_skyobj.alt*100)/100);
				$("#obj_cat").text(this_skyobj.category);
				$("#obj_type").text(this_skyobj.objtype);
				$("#obj_size").text(this_skyobj.objsize);
				$("#obj_mag").text(this_skyobj.magnitude);		
			});
			
			screenObj.mouseover(function(){
				var this_skyobj = this.data('objref');
				this_skyobj.txtelem.show();
			});
			
			screenObj.mouseout(function(){
				var this_skyobj = this.data('objref');
				this_skyobj.txtelem.hide();
			});
		}
	}	
}

/*
	Function to convert altitude and azimuth to screen coordinates inside the grid
*/
function convertCoordinates(az, alt, altScale) {
		if(alt < 0) {
			return {x: -2*altScale, y: -2*altScale}; //Return a value that will be out of display	
		}
		else {
			var altCircleRadius = altScale - (alt * altScale / 90);
			var pointEdgeAngle = az + 90; //Incorporate the fact that Az is measured from North
			var xpos = altCircleRadius * Math.cos(pointEdgeAngle * Math.PI / 180);
			var ypos = altCircleRadius * Math.sin(pointEdgeAngle * Math.PI / 180);
			return {x: xpos, y: ypos};	
		}
}

/*
	Asynchronously get the sky object data
*/
function fetchdata(){
	var objectData = $.ajax({
				type: "GET",
				url: "objects.csv",
				dataType: "text",
				global: false,
				async:false,
				success : function(data) {
					return data;
				}
			}).responseText;
	
	var lines = objectData.split("\n");

	//Load data for each object
	var objlist = new Array();
	for(var str in lines) {
		var parts = lines[str].split(",");
		var skyobj = {
			id: parts[0],
			catalognum: parts[1],
			category: parts[2],
			objtype: parts[3],
			distance: parts[4],
			objsize: parts[5],
			magnitude: parts[6],
			ra: parseFloat(parts[7]),
			dec: parseFloat(parts[8]),
			constellation: parts[9],
			commonname: parts[10]
		}
		objlist.push(skyobj);
	}
	return objlist;
}

/*
	Function to create the sky grid
*/
function loadGrid(paper, cX, cY, rad, pad){
	var dim = rad * 2;
	//Create Grid Items
	var sphere = paper.circle(cX, cY, rad);
	var sphere45 = paper.circle(cX, cY, rad/2);
	var horAxis = paper.path("M0 "+cY+"L"+(dim+pad*2)+" "+cY);
	var verAxis = paper.path("M"+cX+" 0L"+cX+" "+(dim+pad*2));
	
	var gridItems = new Array();
	gridItems.push(sphere);
	gridItems.push(sphere45);
	gridItems.push(horAxis);
	gridItems.push(verAxis);
	gridItems.push(paper.text(cX+10, 10, "N"));
	gridItems.push(paper.text(cX+rad+10, cY+10, "W"));
	gridItems.push(paper.text(cX-10, cY+rad+10, "S"));
	gridItems.push(paper.text(10, cY-10, "E"));
		
	//Set Grid items' attributes
	var gridItemsColor = "#333";
	for(var i in gridItems){
		gridItems[i].attr({stroke: gridItemsColor, 'stroke-width': 1});	
	}	
}

/*
	Set default values for location and time
	updateLocation flag is set if location has to be set to default as well, else just set time
*/
function setDefaults(updateLocation){
	if(updateLocation) {
		//If we were able to use geolocation API, get the location
		if (navigator.geolocation) {
    		navigator.geolocation.getCurrentPosition(loadLocation, handleLocationError, {maximumAge: 75000});
  		} 
  		else {
		//Else load a default value for location
			setDefaultLocation();
		}
	}
	
	var curr = new Date();
	$("#time_day").val(curr.getDate());
	$("#time_mon").val(curr.getMonth()+1);
	$("#time_year").val(curr.getFullYear());
	$("#time_hrs").val(curr.getHours());
	$("#time_min").val(curr.getMinutes());
	$("#time_hrs_slider").val(curr.getHours());
	$("#time_min_slider").val(curr.getMinutes());
}

/*
	Compute location and from values in controls
*/
function loadLocation(position) {
	var latitude = position.coords.latitude;
	var longitude = position.coords.longitude;
	
	var lat_integer = Math.floor(latitude);
	var long_integer = Math.floor(longitude);
	var lat_fraction = Math.abs(latitude - lat_integer);
	var long_fraction = Math.abs(longitude - long_integer);
	
	$("#lat_deg").val(lat_integer);
	$("#lat_min").val(Math.round(lat_fraction * 60));
	$("#lat_deg_slider").val(lat_integer);
	$("#lat_min_slider").val(lat_fraction * 60);
	$("#long_deg").val(long_integer);
	$("#long_min").val(Math.round(long_fraction * 60));
	$("#long_deg_slider").val(long_integer);
	$("#long_min_slider").val(long_fraction * 60);
	
	$("#lat_direction").text( (lat_integer < 0 ? 'S' : 'N') );
	$("#long_direction").text( (long_integer < 0 ? 'W' : 'E') );
	
	$("#update_btn").trigger('click');
}

function handleLocationError(errorObj) {
	if (errorObj.code == 1) {
		alert("Auto-detection of your location has been denied. Please set your location manually.");
	}
	else {
		alert("Could not determine your location. Please set it manually.");
	}
	setDefaultLocation();
}

function setDefaultLocation(){
	$("#lat_deg").val('18');
	$("#lat_min").val('54');
	$("#lat_deg_slider").val('18');
	$("#lat_min_slider").val('54');
	$("#long_deg").val('72');
	$("#long_min").val('49');
	$("#long_deg_slider").val('72');
	$("#long_min_slider").val('49');	
}

function getInputLatitude(){
	var deg = parseInt($("#lat_deg").val());
	var mins = parseInt($("#lat_min").val());
	var dir = $("#lat_direction").text();
	if(deg < 0) { deg *= -1; }
	return ((dir === 'N') ? (deg + mins/60) : (-deg - mins/60));
}

function getInputLongitude(){
	var deg = parseInt($("#long_deg").val());
	var mins = parseInt($("#long_min").val());	
	var dir = $("#long_direction").text();
	if(deg < 0) { deg *= -1; }
	return ((dir === 'E') ? (deg + mins/60) : (-deg - mins/60));
}

function getInputTime() {
	return new Date($("#time_year").val(), $("#time_mon").val()-1, $("#time_day").val(), $("#time_hrs").val(), $("#time_min").val(), 0);
}

function registerHandlers() {
	$("#lat_deg").change( function(){ 
		$("#lat_deg_slider").val(this.value);
		$("#lat_direction").text( (this.value < 0 ? 'S' : 'N') );  
	});
	$("#lat_min").change( function(){ $("#lat_min_slider").val(this.value); } );
	
	$("#lat_deg_slider").change( function(){ 
		$("#lat_deg").val(this.value);	
		$("#lat_direction").text( (this.value < 0 ? 'S' : 'N') );
	});
	$("#lat_min_slider").change( function(){ $("#lat_min").val(this.value); } );
	
	$("#long_deg").change( function(){ 
		$("#long_deg_slider").val(this.value);
		$("#long_direction").text( (this.value < 0 ? 'W' : 'E') );  
	});
	$("#long_min").change( function(){ $("#long_min_slider").val(this.value); } );
	
	$("#long_deg_slider").change( function(){ 
		$("#long_deg").val(this.value);	
		$("#long_direction").text( (this.value < 0 ? 'W' : 'E') );
	});
	$("#long_min_slider").change( function(){ $("#long_min").val(this.value); } );
	
	$("#time_hrs").change( function(){ $("#time_hrs_slider").val(this.value); } );
	$("#time_min").change( function(){ $("#time_min_slider").val(this.value); } );
	
	$("#time_hrs_slider").change( function(){	$("#time_hrs").val(this.value); } );
	$("#time_min_slider").change( function(){ $("#time_min").val(this.value); } );
}

function determineColor(cat, typ){
	if(cat === 'Star') {
		return '#FFF';
	}
	else {
		if(typ === 'Open Cluster' || typ === 'Globular Cluster') { return "#55F"; }
		if(typ === 'Galaxy') { return '#F00'; }
		if(typ === 'Diffuse Nebula' || typ === 'Planetary Nebula') {return "#929";}
		return '#0a0';
	}
}

function clearDetails() {
	$("#obj_name").text('');
	$("#alternate_name").text('');
	$("#obj_az").text('');
	$("#obj_alt").text('');		
	$("#obj_cat").text('');
	$("#obj_type").text('');
	$("#obj_size").text('');
	$("#obj_mag").text('');	
}