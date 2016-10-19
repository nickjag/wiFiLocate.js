/*
 * wifilocate.js
 *
 * Copyright 2016, Nick Jagodzinski - http://nickjag.com/
 * Released under the MIT Licence
 * http://opensource.org/licenses/MIT
 *
 * Github:  https://github.com/nickjag/wiFiLocate.js
 * Version: 1.0.1
 */

var wiFiLocate = {

	location : false,
	settings : {
		
		feetToPixels : 2.739,
		rssiToFeet : 3,
		adjacentRssi : 40,
		defaultRadius : 5, // in RSSI
		maxDistanceForAlternativePoints : 80, // in RSSI
		logging : false
	},
	basicFunctions : {

		rssiToPixels : function(rssi) {

			var input = Math.abs(Math.abs(rssi) - wiFiLocate.settings.adjacentRssi);
			var feet = input * wiFiLocate.settings.rssiToFeet;
			var pixels = feet * wiFiLocate.settings.feetToPixels;
			return pixels;
		},
		pixelsToRssi : function(pixels) {

			var feet = pixels / wiFiLocate.settings.feetToPixels;
			var rssi = feet / wiFiLocate.settings.rssiToFeet;
			rssi = rssi + wiFiLocate.settings.adjacentRssi;
			return rssi;
		},
		getUserRadius : function(optionalDistance) {

			if (optionalDistance > 0) {

				var finalRadius = optionalDistance;
			}
			else {
				var finalRadius = wiFiLocate.basicFunctions.rssiToPixels((wiFiLocate.settings.defaultRadius + wiFiLocate.settings.adjacentRssi));
			}
			return finalRadius;
		},
		getDistance : function(x1,y1,x2,y2) {

			// Find the distance between the two circles: d = sqrt( dx * dx + dy * dy )

			this.dx = x2 - x1;
			this.dy = y2 - y1;
			this.d = Math.sqrt((Math.pow(this.dx, 2) + Math.pow(this.dy, 2)));
		},
		getCenter : function(x1,y1,x2,y2,dx,dy) {

			// Find the center between two points (midpoint formula)

			this.centerX = (Math.abs(dx) / 2) + Math.min(x1, x2);
			this.centerY = (Math.abs(dy) / 2) + Math.min(y1, y2);
		},
		getIntersections : function(x1,y1,r1,r2,D) {

			/**
			* source: http://www.delphiforfun.org/programs/math_topics/IntersectingCircles.htm
			*
			* 1. Use cosine laws to get length of triangle with intersection points:
			*
			*     l = (r1*r1 - r2*r2 + d*d) / (2d)
			*
			* 2. Find height (to the top intersection point):
			*
			*     h = sqrt(r1*r1 - l*l)
			*
			* 3. Use cosine and sine formulas to 2d transform and get intersection points:
			*
			*     ix1 = x1 + (l * dx - h * dy) / d
			*     iy1 = y1 + (h * dx + l * dy) / d
			*     ix2 = x1 + (l * dx + h * dy) / d
			*     iy2 = y1 + (-h * dx + l * dy) / d
			*/

			var l = ( r1 * r1 - r2 * r2 + D.d * D.d ) / (D.d * 2);

			var h = Math.sqrt( Math.abs(r1 * r1 - l * l) );

			this.ix1 = x1 + (l * D.dx - h * D.dy) / D.d;
			this.iy1 = y1 + (h * D.dx + l * D.dy) / D.d;
			this.ix2 = x1 + (l * D.dx + h * D.dy) / D.d;
			this.iy2 = y1 + (h * -1 * D.dx + l * D.dy) / D.d;

		}
	},
	init : function(settings) {

		if (settings.hasOwnProperty('coordinates')) {
			this.coordinates = settings.coordinates;
		}

		if (settings.hasOwnProperty('logging')) {
			this.settings.logging = settings.logging;
		}
	},
	getLocation : function(environment) {

		wiFiLocate.setEnvironment(environment);
		return this.location;
	},
	outputFinal : function(finalX, finalY, finalRadius) {

		var outputObj = { 'x' : finalX, 'y' : finalY, 'radius' : finalRadius }
		this.location = JSON.stringify(outputObj);
	},
	processError : function(msg) {

		this.errorOutput = 'invalid point count';
	},
	setEnvironment : function(environment) {

		this.environment = environment;

		// Get the environment input

		this.pointRadiusArr 	= new Array();
		this.pointXArr 			= new Array();
		this.pointYArr 			= new Array();

		// Loop through the environment data

		var i = 1;

		for (var mac in environment) {

			if (environment.hasOwnProperty(mac)) {

				// Set the x and y coordinate arrays

				if (wiFiLocate.coordinates.hasOwnProperty(mac)) {

					var coordinateArr = wiFiLocate.coordinates[mac];

					this.pointXArr[i] = coordinateArr[0];
					this.pointYArr[i] = coordinateArr[1];

					// Set the rssi/radius value

					this.pointRadiusArr[i] = wiFiLocate.basicFunctions.rssiToPixels(environment[mac]);

					i++;
				}
				else {
					console.log('mac address not found');
				}
			}
		}

		pointCount = i - 1;
		
		this.routeProcess(pointCount);

	},
	routeProcess : function(pointCount) {

		switch(pointCount) {

			case 1:
				this.singlePointProcess();
				break;
			case 2:
				this.dualPointProcess();
				break;
			case 3:
				this.triplePointProcess();
				break;
			default:
				this.processError('invalid point count');
		}
	},
	singlePointProcess : function() {

		if (wiFiLocate.settings.logging) { console.log('Found 1 point to work with'); }

		// With only one wiFi point, display the user at the center of it with a radius of their current rssi strength.

		this.outputFinal(this.pointXArr[1], this.pointYArr[1], wiFiLocate.basicFunctions.getUserRadius(this.pointRadiusArr[1]));

	},
	dualPointProcess : function() {

		if (wiFiLocate.settings.logging) { console.log('Found 2 points to work with'); }

		// With two wiFi points to work with, pair them up and find their intersection points (there will be 2)

		var iAB = this.getIntersectionPoints(1,2);

		if (wiFiLocate.settings.logging) { console.log('Intersections: '+iAB.ix1+','+iAB.iy1+' and '+iAB.ix2+','+iAB.iy2); }

		// Now we have to figure out which intersection point (of the 2) is the correct/likely one.
		// Find out the distance between the calculated intersection points and the remaining access points (that weren't in range).
		// Store any points that are within limits with shortest distance as a score key equal to the opposite intersection point (more likely one).
		// The intersection point with the shortest distance is the most likely one of being wrong since it didn't show up in range.

		var accessPointsNotFound = new Array();

		for (var mac in wiFiLocate.coordinates) {

			if (wiFiLocate.coordinates.hasOwnProperty(mac)) {

				// Check for macs that are not used in the current environment (not in range).

				if (!(this.environment.hasOwnProperty(mac))) {

					// Get the coordinates from each point to calculate distances.

					var altPoint = wiFiLocate.coordinates[mac];

					var D1 = new wiFiLocate.basicFunctions.getDistance(iAB.ix1, iAB.iy1, altPoint[0], altPoint[1]);
					var D2 = new wiFiLocate.basicFunctions.getDistance(iAB.ix2, iAB.iy2, altPoint[0], altPoint[1]);

					if (D1.d > D2.d) {

						var closestDistance = D2.d;
						var correctIntersectId = 1; // Store the opposite intersect point.
					}
					else {
						var closestDistance = D1.d;
						var correctIntersectId = 2;
					}

					// Check if the distance is within our defined limits.

					if (closestDistance < wiFiLocate.basicFunctions.rssiToPixels(wiFiLocate.settings.maxDistanceForAlternativePoints)) {

						/**
						* This access point should be in the environment if we were on the corresponding intersect point,
						* and since it's not, store closer distance as key (to sort later), and set equal to the intersect id of the further one.
						*/

						closestDistance = Math.round(closestDistance);
						accessPointsNotFound[closestDistance] = correctIntersectId;
					}
				}
			}
		}

		if (accessPointsNotFound.length < 1) {

			// No other points found so we'll settle for the center between our two known points.

			if (wiFiLocate.settings.logging) { console.log('No alternative data to use. Outputting center of intersections. '); }

			var D = new wiFiLocate.basicFunctions.getDistance(iAB.ix1, iAB.iy1, iAB.ix2, iAB.iy2);
			var C = new wiFiLocate.basicFunctions.getCenter(iAB.ix1, iAB.iy1, iAB.ix2, iAB.iy2, D.dx, D.dy);

			// Output the center of the two points with a user radius of the distance between them

			this.outputFinal(C.centerX, C.centerY, wiFiLocate.basicFunctions.getUserRadius(D.d));
		}
		else {

			if (wiFiLocate.settings.logging) { console.log('Additional, alternative data to use.'); }

			// Set the best choice intersection points

			var bestChoiceMac = new Array();

			var i = 1;
			for (x in accessPointsNotFound) {
				bestChoiceMac[i] = accessPointsNotFound[x];
				i++;
			}

			// Check if there are two points and they're not equal to each other (opposing data).

			if (bestChoiceMac.hasOwnProperty(2) > 1 && (bestChoiceMac[1] != bestChoiceMac[2])) {

				if (wiFiLocate.settings.logging) { console.log('Conflicting data, using midpoint instead.'); }

				var D = new wiFiLocate.basicFunctions.getDistance(iAB.ix1, iAB.iy1, iAB.ix2, iAB.iy2);
				var C = new wiFiLocate.basicFunctions.getCenter(iAB.ix1, iAB.iy1, iAB.ix2, iAB.iy2, D.dx, D.dy);

				// Output the center of the two points with a user radius of the distance between them

				this.outputFinal(C.centerX, C.centerY, wiFiLocate.basicFunctions.getUserRadius(D.d));
			}
			else {

				// Final Output

				if (bestChoiceMac[1] == 1) {

					this.outputFinal(iAB.ix1, iAB.iy1, wiFiLocate.basicFunctions.getUserRadius(0));
				}
				else {
					this.outputFinal(iAB.ix2, iAB.iy2, wiFiLocate.basicFunctions.getUserRadius(0));
				}
			}
		}

	},
	triplePointProcess : function() {

		if (wiFiLocate.settings.logging) { console.log('Found 3 points to work with'); }
		
		// With three wiFi points to work with, pair them up, find their intersection points (there will be 2 for each pair) and use the third to find the closest intersection point for each.

		var iAB = this.getIntersectionPoints(1,2);
		var iBC = this.getIntersectionPoints(2,3);
		var iAC = this.getIntersectionPoints(1,3);

		// Find the best intersection point in each pair by finding the one closest to the alternative circle

		var fAB = this.choosePoint(iAB,3);
		var fBC = this.choosePoint(iBC,1);
		var fAC = this.choosePoint(iAC,2);

		// Log the intersection points
		
		if (wiFiLocate.settings.logging) {
			console.log('Intersect AB: ' + fAB.x + ', ' + fAB.y);
			console.log('Intersect BC: ' + fBC.x + ', ' + fBC.y);
			console.log('Intersect AC: ' + fAC.x + ', ' + fAC.y);
		}

		// Display the user in the center (centroid) of the three best intersection points we've found.

		var centroidXCoor = (fAB.x + fBC.x + fAC.x) / 3;
		var centroidYCoor = (fAB.y + fBC.y + fAC.y) / 3;

		// Output final results

		this.outputFinal(centroidXCoor, centroidYCoor, wiFiLocate.basicFunctions.getUserRadius(0));


	},
	getIntersectionPoints : function(a,b) {

		if (wiFiLocate.settings.logging) { console.log('Getting intersection points..'); }

		var x1 = this.pointXArr[a];
		var y1 = this.pointYArr[a];
		var r1 = this.pointRadiusArr[a];

		var x2 = this.pointXArr[b];
		var y2 = this.pointYArr[b];
		var r2 = this.pointRadiusArr[b];

		var D = new wiFiLocate.basicFunctions.getDistance(x1,y1,x2,y2);
		
		// Check if circles do not intersect
		
		if (!(D.d < (r1 + r2))) {

			if (wiFiLocate.settings.logging) { console.log('Circles do not intersect. Expanding to force intersection.'); }

			var neededDistance = (r1 + r2) - D.d + 2; // add buffer

			r1 += neededDistance / 2;
			r2 += neededDistance / 2;

			this.pointRadiusArr[a] = r1;
			this.pointRadiusArr[b] = r2;

		}
		
		// Check if circle is within a circle

		if (D.d < ( Math.abs(r1 - r2) )) {

			if (wiFiLocate.settings.logging) { console.log('Circle contained in another. Adjustment being made.'); }

			function getRemovalAmt(rS,rB,D) {

				var remove = (rB - ( D.d + rS )) + 5;
				return remove;
			}

			if (r1 > r2) {
				r1 = r1 - getRemovalAmt(r2,r1,D);
			}
			else {
				r2 = r2 - getRemovalAmt(r1,r2,D);
			}
			
			this.pointRadiusArr[a] = r1;
			this.pointRadiusArr[b] = r2;
		}

		// get the intersection points
		
		var I = new wiFiLocate.basicFunctions.getIntersections(x1,y1,r1,r2,D);
		var intersectPoints = { ix1 : I.ix1, iy1 : I.iy1, ix2 : I.ix2, iy2 : I.iy2 }

		return intersectPoints;

	},
	choosePoint : function(iObj,alt) {

		var D1 = new wiFiLocate.basicFunctions.getDistance(iObj.ix1, iObj.iy1, this.pointXArr[alt], this.pointYArr[alt]);
		var D2 = new wiFiLocate.basicFunctions.getDistance(iObj.ix2, iObj.iy2, this.pointXArr[alt], this.pointYArr[alt]);
		
		// compare the two distances with the third point's radius to determine which of the distances (and hence intersection points) is closest to the known third point radius.
		
		var diff1 = Math.abs(this.pointRadiusArr[alt] - D1.d);
		var diff2 = Math.abs(this.pointRadiusArr[alt] - D2.d);
		
		if (diff1 > diff2) {
			var finalPoints = { x : iObj.ix2, y : iObj.iy2 }
		}
		else {
			var finalPoints = { x : iObj.ix1, y : iObj.iy1 }
		}
		
		return finalPoints;

	}

}
