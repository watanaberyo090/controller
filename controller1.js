window.addEventListener("DOMContentLoaded", init);

import * as THREE from 'three';
// WebVRの判定、遷移ボタンのスクリプト
import { VRButton } from "three/addons/webxr/VRButton.js";
// WebXRのポリフィルを読み込み
import WebXRPolyfill from "webxr-polyfill";
//コントローラをモデリングするやつ、three@0.150.1は使用バージョン
import { XRControllerModelFactory } from 'https://unpkg.com/three@0.150.1/examples/jsm/webxr/XRControllerModelFactory.js';
//PC上で滑らかにカメラコントローラーを制御する為に使用↓
import { OrbitControls } from 'https://unpkg.com/three@0.150.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
let controller1, controller2;//1が左手、2が右手
let controllerGrip1, controllerGrip2;


/* ----Map関係---- */

/* ----Map関係---- */ 

async function init() {
  /* ----基本的な設定----- */
  // WebXRのポリフィルを有効にする
  const polyfill = new WebXRPolyfill();

  // サイズを指定
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // シーンの作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color( 0xe0ffff );
  
  // レンダラーの作成
  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(width, height);
  
  renderer.xr.enabled = true;// レンダラーのXRを有効化
  document.body.appendChild(renderer.domElement);
  // WebVRの開始ボタンをDOMに追加
  document.body.appendChild(VRButton.createButton(renderer));

  // カメラを作成
  const camera = new THREE.PerspectiveCamera(90, width / height);
  //CSVデータを格納するやつら
  let trafficAccident = [];
  let trafficVolume = [];
  let Road = [];
  let worldTimer = 8;
  
  // カメラ用コンテナを作成(3Dのカメラを箱に入れて箱自体を動かす) ＜ーーーーーー大事！カメラ自体を動かせないらしい
  const cameraContainer = new THREE.Object3D();
  cameraContainer.position.set( 2, 100, 5 );
  cameraContainer.add(camera);
  scene.add(cameraContainer);
  
  //コントローラーのステック操作
  let VRconnect = false;

  //マップのデータ
  const CenterLatitude = 356791527,CenterLongitude = 1397686666;//中心の緯度,経度（度）
  const East = convertLatitudeAndLongitude("1394630000"),//東西南北の緯度、経度（度）
        West = convertLatitudeAndLongitude("1394545000"),
        North = convertLatitudeAndLongitude("354060000"),
        South = convertLatitudeAndLongitude("354030000");
  // 光源を作成
  {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    //光源を作成
		const light = new THREE.DirectionalLight( 0xffffff, 2.5);
		light.position.set( 200, 400, 200 );
		scene.add( light );
  }
  /* ----基本的な設定----- */
  /* ----Map関係---- */
  //モデルデータをまとめるグループ
  var mapGroup = new THREE.Group();
  // GLTF形式のモデルデータを読み込む
  const loader = new GLTFLoader();
  // GLTFファイルのパスを指定
  const objects1 =await loader.loadAsync("gltf/53394611_bldg_6697_2_op/53394611_bldg_6697_2_op.gltf");//gltf
  // 読み込み後に3D空間に追加
  const model1 = objects1.scene;
  const objects2 = await loader.loadAsync("gltf/533946_dem_6697_op/533946_dem_6697_op.gltf");//gltf
  const model2 = objects2.scene;
  const objects3 = await loader.loadAsync("gltf/53394611_brid_6697_op/53394611_brid_6697_op.gltf");//gltf
  const model3 = objects3.scene;
  const objects4 = await loader.loadAsync("gltf/53394611_tran_6668_op/53394611_tran_6668_op.gltf");//gltf
  const model4 = objects4.scene;
  mapGroup.add(model1);
  mapGroup.add(model2);
  mapGroup.add(model3);
  mapGroup.add(model4);
  scene.add(mapGroup);
  //mapの大きさ0.01倍
  mapGroup.scale.set(1, 1, -1);//z軸が反転してしまうため行う

  /* ----Map関係---- */
  /* ----CSV関係---- */
  var req1 = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
  req1.open("get", "honhyo_2024.csv", true); // アクセスするファイルを指定
  req1.overrideMimeType("text/plain; charset=Shift_JIS");//文字コードの上書き
  req1.send(null); // HTTPリクエストの発行
  
  var accidentGroup = new THREE.Group();
  // レスポンスが返ってきたらconvertCSVtoArray()を呼ぶ	
  req1.onload = function(){
	  convertCSVtoArrayAccident(req1.responseText); // 渡されるのは読み込んだCSVデータ
    // console.log(trafficAccident[1][1]);
    // 追加 阿部
    for(let i = 1; i < trafficAccident.length; i++){
        if(trafficAccident[i][1] == 30){
          const data1 = convertLatitudeAndLongitude(trafficAccident[i][54]);
          if(South < data1 && data1 < North){//範囲内の緯度（度分秒）かを確認
            const data2 = convertLatitudeAndLongitude(trafficAccident[i][55]);
            // console.log(data2);
            if(West<data2 && data2<East){//範囲内の経度（度分秒）かを確認
              const num1 = CenterLatitude-data1;//中心からの距離、緯度（度）
              const num2 = data2-CenterLongitude;//中心からの距離、経度（度）
              let leverage1 = 0;//
              let leverage2 = 0;//
              //オブジェクトの中心がずれているため、正負によって処理を変える
              //※jsのZ軸は北が負、南が正（EUSになってる）※
              if(num1<0){//中心より北にある
                leverage1 = 484/(North-CenterLatitude);//
              }else{//中心より南にある
                leverage1 = 478/(CenterLatitude-South);//
              }
              if(num2<0){//中心より西にある
                leverage2 = 585/(CenterLongitude-West);//
              }else{//中心より東にある
                leverage2 = 575/(East-CenterLongitude);//
              }
              const posX = num2*leverage2-1;//経度からポジションを計算
              const posZ = num1*leverage1;//緯度からポジションを計算
              createAccidentPoint(posX, posZ, i);
              console.log(posX +"  "+posZ);
            }
          }
        }
    }
    
    createAccidentPoint(0, 0, 100);
    scene.add(accidentGroup);
    // console.log(1);
    
  }
  
  
  var volumeGroup = new THREE.Group();
  var req3 = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
  req3.open("get", "LatitudeAndLongitudeOfRoad.csv", true); // アクセスするファイルを指定
  req3.overrideMimeType("text/plain; charset=Shift_JIS");//文字コードの上書き
  req3.send(null); // HTTPリクエストの発行
  req3.onload = function(){
    convertCSVtoArrayRoad(req3.responseText);
    console.log(3);
    var req2 = new XMLHttpRequest(); // HTTPでファイルを読み込むためのXMLHttpRrequestオブジェクトを生成
    req2.open("get", "zkntrf13.csv", true); // アクセスするファイルを指定
    req2.overrideMimeType("text/plain; charset=Shift_JIS");//文字コードの上書き
    req2.send(null); // HTTPリクエストの発行
    req2.onload = function(){
      convertCSVtoArrayVolume(req2.responseText);
      // console.log(Road);
      
      for(let i = 1; i < Road.length-1; i++){
        // let roadNum = [];
        // let roadCount = 0;
        for(let j = 1; j < trafficVolume.length; j++){
          if(Road[i][0] == trafficVolume[j][0] && Road[i][1] == trafficVolume[j][1]){
            Road[i].push(j);
          } 
        }
        createTrafficVolumeObject(Number(Road[i][2]), Number(Road[i][3]), Number(Road[i][4]), Number(Road[i][5]), Number(Road[i][6]),i); //pos1Z, pos1X, pos2Z, pos2X, num
        // console.log(Road[i][6]);
        // console.log(Road[i]);
      }
      
      // createTrafficVolumeObject(100, 100, 0, 0, 0); //pos1X, pos1Z, pos2X, pos2Z, num
    
      scene.add(volumeGroup);
    }
  }
  var groupsToIntersect = [accidentGroup,volumeGroup];

  function convertLatitudeAndLongitude(str){ //度分秒から度に変換する
    let strCount = str.toString().length;//交通省のデータが度分秒で配布してるから
    if(strCount == 9){//読み込んだ緯度（9桁）のデータを変換する
      var deg = Number(str.slice(0,2));//度
      var min = Number(str.slice(2,4));//分
      var sec = Number(str.slice(4));//秒
      var result = Math.round((deg+min/60+sec/1/3600000)*10000000);
      return result;
    }else{//読み込んだ経度（8桁のはず）のデータを変換する
      var deg = Number(str.slice(0,3));//度
      var min = Number(str.slice(3,5));//分
      var sec = Number(str.slice(5));//秒
      var result = Math.round((deg+min/60+sec/1/3600000)*10000000);
      return result;
    }
  }

  function convertCSVtoArrayAccident(str){ // 読み込んだCSVデータが文字列として渡される
    let tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
    //各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
    for(var i=0;i<tmp.length;++i){
      trafficAccident[i] = tmp[i].split(',');
    }
  }
  function convertCSVtoArrayVolume(str){ // 読み込んだCSVデータが文字列として渡される
    let tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
    //各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
    for(var i=0;i<tmp.length;++i){
      trafficVolume[i] = tmp[i].split(',');
    }
  }
  function convertCSVtoArrayRoad(str){ // 読み込んだCSVデータが文字列として渡される
    let tmp = str.split("\n"); // 改行を区切り文字として行を要素とした配列を生成
    //各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
    for(var i=0;i<tmp.length;++i){
      Road[i] = tmp[i].split(',');
    }
  }
  /* ----CSV関係---- */

  

  /* ----コントローラー設定----- */
  
  // コントローラーイベントの設定
  function onSelectStart() {//トリガーボタンを押したら発火
    this.userData.isSelecting = true;
  }
  function onSelectEnd() {//トリガーボタンを離したら発火
    this.userData.isSelecting = false;
  }
  function onSqueezeStart(){//スクイーズボタンを押したら発火
    this.userData.isSelecting = true;
  }
  function onSqueezeEnd(){//スクイーズボタンを離したら発火
    this.userData.isSelecting = false;
  }

  //コントローラー取得
  controller1 = renderer.xr.getController( 0 );
  controller1.addEventListener( 'selectstart', onSelectStart);
  controller1.addEventListener( 'selectend', onSelectEnd );
  controller1.addEventListener('squeezestart', onSqueezeStart);
  controller1.addEventListener('squeezeend', onSqueezeEnd);
  // controller1.addEventListener('gamepadconnected', (event) => {
  //   const gamepad = event.gamepad;
  //   // サムスティックの変更があったときの処理
  //   controller1.userData.isSelecting = true;
  //   cameraContainer.position.x -= 0.1;
  //   // ここでサムスティックの値に基づいた処理を実装
  // });
  controller1.addEventListener( 'connected', ( event )=> {
    if('gamepad' in event.data){//接続した際にコントローラの情報を渡していたはず
        if('axes' in event.data.gamepad){
          controller1.gamepad = event.data.gamepad;
          VRconnect = true;//接続されたかのフラグ
        }
    }
  });
  cameraContainer.add(controller1);
  controller2 = renderer.xr.getController( 1 );
  controller2.addEventListener( 'selectstart', onSelectStart );
  controller2.addEventListener( 'selectend', onSelectEnd );
  controller2.addEventListener('squeezestart', onSqueezeStart);
  controller2.addEventListener('squeezeend', onSqueezeEnd);
  controller2.addEventListener( 'connected', ( event )=> {
    if('gamepad' in event.data){
        if('axes' in event.data.gamepad){
          controller2.gamepad = event.data.gamepad;
        }
    }
  });
  cameraContainer.add(controller2);
  //コントローラーモデルを取得
  const controllerModelFactory = new XRControllerModelFactory();
  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  cameraContainer.add( controllerGrip1 );
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
  cameraContainer.add( controllerGrip2 );
  //コントローラーから出る光線の作成
  const geo = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, - 1 )]);
  const mat = new THREE.LineBasicMaterial({color: 0xf5f5f5});
  const line = new THREE.Line( geo , mat );
  line.name = 'line';
  line.scale.z = 10;//光線の長さ
  controller1.add( line.clone() );
  controller2.add( line.clone() );
  //詳細情報を表示する板
  let geometry = new THREE.BoxGeometry(0.2,0.2,0.01);
  // let material = new THREE.MeshLambertMaterial({color: 0x000000});
  // 各面に表示するテキスト
