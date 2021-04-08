function PlayerControl(camera){
    this.controller=new PlayerControl0(camera);
    this.frustum;
    this.init=function () {
        var scope=this;
        this.controller.KeyboardMoveStep=8;
        function tool(){
            requestAnimationFrame(tool);
            scope.controller.update();
        }tool();
    }
    this.init();

}/**/
PlayerControl.prototype={
    computeFrustumFromCamera:function(){//求视锥体
        var camera=this.controller.camera;
        var frustum = new THREE.Frustum();
        //frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix,camera.matrixWorldInverse ) );

        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );
        frustum.setFromProjectionMatrix(projScreenMatrix);
        this.frustum=frustum;
        return frustum;
    },
    intersectsSphere(mesh){
        mesh.geometry.computeBoundingBox();

        var box=mesh.geometry.boundingBox;
        var sx=mesh.scale.x;
        var sy=mesh.scale.y;
        var sz=mesh.scale.z;

        var r=Math.pow(
            sx*Math.pow(box.max.x-box.min.x,2)+
            sy*Math.pow(box.max.y-box.min.y,2)+
            sz*Math.pow(box.max.z-box.min.z,2),
            0.5
        )/2;

        return this.intersectsSphere0([
            mesh.geometry.boundingSphere.center.x
            +mesh.matrixWorld.elements[12],
            mesh.geometry.boundingSphere.center.y
            +mesh.matrixWorld.elements[13],
            mesh.geometry.boundingSphere.center.z
            +mesh.matrixWorld.elements[14]
        ], r );
    },
    intersectsSphere0(pos,radius ) {
        var center=new THREE.Vector3(pos[0],pos[1],pos[2])
        const planes = this.frustum.planes;
        //const center = sphere.center;
        const negRadius = - radius;
        for ( let i = 0; i < 6; i ++ ) {
            const distance = planes[ i ].distanceToPoint( center );//平面到点的距离，
            if ( distance < negRadius ) {//内正外负
                return false;//不相交
            }
        }
        //console.log(center);
        return true;//相交
    },
    cullingTest(scene){
        var scope=this;
        setInterval(function () {
            scope.computeFrustumFromCamera();
            scene.traverse(function (node) {
                if(node  instanceof THREE.Mesh){
                    node.geometry.computeBoundingSphere();
                    node.frustumCulled=false;
                    if(node.geometry.boundingSphere){
                        node.visible=scope.intersectsSphere(node);
                        //console.log(node)console.log(mesh.name+":"+node.visible)
                    }else{
                        node.geometry.computeBoundingSphere();
                    }
                }
            })
        },2000)
    },
    showFrustum(scene){

        /*for(i=0;i<6;i++)
            for(j=i;j<6;j++)
                for(k=j;k<6;k++){
                    var spot=getSpot(
                        this.frustum.planes[i],
                        this.frustum.planes[j],
                        this.frustum.planes[k]
                    );
                    console.log(spot);
                    var material = new THREE.MeshNormalMaterial();
                    var geometry= new THREE.CubeGeometry(1,1,1);
                    var mesh= new THREE.Mesh(geometry, material);
                    mesh.position.set(spot.x,spot.y,spot.z);
                    scene.add(mesh);
                }*/

        /*this.frustum.planes[0]={normal:{x:1,y:0,z:0},constant:-1}
        this.frustum.planes[1]={normal:{x:0,y:1,z:0},constant:-1}
        this.frustum.planes[2]={normal:{x:0,y:0,z:1},constant:-1}*/
        /*
        前后是平行的
        * 0上
        * 1下
        * 2左
        * 3右
        * 4前
        * 5后
        * */

        var spots=[];
        for(var i=0;i<2;i++)
            for(j=0;j<2;j++)
                for(k=0;k<2;k++)
                    spots.push(
                        getSpot(
                            this.frustum.planes[i],
                            this.frustum.planes[2+j],
                            this.frustum.planes[4+k]
                        ).multiplyScalar(0.1)
                    );
        /*
        console.log(spot0);
        var material0 = new THREE.MeshNormalMaterial();
        var geometry0= new THREE.CubeGeometry(1,1,1);
        var mesh0= new THREE.Mesh(geometry0, material0);
        mesh0.position.set(spot0.x,spot0.y,spot0.z);
        */
        var material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        var geometry = new THREE.Geometry();
        //侧面
        geometry.vertices.push(spots[0]);
        geometry.vertices.push(spots[1]);
        geometry.vertices.push(spots[3]);
        geometry.vertices.push(spots[2]);
        geometry.vertices.push(spots[0]);

        //侧面
        geometry.vertices.push(spots[4]);
        geometry.vertices.push(spots[6]);
        geometry.vertices.push(spots[7]);
        geometry.vertices.push(spots[5]);
        geometry.vertices.push(spots[4]);

        //前面
        geometry.vertices.push(spots[4]);
        geometry.vertices.push(spots[0]);
        geometry.vertices.push(spots[2]);
        geometry.vertices.push(spots[6]);
        geometry.vertices.push(spots[4]);

        //移动
        geometry.vertices.push(spots[5]);

        //后面
        geometry.vertices.push(spots[5]);
        geometry.vertices.push(spots[1]);
        geometry.vertices.push(spots[3]);
        geometry.vertices.push(spots[7]);
        geometry.vertices.push(spots[5]);

        console.log(spots.length)
        var line = new THREE.Line( geometry, material );
        scene.add(line );
        function getSpot(plane0,plane1,plane2) {
            var n0=plane0.normal;
            var n1=plane1.normal;
            var n2=plane2.normal;
            var array1=[
                n0.x,n0.y,n0.z,
                n1.x,n1.y,n1.z,
                n2.x,n2.y,n2.z
            ]
            var array2=[
                plane0.constant,
                plane1.constant,
                plane2.constant
            ]
            return getSpotPos(array1,array2);
        }
        function getSpotPos(m_arr,vec_arr) {
            const m = new THREE.Matrix3();
            m.set(
                m_arr[0],m_arr[1],m_arr[2],
                m_arr[3],m_arr[4],m_arr[5],
                m_arr[6],m_arr[7],m_arr[8],
                );
            const vec1 = new THREE.Vector3(
                vec_arr[0], vec_arr[1], vec_arr[2]
            );//看成一个列向量
            const vec2=multiplication(m,vec1)
            vec2.multiplyScalar(-1);
            console.log(vec2);
            return vec2;
            function multiplication(matrix,vector) {
                var e=matrix.elements;
                var x=vector.x;
                var y=vector.y;
                var z=vector.z;
                return new THREE.Vector3(
                    x*e[0]+y*e[3]+z*e[6],
                    x*e[1]+y*e[4]+z*e[7],
                    x*e[2]+y*e[5]+z*e[8]
                );
            }
        }
        //m.invert ();




    },
}
function PlayerControl0(camera){
    this.camera=camera;
    var scope=this;
    this.KeyboardMoveStep=3;
    this.autoPath=[];

    this.onceClicked=false;

    this.dposition={
        left:0,
        forward:0,
        up:0
    }//[0,0,0];//left、forward、up

    this.update=function () {
        if(scope.dposition.left)scope.left(scope.dposition.left);
        if(scope.dposition.forward)scope.forward(scope.dposition.forward);
        if(scope.dposition.up)scope.up(scope.dposition.up);
    }
    this.ableRotation=true;

    var myMouseManager=new MouseManager();
    myMouseManager.dragMouse=function (dx,dy) {
        scope.onceClicked=true;
        if(!scope.ableRotation)return;
        scope.rotation1(-0.015*dx);
        scope.rotation2(-0.015*dy);
    }
    myMouseManager.onMouseWheel=function(event){
        var delta = 0;
        if ( event.wheelDelta !== undefined )delta = event.wheelDelta;
        else if ( event.detail !== undefined )delta = - event.detail;
        scope.forward(delta/2);
    }

    var myKeyboardManager=new KeyboardManager();
    myMouseManager.init();
    myKeyboardManager.onKeyDown=function(event){
        var step=scope.KeyboardMoveStep;
        if(event.key==="ArrowUp"||event.key==="w")scope.dposition.forward=step;//forward(step);
        else if(event.key==="ArrowDown"||event.key==="s")scope.dposition.forward=-step;//forward(-step);
        else if(event.key==="q"||event.key==="Q")scope.dposition.up=step;
        else if(event.key==="e"||event.key==="E")scope.dposition.up=-step;
        else if(event.key==="ArrowLeft"||event.key==="a")scope.dposition.left=step;
        else if(event.key==="ArrowRight"||event.key==="d")scope.dposition.left=-step;

        else if(event.key==="W")scope.forward_horizon(step);
        else if(event.key==="S")scope.forward_horizon(-step);
        else if(event.key==="A")scope.left_horizon(step);
        else if(event.key==="D")scope.left_horizon(-step);
        else if(event.key==="v"){
            var a=Math.floor(scope.camera.rotation.x*100000)/100000;
            var b=Math.floor(scope.camera.rotation.y*100000)/100000;
            var c=Math.floor(scope.camera.rotation.z*100000)/100000;
            /*if(a<-Math.PI)a+=Math.PI*2;
            if(b<-Math.PI)b+=Math.PI*2;
            if(c<-Math.PI)c+=Math.PI*2;*/
            var s="["+
                Math.floor(scope.camera.position.x*100)/100+","+
                Math.floor(scope.camera.position.y*100)/100+","+
                Math.floor(scope.camera.position.z*100)/100+","+
                a+","+
                b+","+
                c+",100]"
            console.log(","+s);
            scope.autoPath.push(s);
        }else if(event.key==="V")alert(scope.autoPath);

    }
    myKeyboardManager.onKeyUp=function(event){
        if(event.key==="ArrowUp"||event.key==="w")        scope.dposition.forward=0;//forward(step);
        else if(event.key==="ArrowDown"||event.key==="s") scope.dposition.forward=0;//forward(-step);
        else if(event.key==="q"||event.key==="Q")         scope.dposition.up=0;
        else if(event.key==="e"||event.key==="E")         scope.dposition.up=0;
        else if(event.key==="ArrowLeft"||event.key==="a") scope.dposition.left=0;
        else if(event.key==="ArrowRight"||event.key==="d")scope.dposition.left=0;

    }
    myKeyboardManager.init();

    var myPhoneManager=new PhoneManager();
    myPhoneManager.drag=function(dx,dy){
        if(!scope.ableRotation)return;
        scope.rotation1(-0.015*dx);
        scope.rotation2(-0.015*dy);
    }
    myPhoneManager.dragDouble=function(distanceChange){
        scope.forward(distanceChange);
    }
    myPhoneManager.init();

    this.rotation1=function(step){//水平旋转
        var direction0=this.camera.getWorldDirection();
        var direction = new THREE.Vector3(//up方向
            0,1,0
        );
        var pos=this.camera.position;
        direction0.applyAxisAngle(direction,step);
        this.camera.lookAt(pos.x+direction0.x,
            pos.y+direction0.y,
            pos.z+direction0.z);
        this.camera.updateMatrix();
    }
    this.rotation2=function(step){//俯仰角
        var direction1=this.camera.getWorldDirection();
        var direction2 = new THREE.Vector3(//up方向
            0,1,0
        );
        var direction=new THREE.Vector3();
        direction=direction.crossVectors(direction1,direction2);
        var pos=this.camera.position;
        direction1.applyAxisAngle(direction,step);
        this.camera.lookAt(pos.x+direction1.x,
            pos.y+direction1.y,
            pos.z+direction1.z);
        this.camera.updateMatrix();
    }
    this.move=function(x,y,z){
        this.forward(x);
        this.up(y);
        this.left(z);
    }
    this.up=function (step) {//相机的上方向是（0，1，0）
        var direction = new THREE.Vector3(
            0.1*this.camera.matrixWorld.elements[4]*step
            ,0.1*this.camera.matrixWorld.elements[5]*step
            ,0.1*this.camera.matrixWorld.elements[6]*step
        );
        this.camera.position.set(
            this.camera.position.x+direction.x,
            this.camera.position.y+direction.y,
            this.camera.position.z+direction.z
        );
    }
    this.forward=function (step) {//相机的初始方向是（0，0，-1）//对y旋转-90度后相机为水平方向camera.rotation.set(0,-Math.PI/2,0);
        var direction = new THREE.Vector3(
            -0.1*this.camera.matrixWorld.elements[8]*step
            ,-0.1*this.camera.matrixWorld.elements[9]*step
            ,-0.1*this.camera.matrixWorld.elements[10]*step
        );
        this.camera.position.set(
            this.camera.position.x+direction.x,
            this.camera.position.y+direction.y,
            this.camera.position.z+direction.z
        );
    }
    this.left=function (step) {//相机的左方向是（-1，0，0）
        var direction = new THREE.Vector3(
            -0.1*this.camera.matrixWorld.elements[0]*step
            ,-0.1*this.camera.matrixWorld.elements[1]*step
            ,-0.1*this.camera.matrixWorld.elements[2]*step
        );
        this.camera.position.set(
            this.camera.position.x+direction.x,
            this.camera.position.y+direction.y,
            this.camera.position.z+direction.z
        );
    }
    this.left_horizon=function (step) {//相机的左方向是（-1，0，0）
        var direction = new THREE.Vector3(
            -0.1*this.camera.matrixWorld.elements[0]*step
            ,0
            ,-0.1*this.camera.matrixWorld.elements[2]*step
        );
        this.camera.position.set(
            this.camera.position.x+direction.x,
            this.camera.position.y+direction.y,
            this.camera.position.z+direction.z
        );
    }
    this.forward_horizon=function (step) {//相机的初始方向是（0，0，-1）//对y旋转-90度后相机为水平方向camera.rotation.set(0,-Math.PI/2,0);
        var direction = new THREE.Vector3(
            -0.1*this.camera.matrixWorld.elements[8]*step
            ,0
            ,-0.1*this.camera.matrixWorld.elements[10]*step
        );
        this.camera.position.set(
            this.camera.position.x+direction.x,
            this.camera.position.y+direction.y,
            this.camera.position.z+direction.z
        );
    }
}
function MouseManager(){
    var scope=this;
    this.press=false;//鼠标未处于按下状态
    this.preX=-1;
    this.preY=-1;
    this.dragMouse=function(dx,dy){
        console.log(dx,dy);
    }
    this.onMouseMove=function( event ) {//鼠标移动事件监听
        if(scope.press&&scope.preX!==-1&&scope.preY!==-1)
            scope.dragMouse(event.x-scope.preX,event.y-scope.preY);
        scope.preX=event.x;
        scope.preY=event.y;
    }
    this.onMouseUp=function( event ) {//鼠标移动事件监听
        scope.press=false;
        //console.log(1);
    }
    this.onMouseDown=function( event ) {//鼠标移动事件监听
        scope.press=true;
        //console.log(2);
    }
    this.onMouseWheel=function(event){
        console.log(event);
    }
    this.init=function() {
        document.addEventListener( 'mousemove',scope.onMouseMove, true );
        document.addEventListener( 'mouseup', scope.onMouseUp, true );
        document.addEventListener( 'mousedown',scope.onMouseDown, true );
        document.addEventListener( 'mousewheel', scope.onMouseWheel, false );
    }
}
function KeyboardManager(){
    var scope=this;
    this.onKeyDown=function(event){
        console.log(event);
    }
    this.onKeyUp=function(event){
        console.log(event);
    }
    this.init=function(){
        window.addEventListener( 'keydown',scope.onKeyDown, false );
        window.addEventListener( 'keyup',scope.onKeyUp  , false );
    }
}
function PhoneManager(){
    var scope=this;
    this.preX=-1;
    this.preY=-1;
    this.preDistance=-1;
    this.drag=function(dx,dy){
        console.log(dx,dy);
    }
    this.dragDouble=function(distanceChange){
        console.log(distanceChange);
    }
    this.onTouchMove = function (event) {
        //event.touches.length//同时出现的触摸点个数
        if(event.touches.length===1){
            if(scope.preX>=0&&scope.preY>=0)
                scope.drag(
                    event.touches[ 0 ].pageX-scope.preX,
                    event.touches[ 0 ].pageY-scope.preY
                );
            scope.preX=event.touches[ 0 ].pageX;
            scope.preY=event.touches[ 0 ].pageY;
        }else if(event.touches.length===2){
            var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
            var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
            var distance = Math.sqrt( dx * dx + dy * dy );
            if(scope.preDistance>=0)
                scope.dragDouble(distance-scope.preDistance);
            scope.preDistance=distance;
        }
    }
    this.onTouchEnd=function () {
        scope.preX=-1;
        scope.preY=-1;
        scope.preDistance=-1;
    }
    this.init=function(){
        /*function test(){
            console.log(scope.preY);
            requestAnimationFrame(test);
        }test();*/
        document.addEventListener( 'touchmove', scope.onTouchMove, false );
        document.addEventListener( 'touchend', scope.onTouchEnd, false );
    }
}