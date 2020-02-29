var nothing = turf.featureCollection([]);

var state = {
  travelerLocation: false, 
  progress: 0,
  startTime: 0,
  nowUnix: 0, 
  travelerCoordinates: [],
  travelerPointRadius: 1.5,
  isMatched: false,
  trainPointFeatureCollection: [],
  matchedCoordinates: {},
  matchedVehicle: false, 
  updatePhoneScreen: function(match = false) {
    var numberRegex = /[+-]?\d+(?:\.\d+)?/g;
    if(match) {
      var delay = numberRegex.exec(state.matchedVehicle.geometry.delay)
      document.getElementById('screen').innerHTML = `
        <div class="title-box">
          <div class="top-label"></div>
          <div class="title">Now</div>
        </div>
        <div id="content-box">
          <div class="disruption-status">
            ${delay[0] === '0' ? `<div class="green-flag-icon"></div><div class="description green">No delay</div>` : `<div class="yellow-flag-icon"></div><div class="description yellow">+${delay[0]} minutes</div>`}
          </div>
          <div class="travel-description">
            <div class="secundary">You are in the</div>
            <div class="primary">${state.matchedVehicle.geometry.vehicleType} towards ${state.matchedVehicle.geometry.destination}</div>
          </div>
          <div class="destinations-title">Destinations</div>
          <div class="destination-box">
            <div class="destination-home-box">
              <div class="image"></div>
              <div class="label">Home</div>
            </div>
            <div class="destination-work-box">
              <div class="image"></div>
              <div class="label">Work</div>
            </div>
          </div>
        </div>`
        // 
    } else {	
      document.getElementById('screen').innerHTML = `
                      <div class="title-box">
                        <div class="top-label"></div>
                        <div class="title">Now</div>
                      </div>
                      <div id="loading-box">
                        <div class="loading-description">Checking where you are...</div>
                        <div class="loader"></div>
                      </div>`
    }
  }, 
  createGeoJSONCircle: function(center, radiusInKm, points) {
    if(!points) points = 64;

    var coords = {
        latitude: center[1],
        longitude: center[0]
    };

    var km = radiusInKm;

    var ret = [];
    var distanceX = km/(111.320*Math.cos(coords.latitude*Math.PI/180));
    var distanceY = km/110.574;

    var theta, x, y;
    for(var i=0; i<points; i++) {
        theta = (i/points)*(2*Math.PI);
        x = distanceX*Math.cos(theta);
        y = distanceY*Math.sin(theta);

        ret.push([coords.longitude+x, coords.latitude+y]);
    }
    ret.push(ret[0]);

    return {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [ret]
                }
            }]
        }
    };
  },
  metersPerPixel: function(lat) {
    var zoomLevel = map.getZoom(); 
    var earthCircumference = 40075017;
    var latitudeRadians = lat * (Math.PI/180);
    return earthCircumference * Math.cos(latitudeRadians) / Math.pow(2, zoomLevel + 8);
  }, 
  getCoordinates: function(train, callback) {
    // Find max datetime that is smaller than currentTrainTime
    var prevCoordinate = false;
    var nextCoordinate = false; 
    var nextCoordinateObject = false; 
    var prevCoordinateObject = false; 

    train.values.points.forEach(function(point) {

      if(point.datetime > state.nowUnix) { // Datapoint in the future
        if(!nextCoordinate || point.datetime < nextCoordinate) {
          nextCoordinate = point.datetime
          nextCoordinateObject = point
        }
      } else { // Datapoint in the past
        if(!prevCoordinate || point.datetime > prevCoordinate) {
          prevCoordinate = point.datetime
          prevCoordinateObject = point
        }
      }
    })

    if(!prevCoordinateObject) prevCoordinateObject = train.values.points[0]
    if(!nextCoordinateObject) {
      state.travelerLocation = false; 
      state.matchedCoordinates = [];
      state.travelerCoordinates = [];
      state.bearing = false; 
      state.progress = 0; 
      state.nowUnix = 0; 
      document.getElementById('map-overlay-start').setAttribute('style', 'display: block;');
      document.getElementById('visualization-start-content').innerHTML = `<span>That's it! Start another?</span>`
    }
    
    if(nextCoordinateObject) {
      callback(prevCoordinateObject, nextCoordinateObject)
    }
  },
  setNewTravelerPoint: function(nextCoordinateObject) {
    state.nextTravelerLon = parseFloat("" + parseFloat(parseFloat(nextCoordinateObject.lon).toFixed(3)) + (Math.random() * (10 - 1) + 1));
    state.nextTravelerLat = parseFloat("" + parseFloat(parseFloat(nextCoordinateObject.lat).toFixed(3)) + (Math.random() * (10 - 1) + 1));
    state.travelerPointRadius = 0.5
    var travelerPoint = turf.point([state.nextTravelerLon, state.nextTravelerLat])
    map.getSource('traveler-points').setData(travelerPoint)

    state.isMatched = false 
  },
  travelerRoute: function(geo) {
    
    if(!state.travelerLocation) {
      if(!state.premiereRouteProcessed) {
        state.travelerLocation = geo.trains[241]
      } else {
        var random = [200, 37, 1, 248, 255, 258, 86, 39, 197]; 
        state.travelerLocation = geo.trains[Math.floor(Math.random() * random.length)]
      }
      state.premiereRouteProcessed = true 
    }
    
    state.nowUnix = (parseInt(geo.startDatetime) + 500000) + state.progress;
    state.getCoordinates(state.travelerLocation, function(prevCoordinateObject, nextCoordinateObject) {
      if(state.travelerCoordinates.length < 1) {
        state.travelerCoordinates.push([prevCoordinateObject.lon, prevCoordinateObject.lat])
      }

      var cellProgress = state.nowUnix - prevCoordinateObject.datetime 
      var cellTimeDistance = nextCoordinateObject.datetime - prevCoordinateObject.datetime 
      var percentage = cellProgress / cellTimeDistance
      
      // TRAVELER LINE
      var spectrumLine = turf.lineString([[prevCoordinateObject.lon, prevCoordinateObject.lat], [nextCoordinateObject.lon, nextCoordinateObject.lat]])
      var length = turf.length(spectrumLine, { units: 'meters' }) // Measures line length
      var interpolate = percentage * length 
      var along = turf.along(spectrumLine, interpolate, { units:'meters'}); // Current coordinates, based on interpolation
      
      var bearing = turf.bearing(turf.point([prevCoordinateObject.lon, prevCoordinateObject.lat]), turf.point([nextCoordinateObject.lon, nextCoordinateObject.lat]))
      var line = turf.lineString(state.travelerCoordinates.concat([[along.geometry.coordinates[0], along.geometry.coordinates[1]] ]))
      var chunk = turf.lineChunk(line, 300, { units: 'meters', reverse: true })
      if((state.nowUnix - parseInt(geo.startDatetime)) > 509000) {
        map.jumpTo({ 
          center: [along.geometry.coordinates[0], along.geometry.coordinates[1]],
          duration: 150, 
          zoom: 14.5, 
          pitch: 60, 
        })

        if(state.bearing !== bearing) {
          map.rotateTo(bearing, {
            duration: 250 
          })
          state.bearing = bearing 
        }

      }

      map.getSource('traveler-line').setData(chunk.features[0])
      
      // All things dealing with traveler POINT
      if(percentage === 0.99) {	
        state.animateVehicles(state.geo)
        state.travelerCoordinates.push([nextCoordinateObject.lon, nextCoordinateObject.lat])

        // SET NEW TRAVELER POINT + SET TRAVELER RADIUS TO 0
        state.setNewTravelerPoint({ lon: along.geometry.coordinates[0], lat: along.geometry.coordinates[1] })
      } else {
        if((state.nowUnix - parseInt(geo.startDatetime)) > 509000 && !state.isMatched) {

          if(state.nextTravelerLon && state.nextTravelerLat) {
            state.currentTravelerLon = state.nextTravelerLon
            state.nextTravelerLon = false 

            state.currentTravelerLat = state.nextTravelerLat
            state.nextTravelerLat = false
          }

          // SET TRAVELER RADIUS
          var metersPerPixel = state.metersPerPixel(state.currentTravelerLat)
          var searchRadius = state.travelerPointRadius * metersPerPixel
          var currentTravelerCoordinate = turf.point([state.currentTravelerLon, state.currentTravelerLat])
          
          var matchingCoordinates = _.find(state.trainPointFeatureCollection, function(point) {
            var distance = turf.distance(currentTravelerCoordinate, point, { units: 'meters' }); 
            if(distance < searchRadius) {
              return point
            }
          })

          if(matchingCoordinates === undefined) {
            state.travelerPointRadius = state.travelerPointRadius + 1.5
            searchRadius = state.createGeoJSONCircle([state.currentTravelerLon, state.currentTravelerLat], searchRadius / 1000)
            map.getSource('search-radius').setData(searchRadius.data)
          } else {
            state.isMatched = true 
            var d = new Date();
            state.matchAnimStart = d.getTime()
            state.matchCoordinates = matchingCoordinates
            
            map.getSource('match-point').setData(matchingCoordinates)
            
            if(state.matchedCoordinates[matchingCoordinates.geometry.identifier]) {
              state.matchedCoordinates[matchingCoordinates.geometry.identifier].push(matchingCoordinates)
            } else {
              state.matchedCoordinates[matchingCoordinates.geometry.identifier] = new Array(matchingCoordinates)
            }

            if(state.matchingPopup) {
              state.matchingPopup.remove();
            }

            state.matchingPopup = new mapboxgl.Popup({ className: 'match-popup-box animate pulse', anchor: 'bottom-left' })
              .setLngLat([matchingCoordinates.geometry.coordinates[0], matchingCoordinates.geometry.coordinates[1]])
              .setHTML(matchingCoordinates.geometry.vehicleTypeAbbr + ' towards ' + matchingCoordinates.geometry.destination)
              .addTo(map);


            // Some Statistics
            var matchLength = []
            for(vehicle in state.matchedCoordinates) {
              matchLength.push(state.matchedCoordinates[vehicle].length)
            }
            var totalMatches = _.sum(matchLength)

            var keys = Object.keys(state.matchedCoordinates); 
            var largest = Math.max.apply(null, keys.map(x => state.matchedCoordinates[x].length));

            var highestProbability = keys.reduce((result, key) => {
              if(state.matchedCoordinates[key].length === largest) {
                result.push(state.matchedCoordinates[key])
              }
              return result 
            }, [])

            if(highestProbability[0]) {
              var probability = highestProbability[0].length / totalMatches
              if(probability > 0.6 && highestProbability[0].length >= 4) {
                state.matchedVehicle = highestProbability[0][0]
                state.updatePhoneScreen(true)
              }
            }
          }
        }
      }

    })
    
    state.progress = parseInt(state.progress) + 100
    if(state.nowUnix < parseInt(state.travelerLocation.values.end_datetime)) {
      requestAnimationFrame(() => state.travelerRoute(geo))
    }
  }, 
  animateVehicles: function(geo) {
    state.trainPointFeatureCollection = [];
    geo.trains.forEach(function(train) {
      if(parseInt(train.values.start_datetime) <= state.nowUnix && parseInt(train.values.end_datetime) >= state.nowUnix) {
        state.getCoordinates(train, function(prevCoordinateObject, nextCoordinateObject) {
          var geopoint = turf.point([nextCoordinateObject.lon, nextCoordinateObject.lat])
          geopoint.geometry.identifier = nextCoordinateObject.train_number
          geopoint.geometry.delay = nextCoordinateObject.delay 
          geopoint.geometry.vehicleType = nextCoordinateObject.vehicle_type 
          geopoint.geometry.vehicleTypeAbbr = nextCoordinateObject.vehicle_type_abbr 
          geopoint.geometry.destination = nextCoordinateObject.destination 
          state.trainPointFeatureCollection.push(geopoint) 
        })
      }
    })
    var combined = turf.combine(turf.featureCollection(state.trainPointFeatureCollection));		
    map.getSource('train-points').setData(combined)
  }
}

