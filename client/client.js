//const xr = Window.navigator.xr
let state = null;
let sock;

let log = document.getElementById( "log" );
let state_div = document.getElementById( "state" );

let msgs = [];

//  //*************************************** // SERVER // ********************************************//
function write( ...args ) {

  if( msgs.length > 15 ) {

    msgs.shift();
  
  }

  let msg = args.join( ", " );
  msgs.push( msg );
  let fMsg = msgs.join( "\n" );

  log.innerText = "";
  log.innerText +=  "Log: \n " + fMsg;
  
  console.log( msg );
}

function connect_to_server( opt, log ) {

	let self = {
    transport: opt.transport || "wss",
		hostname: opt.hostname || window.location.hostname,
		port: opt.port || window.location.port,
		protocols: opt.protocols || [],
		reconnect_period: 50000,
		reload_on_disconnect: true,
		socket: null,
  };
  
  self.addr = self.transport + '://' + self.hostname + ':' + self.port;
	
	let connect = function() {
  
    self.socket = new WebSocket( self.addr, self.protocols );
		self.socket.binaryType = 'arraybuffer';
    //self.socket.onerror = self.onerror;
    
		self.socket.onopen = function() {

			log( "websocket connected to " + self.addr );
			// ...
  
    }
  
    self.socket.onmessage = function( e ) { 
  
      if ( e.data instanceof ArrayBuffer ) {
  
        // if (onbuffer) {
				// 	//onbuffer(e.data, e.data.byteLength);
				// } else {

        log( "ws received arraybuffer of " + e.data.byteLength + " bytes" )

        //}

      } else {
  
        let msg = e.data;
				let obj;
  
        try {
  
          obj = JSON.parse( msg );
  
        } catch( e ) {}
  
        if ( obj.cmd == "newData" ) {
  
          state = obj.state;
  
				} else {
          
          log( "ws received", msg );
  
        }
			} 
		}
  
    self.socket.onclose = function( e ) {
  
      self.socket = null;

			setTimeout( function() {
  
        if ( self.reload_on_disconnect ) {
  
          window.location.reload( true );
  
        } else {
  
          log( "websocket reconnecting" );

					connect();
  
        }
			}, self.reconnect_period );		
  
      //if (onclose) onclose(e);
			log( "websocket disconnected from " + self.addr );
  
    }

		self.send = function( msg ) {
  
      if ( !self.socket ) { console.warn( "socket not yet connected" ); return; }
			if ( self.socket.readyState != 1 ) { console.warn( "socket not yet ready" ); return; }
			if ( typeof msg !== "string" ) msg = JSON.stringify( msg );
  
      self.socket.send( msg );
  
    }
	}

	connect();

	return self;
}

//  //*************************************** // INITIALIZE // ********************************************//

let container;

let scene,
    camera,
    renderer,
    light,
    controls;

let table, 
    floor, 
    grid;

let userData,
    pivot,
    painter1,
    painter2,
    controller1,
    controller2;

let cursor = new THREE.Vector3();

let geometry = [
  new THREE.BoxBufferGeometry( 0.5, 0.8, 0.5 ),
  new THREE.PlaneBufferGeometry( 4, 4 ),
  new THREE.CylinderBufferGeometry( 0.01, 0.02, 0.08, 5 )
];

let material = [
  new THREE.MeshStandardMaterial( {
    color: 0x444444,
    roughness: 1.0,
    metalness: 0.0
  } ),
  new THREE.MeshStandardMaterial( {
    color: 0x222222,
    roughness: 1.0,
    metalness: 0.0
  } ),
  new THREE.MeshStandardMaterial( { 
    flatShading: true 
  } )
];


initialize();
animate();

