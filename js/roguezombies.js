var RZ = OZ.Class();

DIRS = [
	[ 0, -1],
	[ 1, -1],
	[ 1,  0],
	[ 1,  1],
	[ 0,  1],
	[-1,  1],
	[-1,  0],
	[-1, -1]
];


RZ.prototype.init = function() {
	RZ.rz = this;
	this._size = [80, 25];
	
	this._initCanvas();
	this._initMap();


	this._zombies = [];
	
	this._addZombie(0, 0, 5);
	this._addZombie(this._size[0]-1, 0, 5);
	this._addZombie(this._size[0]-1, this._size[1]-1, 5);
	this._addZombie(0, this._size[1]-1, 5);
	
	this._player = new RZ.Player(10, 10);
	
	this._turnPlayer();
}

RZ.prototype._addZombie = function(x, y, count) {
	for (var i=0;i<count;i++) {
		var z = new RZ.Zombie(x, y);
		this._zombies.push(z);
	}
}

RZ.prototype._turnPlayer = function() {
	this._actionsRemaining = 2;
	this._event = OZ.Event.add(window, "keydown", this._keyDown.bind(this));
}

RZ.prototype._keyDown = function(e) {
	var code = e.keyCode;
	var dir = null;
	switch (code) {
		case 38: 
		case 104:
			dir = 0; 
		break;
		case 105:
			dir = 1;
		break;
		case 39:
		case 102:
			dir = 2;
		break;
		case 99:
			dir = 3;
		break;
		case 40: 
		case 98: 
			dir = 4;
		break;
		case 97:
			dir = 5;
		break;
		case 100:
			dir = 6;
		break;
		case 103:
			dir = 7;
		break;
	}
	
	if (dir === null) { return; }
	var x = this._player.x + DIRS[dir][0];
	var y = this._player.y + DIRS[dir][1];
	if (this.at(x, y)) { return; }

	this._player.move(dir);
	this._actionsRemaining--;
	
	if (!this._actionsRemaining) { this._turnZombies(); }
}

RZ.prototype._turnZombies = function() {
	OZ.Event.remove(this._event);
	for (var i=0;i<this._zombies.length;i++) {
		this._zombies[i].act();
	}
	this._turnPlayer();
}

RZ.prototype.getPlayer = function() {
	return this._player;
}

RZ.prototype.draw = function(x, y, what) {
	var left = x*(this._char[0]+0*2);
	var top = y*(this._char[1]+0*2);
	this._canvas.fillStyle = "black";
	this._canvas.fillRect(left, top, this._char[0]+0*2, this._char[1]+0*2);

	if (!what) {
		var id = x+"-"+y;
		what = this._map[id];
	}
	
	if (what) {
		var vis = what.getVisual();
		this._canvas.fillStyle = vis.fg;
		this._canvas.fillText(vis.ch, left+0*1, top + this._char[1] + 0*1);	
	}
}

/**
 * @returns {int} 0 nothing, 1 destructible, 2 blocking
 */
RZ.prototype.at = function(x, y) {
	if (x < 0 || y < 0 || x >= this._size[0] || y >= this._size[1]) { return 2; }

	for (var i=0;i<this._zombies.length;i++) {
		var z = this._zombies[i];
		if (z.x == x && z.y == y) { return 2; }
	}

	return 0;
}

RZ.prototype._initCanvas = function() {
	var size = 16;

	var ch = OZ.DOM.elm("span", {innerHTML:"x", fontFamily:"monospace", fontSize:size+"px"});
	document.body.appendChild(ch);
	this._char = [ch.offsetWidth, ch.offsetHeight];
	ch.parentNode.removeChild(ch);
	
	var c = OZ.DOM.elm("canvas");
	document.body.appendChild(c);
	c.width = this._size[0]*this._char[0];
	c.height = this._size[1]*this._char[1];
	
	this._canvas = c.getContext("2d");
	this._canvas.font = size + "px monospace";
	this._canvas.textBaseline = "bottom";
}

RZ.prototype._initMap = function() {
	this._map = {};
	for (var i=0;i<this._size[0];i++) {
		for (var j=0;j<this._size[1];j++) {
			this.draw(i, j);
		}
	}
	
}

RZ.Being = OZ.Class();
RZ.Being.prototype.init = function(x, y) {
	this.x = x;
	this.y = y;
	RZ.rz.draw(x, y, this);
}

RZ.Being.prototype.getVisual = function() {
	return {fg:"?", ch:"?"};
}

RZ.Being.prototype.move = function(dir) {
	RZ.rz.draw(this.x, this.y);
	this.x += DIRS[dir][0];
	this.y += DIRS[dir][1];
	RZ.rz.draw(this.x, this.y, this);
}

RZ.Zombie = OZ.Class();
RZ.Zombie.prototype = Object.create(RZ.Being.prototype);

RZ.Zombie.prototype.getVisual = function() {
	return {fg:"yellow", ch:"z"};
}

RZ.Zombie.prototype.act = function() {
	var player = RZ.rz.getPlayer();
	
	var best = [];
	var dist = Infinity;

	for (var i=0;i<DIRS.length;i++) {
		var x = this.x + DIRS[i][0];
		var y = this.y + DIRS[i][1];
		var what = RZ.rz.at(x, y);
		if (what == 2) { continue; }
		var d = player.distance(x, y);
		if (d < dist) { 
			dist = d;
			best = []; 
		}
		if (d == dist) { best.push(i); }
	}
	if (!best.length) { RZ.rz.draw(this.x, this.y, this); return; }
	
	var dir = best[Math.floor(Math.random()*best.length)];
	this.move(dir);
}

RZ.Player = OZ.Class();
RZ.Player.prototype = Object.create(RZ.Being.prototype);

RZ.Player.prototype.getVisual = function() {
	return {fg:"white", ch:"@"};
}

RZ.Player.prototype.distance = function(x, y) {
	var dx = x-this.x;
	var dy = y-this.y;
	return Math.abs(dx)+Math.abs(dy);
}
