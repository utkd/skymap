/*
	converter.js
	
	Provides a conversion routine to convert RA and DEC of an object to Azimuth and Altitude
	Requires a list objects having attributes 'ra' and 'dec'
	Returns the list with new attributes 'az' and 'alt' corresponding to azimuth and altitude
	The time and location values have to be set by calling supplementary functions
	Uses default time and location values otherwise 
	
	Example usage (with dummy values)):
	
	var objlist = [{ra: 5.647, dec: 69.443}, {ra:17.331, dec: -43.77}];
	var c = new Converter(objlist);
	c.setViewTime( <some valid date object> );
	c.setLocation( <new latitude>, <new longitude>);
	c.computePosition();
	
*/

/*
	Constructor function
*/
function Converter(objects) {
	//Initialize default location to Mumbai 
	this.latitude = 18.9647;
	this.longitude = 72.8258;
	
	//Set time to current date
	this.time = new Date();
	
	//Store a local reference to the object list
	this.skyobjects = objects
}

/*
	Supplementary function to set the time for which the computation will be performed
*/
Converter.prototype.setViewTime = function(newtime) {
	//If a valid date is specified
	if(newtime instanceof Date) {
		this.time = newtime;
		return true;
	}
	return false;
}

/*
	Supplementary function to set the location for which the computation will be performed
*/
Converter.prototype.setLocation = function(lat, lon) {
	//If numeric values are specified
	if((typeof lat === 'number') && (typeof lon === 'number') )
	{
		//If the values are in valid range
		if(lat <= 90 && lat >= -90 && lon <= 180 && lon >= -180)
		{
			this.latitude = lat;
			this.longitude = lon;
			return true;
		}
	}
	return false;
}

/*
	Function to compute Altitude and Azimuth for the given list of objects
*/
Converter.prototype.computePosition = function() {
	
	//Determine the number of days passes since J2000(1200 hrs UT on Jan 1st 2000 AD)
	var reference_date = new Date(2000, 0, 1, 12, 0, 0);
	var millisecondsPerDay = 1000 * 60 * 60 * 24;
	var millisBetween = this.time.getTime() - reference_date.getTime();
	var daysPassed = millisBetween / millisecondsPerDay;
	
	//Determine the Local Sidereal Time 	
	//First get the UTC time in hours + fraction
	//Warning: If user's timezone and location's timezone are not same, this result will be incorrect
	//This limitation is planned to be removed in a later version  
	var decUT = this.time.getUTCHours() + this.time.getUTCMinutes()/60;	
	var LST = 100.46 + (daysPassed * 0.985647) + this.longitude + 15*decUT;
	
	//Get the Local Sidereal Time in 0-360 range
	while(LST > 360){ LST -= 360; }
	while(LST < 0) { LST += 360; }
	
	//Multiplier to convert degrees to radian 
	var DtoR = Math.PI / 180;
	//Multiplier to convert radians to degrees
	var RtoD = 180 / Math.PI; 
	
	//For each Sky Object
	for(var i in this.skyobjects) {
		var currSkyObj = this.skyobjects[i];
		
		//If RA and DEC are defined for the object
		if(currSkyObj.ra && currSkyObj.dec) {

			//Convert RA to angles(multiply by 15), then radians and store local copies of RA and DEC for use in calculations
			var ra_rad = currSkyObj.ra * 15 * DtoR;
			var dec_rad = currSkyObj.dec * DtoR;	
			
			//Get the Hour Angle
			var HA = LST - (ra_rad * RtoD);
			if(HA < 0){ HA += 360; }
			if(HA > 360) {	HA -= 360; }
			
			HA = HA * DtoR;
	
			//Compute Altitude
			var asin_alt = Math.sin(dec_rad) * Math.sin(this.latitude * DtoR);
			asin_alt += Math.cos(dec_rad) * Math.cos(this.latitude * DtoR) * Math.cos(HA);
			//Set Altitude
			var rad_alt = Math.asin(asin_alt);
			currSkyObj.alt = rad_alt * RtoD;
			
			//Compute Azimuth
			var angle = Math.sin(dec_rad) - Math.sin(rad_alt) * Math.sin(this.latitude * DtoR);
			angle = angle / (Math.cos(rad_alt) * Math.cos(this.latitude * DtoR));
			//Set Azimuth
			var rad_az = Math.acos(angle);
			var deg_az = rad_az * RtoD;
			if(Math.sin(HA) > 0) {
				deg_az = 360 - deg_az;
			}
			currSkyObj.az = deg_az;					
		}	
	}
}