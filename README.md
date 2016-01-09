# wiFiLocate.js
Calculate your position using wiFi, iBeacons and other signals devices.

## About
wiFiLocate.js takes a mobile device's in-range RSSI values from nearby signals devices (wiFi access points, iBeacons, etc.) and converts them into the x and y coordinates of the mobile device's position on a map.

The applicable signals devices must be stored beforehand and are typically identified by their MAC address. Hence, in the code, "mac" refers to an identified device. 

## Getting Started

### Install the wiFiLocate.js script

```
<script type="text/javascript" src="wiFiLocate.js"></script>
```

### Initiate With Your Signals Devices
Initiate with the x and y coordinates (in pixels) of all the wiFi access points (or other signals devices) as they would appear on your map graphic. They are typically identified by their MAC address, which can be used as the property name. Ideally, you would want to have as many as possible, and with signal overlap.

```
var settings = {
	coordinates : {
		'mac1' : [509,499],
		'mac2' : [905,550],
		'mac3' : [784,997]
	}
}

wiFiLocate.init(settings);
```

### Send RSSI Values, Get Position Back. Repeat.
Send the 3 most adjacent (highest RSSI value) signals devices (identified by MAC address usually) with their corresponding RSSI value. The returned JSON object will contain the position x and y coordinates, and radius (in pixels).

```
var environment = {
	'mac1' : -76,
	'mac2' : -56,
	'mac3' : -88
}

var position = wiFiLocate.getLocation(env);

console.log(position);
// Object {x: 733.9861362306069, y: 389.3438356164384, radius: 41.085}

```

## Settings and Defaults

```
feetToPixels : 2.739,
rssiToFeet : 3,
adjacentRssi : 40,
defaultRadius : 5, // in RSSI
maxDistanceForAlternativePoints : 80, // in RSSI
logging : false
```

**feetToPixels**
The multiplier to convert feet to pixels, as represented in your map graphic. Mathematically, it's pixels / feet.

**rssiToFeet**
The multiplier to convert RSSI values to feet. This will typically stay at around `3` but can be measured and adjusted in realtime with a mobile app that displays RSSI values.

**adjacentRssi**
This is the RSSI value the script will interpret as being at or very close to the originating signals device. 

This value can be adjusted lower if the signals devices used show consistent, lower adjacent RSSI readings (such as `20`). During wiFi testing, inconsistent readings were present (between `40` to `20`), resulting in a safer setting of `40`.

This value can also drastically change depending on walls and signal-blocking elements. Ideally, in the future, the script would also accept a unique adjacentRssi value along with each "mac" coordinate, allowing for more control. 

**defaultRadius**
This is the default radius of the mobile device's positioning circle, in RSSI. It's in RSSI because the radius is calculated (and can enlargen) for less accurate positioning instances. You may, however, choose to not use the radius result (the Simulator Demo only uses it to change the color of the dot to red when inaccurate). 

**maxDistanceForAlternativePoints** (in RSSI)
Because the script tracks negative spaces, this value represents that maximum RSSI that should be used if using an alternative signals device to aid in positioning calculation. In my experience, values over 80 tend to become less accurate, and therefore, reliable.

**logging**
Outputs calculation data to the console.

## Demo
The included demo is an interactive simulation, allowing you to track your mouse in Live mode, as it if were a mobile device/user. The signals device(s) being used in current calculations turn yellow.

Edit mode will allow you to add, remove and move the signals devices to experiement with better/worse positioning calculations.

## Author

[Nick Jagodzinski](http://nickjag.com)

## Licensing
wiFiLocate.js is available under the MIT license.