function TubePainter() {

  const BUFFER_SIZE = 1000000 * 3;

  let positions = new THREE.BufferAttribute( new Float32Array( BUFFER_SIZE ), 3 );
  positions.usage = THREE.DynamicDrawUsage;

  let normals = new THREE.BufferAttribute( new Float32Array( BUFFER_SIZE ), 3 );
  normals.usage = THREE.DynamicDrawUsage;

  let colors = new THREE.BufferAttribute( new Float32Array( BUFFER_SIZE ), 3 );
  colors.usage = THREE.DynamicDrawUsage;

  let geometry = new THREE.BufferGeometry();
  geometry.addAttribute( 'position', positions );
  geometry.addAttribute( 'normal', normals );
  geometry.addAttribute( 'color', colors );
  geometry.drawRange.count = 0;

  let material = new THREE.MeshStandardMaterial( {
    vertexColors: THREE.VertexColors
  } );

  let mesh = new THREE.Mesh( geometry, material );
  mesh.frustumCulled = false;

  //

  function getPoints( size ) {

    let PI2 = Math.PI * 2;

    let sides = 10;
    let array = [];
    let radius = 0.01 * size;

    for ( let i = 0; i < sides; i ++ ) {

      let angle = ( i / sides ) * PI2;
      array.push( new THREE.Vector3( Math.sin( angle ) * radius, Math.cos( angle ) * radius, 0 ) );

    }

    return array;

  }

  //

  let vector1 = new THREE.Vector3();
  let vector2 = new THREE.Vector3();
  let vector3 = new THREE.Vector3();
  let vector4 = new THREE.Vector3();

  let color = new THREE.Color( 0xffffff );
  let size = 1;

  function stroke( position1, position2, matrix1, matrix2 ) {

    if ( position1.distanceToSquared( position2 ) === 0 ) return;

    let count = geometry.drawRange.count;

    let points = getPoints( size );

    for ( let i = 0, il = points.length; i < il; i ++ ) {

      let vertex1 = points[ i ];
      let vertex2 = points[ ( i + 1 ) % il ];

      // positions

      vector1.copy( vertex1 ).applyMatrix4( matrix2 ).add( position2 );
      vector2.copy( vertex2 ).applyMatrix4( matrix2 ).add( position2 );
      vector3.copy( vertex2 ).applyMatrix4( matrix1 ).add( position1 );
      vector4.copy( vertex1 ).applyMatrix4( matrix1 ).add( position1 );

      vector1.toArray( positions.array, ( count + 0 ) * 3 );
      vector2.toArray( positions.array, ( count + 1 ) * 3 );
      vector4.toArray( positions.array, ( count + 2 ) * 3 );

      vector2.toArray( positions.array, ( count + 3 ) * 3 );
      vector3.toArray( positions.array, ( count + 4 ) * 3 );
      vector4.toArray( positions.array, ( count + 5 ) * 3 );

      // normals

      vector1.copy( vertex1 ).applyMatrix4( matrix2 ).normalize();
      vector2.copy( vertex2 ).applyMatrix4( matrix2 ).normalize();
      vector3.copy( vertex2 ).applyMatrix4( matrix1 ).normalize();
      vector4.copy( vertex1 ).applyMatrix4( matrix1 ).normalize();

      vector1.toArray( normals.array, ( count + 0 ) * 3 );
      vector2.toArray( normals.array, ( count + 1 ) * 3 );
      vector4.toArray( normals.array, ( count + 2 ) * 3 );

      vector2.toArray( normals.array, ( count + 3 ) * 3 );
      vector3.toArray( normals.array, ( count + 4 ) * 3 );
      vector4.toArray( normals.array, ( count + 5 ) * 3 );

      // colors

      color.toArray( colors.array, ( count + 0 ) * 3 );
      color.toArray( colors.array, ( count + 1 ) * 3 );
      color.toArray( colors.array, ( count + 2 ) * 3 );

      color.toArray( colors.array, ( count + 3 ) * 3 );
      color.toArray( colors.array, ( count + 4 ) * 3 );
      color.toArray( colors.array, ( count + 5 ) * 3 );

      count += 6;

    }

    geometry.drawRange.count = count;

  }

  //

  let up = new THREE.Vector3( 0, 1, 0 );

  let point1 = new THREE.Vector3();
  let point2 = new THREE.Vector3();

  let matrix1 = new THREE.Matrix4();
  let matrix2 = new THREE.Matrix4();

  function moveTo( position ) {

    point1.copy( position );
    matrix1.lookAt( point2, point1, up );

    point2.copy( position );
    matrix2.copy( matrix1 );

  }

  function lineTo( position ) {

    point1.copy( position );
    matrix1.lookAt( point2, point1, up );

    stroke( point1, point2, matrix1, matrix2 );

    point2.copy( point1 );
    matrix2.copy( matrix1 );

  }

  function setSize( value ) {

    size = value;

  }

  //

  let count = 0;

  function update() {

    let start = count;
    let end = geometry.drawRange.count;

    if ( start === end ) return;

    positions.updateRange.offset = start * 3;
    positions.updateRange.count = ( end - start ) * 3;
    positions.needsUpdate = true;

    normals.updateRange.offset = start * 3;
    normals.updateRange.count = ( end - start ) * 3;
    normals.needsUpdate = true;

    colors.updateRange.offset = start * 3;
    colors.updateRange.count = ( end - start ) * 3;
    colors.needsUpdate = true;

    count = geometry.drawRange.count;

  }

  return {
    mesh: mesh,
    moveTo: moveTo,
    lineTo: lineTo,
    setSize: setSize,
    update: update
  };

}