mapboxgl.accessToken = 'pk.eyJ1IjoiYmFzdGlhbmdlbmV1Z2VsaWprIiwiYSI6ImNpc3NzbHB3bTAwMHYydG56amh6eDVmZW0ifQ.XfPts3nU26flYnaZ3DRquA';

var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/bastiangeneugelijk/cjlxqg4wa0mw42ro7cy8tvf1y?optimize=true',
  center: [5.121420100000023, 52.09073739999999],
  zoom: 7.5
})

map.scrollZoom.disable();

function onVisualizationStart() {

  if(!map.getSource('match-point')) {
    map.addSource('match-point', { 'data': nothing, 'type': 'geojson' })
  }

  if(!map.getSource('train-points')) {
    map.addSource('train-points', { 'data': nothing, 'type': 'geojson' })
  }

  if(!map.getSource('traveler-points')) {
    map.addSource('traveler-points', { 'data': nothing, 'type': 'geojson' })
  }

  if(!map.getSource('traveler-line')) {
    map.addSource('traveler-line', { 'data': nothing, 'type': 'geojson', 'lineMetrics': true })
  }

  if(!map.getSource('search-radius')) {
    map.addSource('search-radius', { 'data': nothing, 'type': 'geojson' })
  }


  // state.animateVehicles(state.geo)
  state.travelerRoute(state.geo)
  state.updatePhoneScreen()

  map.addLayer({
    'id':'train-points',
    'type':'symbol',
    'source': 'train-points',
    "layout": {
      "icon-image": "logons",
      "icon-size": 0.3, 
      "text-anchor": "top"
    }
  })

  map.addLayer({
    'id': 'traveler-points', 
    'type': 'circle', 
    'source': 'traveler-points', 
    'paint': {
      'circle-radius': {
        type: 'exponential',
        stops: [
          [0, 4],
          [20, 12]
        ]
      },
      'circle-color': '#41BCC3'
    }
  })

  map.addLayer({
    'id': 'traveler-line', 
    'type': 'line', 
    'source': 'traveler-line', 
    'layout': {
      'line-cap': 'round',
      'line-join': 'round'
    },
    'paint': {
      'line-color': 'red',
      'line-width': 8,
      'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, "rgba(255, 255, 255, 1)",
          0.3, "rgba(255, 255, 255, 1)",
          0.5, "rgba(255, 255, 255, 1)",
          0.7, "rgba(255, 255, 255, 0.7)",
          0.9, "rgba(255, 255, 255, 0.4)",
          1, "rgba(255, 255, 255, 0)"
      ]
    }
  }, 'train-points')
  
  map.addLayer({
    'id': 'search-radius', 
    'type': 'fill', 
    'source': 'search-radius', 
    'paint': {
      'fill-color': 'rgba(51, 148, 153, 0.4)', 
    }
  })

  map.addLayer({
    'id': 'match-point', 
    'type': 'symbol', 
    'source': 'match-point', 
    "layout": {
      "icon-image": "logons",
      "icon-size": 0.3, 
      "text-anchor": "top"
    }
  })

  document.getElementById('map-overlay-start').setAttribute('style', 'display: none;');
}

map.on('load', function() {
  d3.csv('/js/ovassistant-concept/train5.csv', function(data) {
    var startDatetime = d3.min(data, point => point.datetime)
    var endDatetime = d3.max(data, point => point.datetime)

    var datapoints = d3.nest()
      .key((point) => point.train_number)
      .rollup(function(train) {
        return {
          points: train, 
          start_datetime: d3.min(train, point => point.datetime),
          end_datetime: d3.max(train, point => point.datetime)
        }
      })
      .entries(data)
  
    state.geo = {}
    state.geo.trains = datapoints 
    state.geo.startDatetime = startDatetime
    state.geo.endDatetime = endDatetime
    document.getElementById('visualization-start-content').innerHTML = `<span>Start animation</span>`
  })
})