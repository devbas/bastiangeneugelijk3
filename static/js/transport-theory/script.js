import * as THREE from '/js/transport-theory/three.module.js';
    import { OrbitControls } from '/js/transport-theory/OrbitControls.js';

    function uuidv4() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const run = async () => {
    
      const data = await d3.csv('/js/transport-theory/data4.csv', function(d) {return {id: parseInt(d.id), date: parseInt(d.date), lat: d.lat, lon: d.lon}})
    
      // Size of the cube 
      const c = 12
    
      // Size of the display
      const height = 736.2 
    
      const width = screen.width / 2
    
      // Date range 
      const minDate = d3.min(data, d => d.date)
      const maxDate = d3.max(data, d => d.date)
    
      const timeScale = d3
        .scaleTime()
        .domain([minDate, maxDate])
        .range([-c / 2, c / 2])
    
      const databox = {
        l: +d3.min(data, d => d.lon),
        r: +d3.max(data, d => d.lon),
        t: +d3.max(data, d => d.lat),
        b: +d3.min(data, d => d.lat)
      }
    
      const bbox = {
        type: "Polygon",
        coordinates: [
          [
            [databox.l, databox.t],
            [databox.l, databox.t],
            [databox.r, databox.b],
            [databox.l, databox.b],
            [databox.l, databox.t]
          ]
        ]
      }
    
      const projection = d3.geoMercator().fitSize([c, c], bbox)
    
      const scene = new THREE.Scene()
    
      // Add cube outline 
      const box = new THREE.BoxGeometry(c, c, c)
      var geo = new THREE.EdgesGeometry(box)
      var mat = new THREE.LineBasicMaterial({ color: 0xdddddd, linewidth: 5, linecap: 'round', linejoin: 'round' })
      
      var wireframe = new THREE.LineSegments(geo, mat)

      scene.add(wireframe)
    
      var loader = new THREE.TextureLoader();
      var material = new THREE.MeshBasicMaterial({ map: loader.load('/images/transport-theory-map-canvas.png') })
      
      var geometry = new THREE.PlaneGeometry(c, c)
    
      var cube = new THREE.Mesh(geometry, material)
      cube.position.x = 0
      cube.position.y = -c / 2
      cube.position.z = 0
      cube.rotation.x = -Math.PI / 2
      cube.rotation.z = Math.PI / 2
      cube.scale.x = 1 
      cube.scale.y = 1
    
      scene.add(cube)
    
      const project3D = (coord, t = minDate) => {
        const proj = projection(coord)
        const time = timeScale(t)
    
        return new THREE.Vector3(proj[1] - c / 2, time, c / 2 - proj[0])
      }
      
      var trajectoryCurveMaterial = new THREE.LineBasicMaterial({ color: '#FACB38', linewidth: 5 })
      for(let i = 1; i <= 8; i++) {
        const trajectory = data.filter(d => d.id === i)
        trajectory.coords = trajectory.map(d => project3D([d.lon, d.lat], d.date))
        trajectory.geometry = new THREE.BufferGeometry().setFromPoints(trajectory.coords)

        const curve = new THREE.Line(trajectory.geometry, trajectoryCurveMaterial)
        
        scene.add(curve)
      }

      const userLocationScrollBuffer = 5

      const unixDiff = maxDate - minDate
    
      const vehicleCoords = []
      const vehicleCoordGeometry = new THREE.SphereGeometry(0.07, 16, 16)
      const vehicleCoordMaterial = new THREE.MeshBasicMaterial({ color: 'rgba(250,203,56,0)' })

      const userCoords = []

      data.forEach(function(d) {

        if(d.id === 9) {
          const userCoord = project3D([d.lon, d.lat], d.date)
          userCoord.date = d.date

          userCoords.push(userCoord)
        } else {
          const vehicleCoord = project3D([d.lon, d.lat], d.date)
          const vehicleCoordState = {}
          vehicleCoordState.mesh = new THREE.Mesh(vehicleCoordGeometry, vehicleCoordMaterial)

          vehicleCoordState.mesh.position.x = vehicleCoord.x
          vehicleCoordState.mesh.position.y = vehicleCoord.y
          vehicleCoordState.mesh.position.z = vehicleCoord.z
          vehicleCoordState.mesh.bgId = uuidv4()
          vehicleCoordState.mesh.active = false
          vehicleCoordState.lon = d.lon
          vehicleCoordState.lat = d.lat
          vehicleCoordState.date = d.date

          vehicleCoords.push(vehicleCoordState)
        }
      })
    
      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true })
      
      let containerWidth = document.getElementsByClassName("playground-drawing-board")[0].clientWidth
      let containerHeight = document.getElementsByClassName("playground-drawing-board")[0].clientHeight
      renderer.setSize(containerWidth, containerHeight);
      renderer.setPixelRatio(devicePixelRatio);
      renderer.setClearColor( 0x000000, 0 )
    
      const camera = new THREE.PerspectiveCamera(30, (containerWidth/containerHeight), 0.1, 90)
      camera.position.set(36, 18, 17)
      camera.zoom = 1
      camera.updateProjectionMatrix()
    
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.minDistance = 0;
      controls.maxDistance = 50;
      controls.enableZoom = false;

      var userGeo = new THREE.SphereGeometry(0.16, 16, 16)
      var userMat = new THREE.MeshBasicMaterial({ color: '#D0021B' })
    
      const userCube = new THREE.Mesh(userGeo, userMat)
      userCube.position.x = userCoords[0].x
      userCube.position.y = userCoords[0].y
      userCube.position.z = userCoords[0].z
    
      scene.add(userCube)
    
      const redraw = () => {
        const scrollTopOffset = window.pageYOffset || document.documentElement.scrollTop;
    
        const body = document.body
        const html = document.documentElement;
        const scrollHeight = Math.max( body.scrollHeight, body.offsetHeight, 
                           html.clientHeight, html.scrollHeight, html.offsetHeight );
    
        const windowHeight = window.innerHeight
        const userScrollDateUnix = minDate + (unixDiff * (scrollTopOffset + (scrollTopOffset * windowHeight / (scrollHeight - windowHeight))) / scrollHeight)

        let j = 0
        for(const i in vehicleCoords) {
          const coord = vehicleCoords[i]

          if(coord.date < userScrollDateUnix) {
            if(!coord.mesh.active) {
              scene.add(coord.mesh)
              vehicleCoords[i].mesh.active = true 
            }
          }

          if(coord.date > userScrollDateUnix && coord.mesh.active) {
            const selectedObject = scene.getObjectByProperty('bgId', coord.mesh.bgId)

            if(selectedObject) {
              vehicleCoords[i].mesh.active = false 
              scene.remove(selectedObject)
            }
          }
        }

        userCoords.forEach(function (u) {
          if(u.date > userScrollDateUnix - userLocationScrollBuffer && u.date < userScrollDateUnix + userLocationScrollBuffer) {
            userCube.position.x = u.x
            userCube.position.y = u.y
            userCube.position.z = u.z
          }
        })
    
        renderer.render(scene, camera);
      }
      
      controls.addEventListener("change", redraw);
      document.addEventListener("scroll", redraw);
    
      renderer.render(scene, camera);
    
      const container = document.getElementById( 'tile' );
      container.appendChild(renderer.domElement)
    }
    
    run()