function initialize() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x222222 );

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.01, 50 );
  camera.position.set( 0, 1.6, 3 );

  //controls = new OrbitControls( camera, container );
  //controls.target.set( 0, 1.6, 0 );
  //controls.update();
  
  table = new THREE.Mesh( geometry[0], material[0] );
  table.position.y = 0.35;
  table.position.z = 0.85;
  scene.add( table );

  floor = new THREE.Mesh( geometry[1], material[1] );
  floor.rotation.x = - Math.PI / 2;
  scene.add( floor );

  grid = new THREE.GridHelper( 10, 20, 0x111111, 0x111111 );
  // grid.material.depthTest = false; // avoid z-fighting
  scene.add( grid );

  scene.add( new THREE.HemisphereLight( 0x888877, 0x777788 ) );

  light = new THREE.DirectionalLight( 0xffffff, 0.5 );
  light.position.set( 0, 4, 0 );
  scene.add( light );

  //

  painter1 = new TubePainter();
  scene.add( painter1.mesh );

  painter2 = new TubePainter();
  scene.add( painter2.mesh );

  //

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.vr.enabled = true; //renderer.xr
  container.appendChild( renderer.domElement );

  document.body.appendChild( VRButton.createButton( renderer ) );

  controller1 = renderer.vr.getController( 0 ); //renderer.xr
  controller1.addEventListener( 'selectstart', onSelectStart );
  controller1.addEventListener( 'selectend', onSelectEnd );
  controller1.addEventListener( 'squeezestart', onSequeezeStart );
  controller1.addEventListener( 'squeezeend', onSqueezeEned );
  controller1.userData.painter = painter1;
  scene.add( controller1 );

  controller2 = renderer.vr.getController( 1 ); //renderer.xr
  controller2.addEventListener( 'selectstart', onSelectStart );
  controller2.addEventListener( 'selectend', onSelectEnd );
  controller2.addEventListener( 'squeezestart', onSequeezeStart );
  controller2.addEventListener( 'squeezeend', onSqueezeEned );
  controller2.userData.painter = painter2;
  scene.add( controller2 );

  //

  mesh = new THREE.Mesh( geometry[2], material[2] );
  mesh.rotateX( - Math.PI / 2 );

  pivot = new THREE.Mesh( new THREE.IcosahedronBufferGeometry( 0.01, 2 ) );
  pivot.name = 'pivot';
  pivot.position.z = - 0.05;
  mesh.add( pivot );

  controller1.add( mesh.clone() );
  controller2.add( mesh.clone() );

  //

  window.addEventListener( 'resize', onWindowResize, false );


  try {
    sock = connect_to_server( {}, write );
  } catch ( e ) {
    console.error( e );
  }

}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}


//  //*************************************** // CONTROLLERS // ********************************************//


function onSelectStart() {

  this.userData.isSelecting = true;

}

function onSelectEnd() {

  this.userData.isSelecting = false;

}

function onSequeezeStart() {

  this.userData.isSqueezing = true;
  this.userData.positionAtSqueezeStart = this.position.y;
  this.userData.scaleAtSqueezeStart = this.scale.x;

}

function onSqueezeEned() {

  this.userData.isSqueezing = false;

}

function handleController( controller ) {

  userData = controller.userData;
  painter = userData.painter;

  pivot = controller.getObjectByName( 'pivot' );

  if ( userData.isSqueezing === true ) {

    delta = ( controller.position.y - userData.positionAtSqueezeStart ) * 5;
    scale = Math.max( 0.1, userData.scaleAtSqueezeStart + delta );

    pivot.scale.setScalar( scale );
    painter.setSize( scale );

  }

  cursor.setFromMatrixPosition( pivot.matrixWorld );

  if ( userData.isSelecting === true ) {

    painter.lineTo( cursor );
    painter.update();

  } else {

    painter.moveTo( cursor );

  }

}

//  //*************************************** // ANIMATE // ********************************************//

function animate ()  {

  renderer.setAnimationLoop( render );

};

function render () {

  handleController( controller1 );
  handleController( controller2 );
  
  renderer.render( scene, camera );

};
