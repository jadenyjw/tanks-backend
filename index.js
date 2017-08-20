//Define constants for the game.
const BULLET_SPEED = 5;
const BOARD_WIDTH = 800;
const BOARD_LENGTH = 800;
const TANK_SPEED = 5;
const TANK_SIZE = 20;
const ROTATION_SPEED = 4;
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
}


class Tank {
  constructor(id){
    this.id = id;
    this.bullets = [];
    this.angle = Math.floor(Math.random() * 360);
    this.x = Math.floor(Math.random() * BOARD_WIDTH);
    this.y = Math.floor(Math.random() * BOARD_LENGTH);
  }

  shoot(){
    var bullet = new Bullet(this.angle, this.x, this.y, this.bullets.length, this.id);
    this.bullets.push(bullet);
    for(var x = 0, n = connections.length; x < n; x++){
        connections[x].send(JSON.stringify([0, [this.id]]));
    }
    bullet.move();
  }

  move(direction){

    if(direction == 1){
      var newX = this.x + Math.cos(this.angle) * TANK_SPEED;
      var newY = this.y + Math.sin(this.angle) * TANK_SPEED;
    }
    else if(direction == 0){
      var newX = this.x - Math.cos(this.angle) * TANK_SPEED;
      var newY = this.y - Math.sin(this.angle) * TANK_SPEED;
    }


    var willCrash = false;
    for(var i = 0, n = tanks.length; i < n; i++){
      if(Math.abs(newX - tanks[i].x) <= TANK_SIZE/2 && Math.abs(newY - tanks[i].y) <= TANK_SIZE/2 && i != this.id){
        willCrash = true;
        break;
      }
    }

    if(!willCrash){
      willCrash = (newX >= BOARD_WIDTH || newX <= 0 || newY >= BOARD_LENGTH || newY <= 0);
    }

    if(!willCrash){
      this.x = newX;
      this.y = newY;
      for(var x = 0, n = connections.length; x < n; x++){
        connections[x].send(JSON.stringify([1, [this.id, this.x, this.y, this.angle]]));
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
        connections[x].send(JSON.stringify([2, [this.id, this.x, this.y, this.angle]]));
    }
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
    for(var i = 0, n = tanks.length; i < n; i++){
      //Check for collision with other tanks.
      if (Math.abs(this.x - tanks[i].x) <= TANK_SIZE/2 && Math.abs(this.y - tanks[i].y) <= TANK_SIZE/2 && i != this.tankID){
        tanks[this.tankID].bullets.splice(this.id, 1);
        return true;
      }
    }

    //Check for edge of board.
    if (this.x > BOARD_WIDTH || this.x < 0 || this.y > BOARD_LENGTH || this.y < 0){
      tanks[this.tankID].bullets.splice(this.id, 1);
      return true;
    }
    return false;
  }

  move(){

    this.x += Math.cos(this.angle) * BULLET_SPEED;
    this.y += Math.sin(this.angle) * BULLET_SPEED;

    for(var x = 0, n = connections.length; x < n; x++){
      connections[x].send(JSON.stringify([3, [this.x, this.y]]));
    }

    if(!this.check()){
      this.move();
    }
  }
}

wss.on('connection', function connection(ws, req) {
  connections.push(ws);
  console.log('A player has connected.');
  joinTank();
  wss.clients.forEach(function each(client){
      client.send(JSON.stringify([0,tanks]));
  });

  ws.on('close', function close() {
    connections.splice(connections.indexOf(ws), 1);
    leaveTank(connections.indexOf(ws));
    wss.clients.forEach(function each(client){
        client.send(JSON.stringify([0,tanks]));
    });
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
