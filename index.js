//Define constants for the game.
const BULLET_SPEED = 5;
const BOARD_WIDTH = 800;
const BOARD_LENGTH = 800;
const TANK_SPEED = 5;
const TANK_SIZE = 128;
const ROTATION_SPEED = 4;
const BULLET_TIMEOUT_MS = 500
//Define variables for web server.
const express = require('express');
const http = require('http');
const url = require('url');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

server.listen(8080, function listening() {
  console.log('Listening on %d', server.address().port);
});

tanks = [];
connections = [];

function joinTank(tank){
  tanks.push(new Tank(this.tanks.length));
}

function leaveTank(tankID){
  tanks.splice(tankID, 1);
  for(var x = tankID, n = tanks.length; x < n; x++){
    tanks[x].id = x;
  }
}


class Tank {
  constructor(id){
    this.id = id;
    this.bullets = [];
    this.angle = Math.floor(Math.random() * 360);
    this.x = Math.floor(Math.random() * BOARD_WIDTH);
    this.y = Math.floor(Math.random() * BOARD_LENGTH);
    this.canShoot = true;
  }



  shoot(){

    if(this.canShoot){
      this.canShoot = false;
      var that = this;
      setTimeout(function(){that.canShoot = true}, BULLET_TIMEOUT_MS);
      var bullet = new Bullet(this.angle, this.x, this.y, this.bullets.length, this.id);
      this.bullets.push(bullet);
      for(var x = 0, n = connections.length; x < n; x++){
          connections[x].send(JSON.stringify([3, [this.id, bullet.id, this.x, this.y]]));
      }
      bullet.move();
    }
  }

  move(direction){

    console.log(Math.cos(this.angle) * TANK_SPEED + " " + Math.sin(this.angle) * TANK_SPEED)
    if(direction == 1){
      var newX = this.x + Math.cos(this.angle * (Math.PI / 180)) * TANK_SPEED;
      var newY = this.y + Math.sin(this.angle * (Math.PI / 180)) * TANK_SPEED;
    }
    else if(direction == 0){
      var newX = this.x - Math.cos(this.angle * (Math.PI / 180)) * TANK_SPEED;
      var newY = this.y - Math.sin(this.angle * (Math.PI / 180)) * TANK_SPEED;
    }

    var willCrash = false;
    /*
    for(var i = 0, n = tanks.length; i < n; i++){
      if(Math.abs(newX - tanks[i].x) <= TANK_SIZE/2 && Math.abs(newY - tanks[i].y) <= TANK_SIZE/2 && i != this.id){
        willCrash = true;
        break;
      }
    }
    */
    //if(!willCrash){
      willCrash = (newX >= BOARD_WIDTH || newX <= 0 || newY >= BOARD_LENGTH || newY <= 0);
    //}

    if(!willCrash){
      this.x = newX;
      this.y = newY;
      console.log(this.x + " " + this.y + " " + this.angle);
      for(var x = 0, n = connections.length; x < n; x++){
        connections[x].send(JSON.stringify([1, [this.id, this.x, this.y]]));
      }
    }

  }

  rotate(direction){

    if(direction == 1){
      this.angle = (this.angle + ROTATION_SPEED) % 360;
    }
    else if (direction == 0){
      this.angle = (this.angle - ROTATION_SPEED) % 360;
    }

    for(var x = 0, n = connections.length; x < n; x++){
        connections[x].send(JSON.stringify([2, [this.id, this.angle]]));
    }
  }

  respawn(){
    this.angle = Math.floor(Math.random() * 360);
    this.x = Math.floor(Math.random() * BOARD_WIDTH);
    this.y = Math.floor(Math.random() * BOARD_LENGTH);
    this.canShoot = true;
  }
}



class Bullet {
  constructor(angle, x, y, id, tankID){
    this.angle = angle;
    this.x = x;
    this.y = y;
    this.id = id;
    this.tankID = tankID;
  }
  check(){
    try{
      for(var i = 0, n = tanks.length; i < n; i++){
        //Check for collision with other tanks.
        if (Math.abs(this.x - tanks[i].x) <= TANK_SIZE/2 && Math.abs(this.y - tanks[i].y) <= TANK_SIZE/2 && i != this.tankID){
          console.log(this.tankID);
          console.log(tanks[this.tankID]);
          tanks[this.tankID].bullets.splice(this.id, 1);
          for(var x = this.id, n = tanks[this.tankID].bullets.length; x < n; x++){
            tanks[this.tankID].bullets[x].id = x;
          }
          return true;
        }
      }

      //Check for edge of board.
      if (this.x > BOARD_WIDTH || this.x < 0 || this.y > BOARD_LENGTH || this.y < 0){
        tanks[this.tankID].bullets.splice(this.id, 1);
        for(var x = this.id, n = tanks[this.tankID].bullets.length; x < n; x++){
          tanks[this.tankID].bullets[x].id = x;
        }
        return true;
      }
      return false;
    }
    catch (e){

    }

  }

  move(){

    this.x += Math.cos(this.angle * (Math.PI / 180)) * BULLET_SPEED;
    this.y += Math.sin(this.angle * (Math.PI / 180)) * BULLET_SPEED;

    for(var x = 0, n = connections.length; x < n; x++){
      connections[x].send(JSON.stringify([4, [this.tankID, this.id, this.x, this.y]]));
    }

    if(!this.check()){
      var that = this
      setTimeout(function(){that.move()}, 50)
    }
    else{
      for(var x = 0, n = connections.length; x < n - 1; x++){
        connections[x].send(JSON.stringify([7, [this.tankID, this.id]]));
      }
    }
  }

}

wss.on('connection', function connection(ws, req) {
  connections.push(ws);
  console.log('A player has connected.');
  joinTank();
  ws.send(JSON.stringify([0,tanks]));
  for(var x = 0, n = connections.length; x < n - 1; x++){
    connections[x].send(JSON.stringify([5, tanks[n - 1]]));
  }

  ws.on('close', function close() {

    for(var x = 0, n = connections.length; x < n; x++){
      if(x != connections.indexOf(ws)){
        connections[x].send(JSON.stringify([6, connections.indexOf(ws)]));
      }
    }
    leaveTank(connections.indexOf(ws));
    connections.splice(connections.indexOf(ws), 1);
    console.log('A player has disconnected.');

  });

  ws.on('message', function process(data) {
    var tank = tanks[connections.indexOf(ws)];

    //Tank Shoot
    if(data[0] == 0){
      tank.shoot();
    }
    //Tank Move
    else if(data[0] == 1){
      tank.move(data[2]);
    }
    else if (data[0] == 2){
      tank.rotate(data[2]);
    }

  });


});