// const texts = ["Front", "Back", "Top", "Bottom", "交通量", "Right"];

// マテリアルの設定
// let materials = [];
// for (let i = 0; i < 6; i++) {
//   if(i == 6){
//     const texture = new THREE.CanvasTexture(createTextCanvas(texts[i]));
//     materials.push(new THREE.MeshBasicMaterial({ map: texture }));
//   }else{
  let materials =new THREE.MeshLambertMaterial({color: 0x000000});
    // materials.push(new THREE.MeshLambertMaterial({color: 0x000000}));
    // materials[i].transparent = true;
    // materials[i].opacity = 0.5; 
  // }
// }
  let detailsObj = new THREE.Mesh(geometry, materials);
  detailsObj.position.set(0,0.1,0.1);
  detailsObj.material.transparent = true;
  detailsObj.material.opacity = 0.7; 
  controller2.add(detailsObj);
  detailsObj.visible = false;

  // テキストを描画するCanvasを作成する関数
function createTextCanvas(text) {
  const canvas = document.createElement('canvas');
  // const context = canvas.getContext('2d');
  const context = canvas.getContext('2d', {willReadFrequently:true});
  // context.fillStyle = 'white';
  context.fillRect(0, 0, detailsObj.width, detailsObj.height);
  context.font = '80px UTF-8';
  // context.fillStyle = 'black';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  let measure=context.measureText(text);
  canvas.width=measure.width;
  canvas.height=2*(measure.fontBoundingBoxAscent+measure.fontBoundingBoxDescent);//キャンバスの高さを調節、たぶん2倍ぐらいにする
  // console.log(context);
  context.font = '16px UTF-8';
  // context.fillStyle = 'black';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  // //透明にする
  // context.globalCompositeOperation = 'destination-out';
  // context.fillStyle="rgb(255,255,255)";
  // context.fillRect(0,0,canvas.width,canvas.height);
  // //通常描画にする
  context.globalCompositeOperation = 'source-over';
  context.fillStyle='white';
  // context.fillText(text, canvas.width / 2, canvas.height / 2);
  const lines = text.split('\n');//改行で切る
  for (let i = 0; i < lines.length; i++) {
    context.fillText(lines[i],canvas.width / 2, canvas.height / 4 +i*20);
  }
  // context.fillText(text,Math.abs(measure.actualBoundingBoxLeft),measure.actualBoundingBoxAscent);
  let png=canvas.toDataURL('image/png');//キャンバスに画像を張り付ける
  // return canvas;
  return {img:png, w:canvas.width, h:canvas.height};
}
  

  //機能
	function handleController1( controller ) {//controller1の処理
		const userData = controller.userData;
    const controllerData = controller.gamepad;
		if ( userData.isSelecting === false ) {//コントローラーボタンが押された際の処理
      
      if(controllerData.buttons[0].pressed == true){//トリガーボタン
        cameraContainer.position.y += controllerData.buttons[0].value;
      }else if(controllerData.buttons[1].pressed == true){//スクイーズボタン
        cameraContainer.position.y -= controllerData.buttons[1].value;
      }else if(controllerData.buttons[2].pressed == true){//
        cameraContainer.position.x -= controllerData.buttons[2].value;
      }else if(controllerData.buttons[3].pressed == true){//
        cameraContainer.position.x += controllerData.buttons[3].value;
      }else if(controllerData.buttons[4].pressed == true){//
        cameraContainer.position.z -= controllerData.buttons[4].value;
      }else if(controllerData.buttons[5].pressed == true){//
        cameraContainer.position.z += controllerData.buttons[5].value;
      }else if(controllerData.buttons[6].pressed == true){//
        cameraContainer.position.y -= controllerData.buttons[6].value;
      }
		} else {
      let cameraRotation = camera.rotation;
      const bugRotat = (Math.abs(cameraRotation.x)+Math.abs(cameraRotation.z));
      let speed = (Math.abs(controllerData.axes[2])+Math.abs(controllerData.axes[3]))/2;
      if(bugRotat > 3){
        speed *= -1;
        cameraRotation.y *= -1;
      }
      move(cameraRotation , speed);
		}

    
	}

  function handleController2( controller ) {//controller2の処理
    const controllerData = controller.gamepad;
    console.log(controller);
    if(controllerData.buttons[0].pressed == true){
      // レイと交差しているシェイプの取得
      const intersections = getIntersectionsAccident(controller);
      if(intersections.length > 0){//一つ以上交差している時処理する
        const intersection = intersections[0];
        const object = intersection.object;
        if(object.geometry.type == 'BoxGeometry'){//交通量の処理
          object.material.opacity = 0.4;//透明度変更
          // object.material.color.g = 0.2;
          intersected.push(object);
          // console.log(trafficAccident[0][7]);
          // console.log(object);
        }else if(object.geometry.type == 'CylinderGeometry'){//交通事故の処理
          object.material.color.g = 0.2;//オブジェの緑を変更
          intersected.push(object);
          // console.log(intersection);
        }
        // console.log(object);
        if(!detailsObj.visible){//オブジェクト見えるフラグがfalseなら実行
          detailsObj.visible = true;
          //詳細表示の画像作成//////////////////////////////////////////////////////
          const N = object.name;
          let tet = "詳細\n";
          if(object.geometry.type == 'BoxGeometry'){//交通量の処理
            tet = "交通量"+tet;
            const year = trafficVolume[N][7].slice(0 ,4);
            const month = trafficVolume[N][7].slice(4 ,6);
            const tetTime ="観測日時\n"+year+"/"+month;
            tet = tet + tetTime;

            let numCar = 0;
            for(let i = 0; i < Road[N].length; i++){
              const numCheck = Road[N][i];
              if(typeof numCheck === 'number'){
                let timer = 4+worldTimer;
                numCar += parseInt(trafficVolume[numCheck][timer]);
                // console.log(trafficNum);
              }
            }
            tet = tet + "\n一時間当たりの台数\n"+numCar+"台";

            const weather = trafficVolume[N][8];
            if(weather==1) tet = tet + "\n天候  晴れ";
            else if(weather==2) tet = tet + "\n天候  曇り";
            else if(weather==3) tet = tet + "\n天候  雨";
            else if(weather==4) tet = tet + "\n天候  霧";
            else if(weather==5) tet = tet + "\n天候  雪";
            else{tet = tet + "\n天候  不明";}
            

          }else if(object.geometry.type == 'CylinderGeometry'){//交通事故の処理
            tet = "事故"+tet;
            let day = trafficAccident[N][56];
            switch (day) {
              case '1':
                day = "日";
                break;
              case '2':
                day = "月";
                break;
              case '3':
                day = "火";
                break;
              case '4':
                day = "水";
                break;
              case '5':
                day = "木";
                break;
              case '6':
                day = "金";
                break;
              default:
                day = "土";
                break;
            }
            const tetTime ="日時 "+trafficAccident[N][11]+"/"+trafficAccident[N][12]+"/"+trafficAccident[N][13]+"("+day+") "+trafficAccident[N][14]+":"+trafficAccident[N][15];
            tet = tet + tetTime;

            const weather = trafficAccident[N][17];
            if(weather==1) tet = tet + "\n天候  晴れ";
            else if(weather==2) tet = tet + "\n天候  曇り";
            else if(weather==3) tet = tet + "\n天候  雨";
            else if(weather==4) tet = tet + "\n天候  霧";
            else{tet = tet + "\n天候  雪";}
            
            let kind = trafficAccident[N][33];
            switch (kind) {
              case '21':
                tet = tet+"\n類型  車両同士";
                break;
              case '41':
                tet = tet+"\n類型  車両単独";
                break;
              case '61':
                tet = tet+"\n類型  列車";
                break;
              default:
                tet = tet+"\n類型  人対車両";
                break;
            }

            let pavement = trafficAccident[N][19];
            switch (pavement) {
              case '1':
                tet = tet+"\n道路表面  乾燥している";
                break;
              case '2':
                tet = tet+"\n道路表面  湿っている";
                break;
              case '3':
                tet = tet+"\n道路表面  凍っている";
                break;
              case '4':
                tet = tet+"\n道路表面  積雪";
                break;
              default:
                tet = tet+"\n道路表面  舗装されていない";
                break;
            }
          }



          // const tet = "道路\n番号"+"\n"+object.name;
          const png = createTextCanvas(tet);
          const textureText = new THREE.TextureLoader().load( png.img );
          const materialText=new THREE.MeshBasicMaterial({
            color:0xffffff, map:textureText ,side:THREE.FrontSide,
            transparent:true, opacity:1.0,
          });
          //平面ジオメトリの作成
          const planeGeo=new THREE.PlaneGeometry(png.w/1000, png.h/1000,1,1);
          //メッシュの作成
          const meshText=new THREE.Mesh(planeGeo,materialText);
          meshText.position.set(0, 0.01, 0.02);
          detailsObj.add(meshText);
          // const texture = new THREE.CanvasTexture(createTextCanvas(texts[4]));
          // const mate = new THREE.MeshBasicMaterial({ map: texture });
          // detailsObj.material[4] = mate;
          // materials[4].transparent = true;
          // materials[4].opacity = 1; 
          // console.log(tet)
        }
      }
      // console.log(intersections);
    }else{//右コントローラのトリガーボタンが押されてない場合
      if(detailsObj.children){
        detailsObj.children.pop();
      }
      detailsObj.visible = false;
    }
    if(controllerData.buttons[3].pressed == true){
      cameraContainer.position.y += controllerData.buttons[3].value;
    }
  }
  // 移動関数
  function move(orientation , speed) {
    const direction = new THREE.Vector3(controller1.gamepad.axes[2], 0, controller1.gamepad.axes[3]);
    direction.applyQuaternion(new THREE.Quaternion(0, orientation.y, 0));
    cameraContainer.position.addScaledVector(direction, speed);
  }
  /* ----コントローラー設定----- */
