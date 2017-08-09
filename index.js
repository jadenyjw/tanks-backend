//Define constants for the game.
const BULLET_SPEED = 10;
const BOARD_WIDTH = 800;
const BOARD_LENGTH = 800;
const TANK_SPEED = 5;
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

class Tank {
  constructor(args){
    this.bullets = [];
    this.angle = 0;
    this.x = Math.floor(Math.random() * BOARD_WIDTH);
    this.x = Math.floor(Math.random() * BOARD_LENGTH);
  }

  shoot(){
    bullets.push(new Bullet(this.angle, this.x, this.y));
  }

  move(){
    this.x += Math.cos(this.angle) * TANK_SPEED;
    this.x += Math.sin(this.angle) * TANK_SPEED;
  }

  rotate(angle){
    this.angle = (this.angle + angle) % 360;
  }
}

class Game {
  constructor(){
    this.tanks = [];
  }

  joinTank(tank){
    this.tanks.push(new Tank());
  }

  leaveTank(tankID){
    this.tanks = this.tanks.splice(tankID, 1);
  }

  syncBullets(){

  }
  syncTanks(){
    
  }


}

class Bullet {
  constructor(angle, x, y){
    this.angle = angle;
    this.x = x;
    this.y = y;
  }
  move(){
    this.x += Math.cos(angle) * BULLET_SPEED;
    this.y += Math.sin(angle) * BULLET_SPEED;
  }
}

var game = new Game();
game.joinTank();


wss.on('connection', function connection(ws, req) {
  console.log('A player has connected.');
  game.joinTank();


});
