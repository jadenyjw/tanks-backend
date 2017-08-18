//Define constants for the game.
const BULLET_SPEED = 5;
const BOARD_WIDTH = 800;
const BOARD_LENGTH = 800;
const TANK_SPEED = 5;
const TANK_SIZE = 20;
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

function joinTank(tank){
  tanks.push(new Tank(this.tanks.length));
}

function leaveTank(tankID){
  this.tanks = this.tanks.splice(tankID, 1);
}

function getTank(connection){

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
    bullet.move();
  }

  move(){

    var newX = Math.cos(this.angle) * TANK_SPEED;
    var newY = Math.sin(this.angle) * TANK_SPEED;

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
    }

  }

  rotate(angle){
    this.angle = (this.angle + angle) % 360;
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
    console.log(this.x + " " + this.y);

    if(!this.check()){
      this.move();
    }
  }
}

wss.on('connection', function connection(ws, req) {
  console.log('A player has connected.');
  joinTank();
  tanks[tanks.length - 1].shoot();
  wss.clients.forEach(function each(client){
      client.send(JSON.stringify(tanks));
  });


});