//追加 阿部 事故を表すオブジェクトの生成
function createAccidentPoint(posX, posZ, num) {
  // var pin = new THREE.Group();
  // const geometry = new THREE.BoxGeometry(3,3,3);
  // const material = new THREE.MeshLambertMaterial({color: 0xffd700});
  // const cube = new THREE.Mesh(geometry, material);
  // cube.position.set(posX, 200, posZ);
  // cube.name = num;
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(1,1,200),new THREE.MeshPhongMaterial({color: 0xFFd700}));
  ray.material.transparent = true;
  ray.position.set(posX, 100, posZ);
  ray.name = num;
  // pin.add(ray);
  // pin.add(cube);
  // pin.name = "pin";
  // accidentGroup.add(pin);
  accidentGroup.add(ray);
  // accidentGroup.add(cube);
  // console.log(accidentGroup);
}
const threshold = 3000;//閾値
//追加 阿部 交通量を表すオブジェクトの生成
function createTrafficVolumeObject(pos1Z, pos1X, pos2Z, pos2X, wid, num){//Road[i][3], Road[i][2], Road[i][5], Road[i][4], Road[i][6],i
  let trafficNum = 0;
  for(let i = 0; i < Road[num].length; i++){
    const numCheck = Road[num][i];
    if(typeof numCheck === 'number'){
      let timer = 4+worldTimer;
      trafficNum += parseInt(trafficVolume[numCheck][timer]);
      // console.log(trafficNum);
    }
  }
 
  //交通量が少ない場合は交通量の値が含まれる領域に応じて色を変更
  let material = new THREE.MeshLambertMaterial({color: 0xff0000}); //交通量が最低領域の場合の色を設定
  if(trafficNum < threshold){ //領域（仮の値）
    material.color.r = trafficNum/threshold;
    material.color.g = 0;
    material.color.b = 1-(trafficNum/threshold);
  }
  const centerFor1Z = CenterLatitude-pos1Z;//中心からの距離、緯度（度）
  const centerFor1X = pos1X-CenterLongitude;//中心からの距離、経度（度）
  const centerFor2Z = CenterLatitude-pos2Z;//中心からの距離、緯度（度）
  const centerFor2X = pos2X-CenterLongitude;//中心からの距離、経度（度）
  let leverage1Z = 0;//
  let leverage1X = 0;//
  let leverage2Z = 0;//
  let leverage2X = 0;//
  //オブジェクトの中心がずれているため、正負によって処理を変える
  //※jsのZ軸は北が負、南が正（EUSになってる）※
  if(centerFor1Z<0){//中心より北にある
    leverage1Z = 484/(North-CenterLatitude);//
  }else{//中心より南にある
    leverage1Z = 478/(CenterLatitude-South);//
  }
  if(centerFor1X<0){//中心より西にある
    leverage1X = 585/(CenterLongitude-West);//
  }else{//中心より東にある
    leverage1X = 575/(East-CenterLongitude);//
  }
  if(centerFor2Z<0){//中心より北にある
    leverage2Z = 484/(North-CenterLatitude);//
  }else{//中心より南にある
    leverage2Z = 478/(CenterLatitude-South);//
  }
  if(centerFor2X<0){//中心より西にある
    leverage2X = 585/(CenterLongitude-West);//
  }else{//中心より東にある
    leverage2X = 575/(East-CenterLongitude);//
  }
  console.log(centerFor1X);
  console.log(leverage1X);
  const posAX =centerFor1X*leverage1X;//経度からポジションを計算
  const posAZ =centerFor1Z*leverage1Z;//緯度からポジションを計算
  const posBX =centerFor2X*leverage2X;//経度からポジションを計算
  const posBZ =centerFor2Z*leverage2Z;//緯度からポジションを計算

  let pointA = new THREE.Vector3(posAX, 2, posAZ);
  let pointB = new THREE.Vector3(posBX, 2, posBZ);
  // let pointA = new THREE.Vector3(500, 100, 475);
  // let pointB = new THREE.Vector3(0, 100, 0);
  let direction = new THREE.Vector3().copy(pointB).sub(pointA);
  
  let lenge = direction.length();
  direction.normalize();
  // console.log(lenge);
  const geometry = new THREE.BoxGeometry(wid*3,5,lenge);
  const cube = new THREE.Mesh(geometry, material);
  cube.material.transparent = true;
  cube.material.opacity = 0.7;
  cube.position.copy(pointA).add(direction.clone().multiplyScalar(lenge / 2));
  cube.lookAt(pointB);
  cube.name = num;
  // cube.rotation.set(rotX, rotY, 0);
  volumeGroup.add(cube);
  // console.log(volumeGroup);
}
/*--------↓接触処理----------*/
  // レイと交差しているシェイプの一覧
  const intersected = [];
  // ワーク行列
  const tempMatrix = new THREE.Matrix4();

  // レイキャスターの準備
  const raycaster = new THREE.Raycaster();
  // レイと交差しているシェイプの取得
  function getIntersectionsAccident(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    return raycaster.intersectObjects(groupsToIntersect, true);
  }

  // function getIntersectionsVolume(controller) {
  //   tempMatrix.identity().extractRotation(controller.matrixWorld);
  //   raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  //   raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  //   return raycaster.intersectObjects(volumeGroup.children, false);
  // }

  //
  // var clock = 0;
  // function timeKeeper(){
  //   if(worldTimer > 30){
  //     worldTimer = worldTimer%24;
  //   }else if(worldTimer < 7){
  //     worldTimer = 30 - (7-worldTimer);
  //   }
  //   clock++;
  //   worldTimer += clock/100;
  //   console.log(clock);
  // }

  // シェイプとコントローラのレイの交差判定のクリア
  function cleanIntersected() {
    while (intersected.length) {
      const object = intersected.pop();
      
      if(object.geometry.type == 'BoxGeometry'){//交通量の処理
        object.material.color.g = 0;
        object.material.opacity = 0.7;
      }else if(object.geometry.type == 'CylinderGeometry'){//交通事故の処理
        object.material.color.g = 0.85;
      }
    }
  }
  // シェイプとコントローラのレイの交差判定
  function intersectObjects(controller) {
    // 選択時は無処理
    if (controller.userData.selected !== undefined) return;
    // レイと交差しているシェイプの取得
    const intersections = getIntersectionsAccident(controller);
    if (intersections.length > 0) {
      // 交差時の処理
      const intersection = intersections[0];
      const object = intersection.object;
      object.material.color.g = 0.4;
      intersected.push(object);
    }
  }
/*--------↑接触処理----------*/

  // レンダラーにループ関数を登録
  renderer.setAnimationLoop(tick);
  
  // 毎フレーム時に実行されるループイベント
  function tick() {
    // レンダリング
    if(VRconnect){
      cleanIntersected();
      // timeKeeper();
      intersectObjects( controller2 );
      handleController1( controller1 );
      handleController2( controller2 );
    }
    renderer.render(scene, camera);
  }

  // リサイズ処理
  window.addEventListener("resize", onResize);
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}