//Define constants for the game.
const BULLET_SPEED = 4;
const BOARD_WIDTH = 1600;
const BOARD_LENGTH = 800;
const TANK_SPEED = 2;
const TANK_SIZE = 64;
const ROTATION_SPEED = 2;
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

function leaveTank(tankID)
{

  for(var x = 0, n = tanks[tankID].bullets.length; x < n; x++){
    tanks[tankID].bullets[x].isDead = true;

  }

  tanks.splice(tankID, 1);
  for(var x = tankID, n = tanks.length; x < n; x++){
    tanks[x].id = x;
    for(var y = 0, t = tanks[x].bullets.length; y < t; y++){
      tanks[x].bullets[y].id = x;
    }
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
        if(connections[x].readyState == WebSocket.OPEN){
          connections[x].send(JSON.stringify([3, [this.id, bullet.id, this.x, this.y]]));
        }
      }
      bullet.move();
    }
  }

  move(direction){
    if(direction == 1){
      var newX = this.x + Math.cos(this.angle * (Math.PI / 180)) * TANK_SPEED;
      var newY = this.y + Math.sin(this.angle * (Math.PI / 180)) * TANK_SPEED;
    }
    else if(direction == 0){
      var newX = this.x - Math.cos(this.angle * (Math.PI / 180)) * TANK_SPEED;
      var newY = this.y - Math.sin(this.angle * (Math.PI / 180)) * TANK_SPEED;
    }

    if(!(newX >= BOARD_WIDTH || newX <= 0 || newY >= BOARD_LENGTH || newY <= 0)){
      this.x = newX;
      this.y = newY;

      for(var x = 0, n = connections.length; x < n; x++){
        if(connections[x].readyState == WebSocket.OPEN){
          connections[x].send(JSON.stringify([1, [this.id, this.x, this.y]]));
        }
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
      if(connections[x].readyState == WebSocket.OPEN){
        connections[x].send(JSON.stringify([2, [this.id, this.angle]]));
      }
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
    this.isDead = false;
  }
  check(){
      for(var i = 0, n = tanks.length; i < n; i++){
        //Check for collision with other tanks.
        if (Math.abs(this.x - tanks[i].x) <= TANK_SIZE/2 && Math.abs(this.y - tanks[i].y) <= TANK_SIZE/2 && i != this.tankID){
          tanks[i].respawn();
          for(var x = 0, n = connections.length; x < n; x++){
            if(connections[x].readyState == WebSocket.OPEN){
              connections[x].send(JSON.stringify([1, [tanks[i].id, tanks[i].x, tanks[i].y]]));
              connections[x].send(JSON.stringify([2, [tanks[i].id, tanks[i].angle]]));
              connections[x].send(JSON.stringify([7, [this.tankID, this.id]]));
              connections[x].send(JSON.stringify([8, [this.tankID, tanks[i].id]]));
            }
          }
          //Check if the shooting tank still exists.
          if(this.tankID < tanks.length){
            tanks[this.tankID].bullets.splice(this.id, 1);
            for(var x = this.id, n = tanks[this.tankID].bullets.length; x < n; x++){
              tanks[this.tankID].bullets[x].id = x;
            }
          }


          return true;
        }
      }

      if (this.x > BOARD_WIDTH || this.x < 0 || this.y > BOARD_LENGTH || this.y < 0){
        for(var x = 0, n = connections.length; x < n; x++){
          if(connections[x].readyState == WebSocket.OPEN){
            connections[x].send(JSON.stringify([7, [this.tankID, this.id]]));
          }
        }
        if(this.tankID < tanks.length){
          tanks[this.tankID].bullets.splice(this.id, 1);
          for(var x = this.id, n = tanks[this.tankID].bullets.length; x < n; x++){
            tanks[this.tankID].bullets[x].id = x;
          }
        }
        return true;
      }
      return false;


  }

  move(){

    this.x += Math.cos(this.angle * (Math.PI / 180)) * BULLET_SPEED;
    this.y += Math.sin(this.angle * (Math.PI / 180)) * BULLET_SPEED;

    for(var x = 0, n = connections.length; x < n; x++){
      if(connections[x].readyState == WebSocket.OPEN){
        connections[x].send(JSON.stringify([4, [this.tankID, this.id, this.x, this.y]]));
      }
    }

    if(!this.check() && !this.isDead){
      var that = this
      setTimeout(function(){that.move()}, 10)
    }


  }

}

wss.on('connection', function connection(ws, req) {
  connections.push(ws);
  console.log('A player has connected.');
  joinTank();
  var tmpTanks = tanks;


  ws.send(JSON.stringify([0, tanks]));

  for(var x = 0, n = connections.length; x < n - 1; x++){
    if(connections[x].readyState == WebSocket.OPEN){
      connections[x].send(JSON.stringify([5, tanks[n - 1]]));
    }
  }

  ws.on('close', function close() {

    for(var x = 0, n = connections.length; x < n; x++){
      if(x != connections.indexOf(ws)){
        if(connections[x].readyState == WebSocket.OPEN){
          connections[x].send(JSON.stringify([6, connections.indexOf(ws)]));
        }
      }
    }
    leaveTank(connections.indexOf(ws));
    connections.splice(connections.indexOf(ws), 1);
    console.log('A player has disconnected.');

  });

  ws.on('message', function process(data) {

    try{
      var tank = tanks[connections.indexOf(ws)];

      data = JSON.parse(data);
      //Tank Shoot
      if(data[0] == 0){
        tank.shoot();
      }
      //Tank Move
      else if(data[0] == 1){
        tank.move(data[1]);
      }
      else if (data[0] == 2){
        tank.rotate(data[1]);
      }
    }
    catch (e){

    }


  });


});
