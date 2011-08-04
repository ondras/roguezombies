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

Array.prototype.random = function() {
	if (!this.length) { return null; }
	return this[Math.floor(Math.random()*this.length)];
}

RZ.prototype.init = function() {
	RZ.rz = this;
	this._size = [80, 25];
	this._grass = new RZ.Grass();
	this._zombies = [];
	this._beings = {};
	this._items = {};
	
	this._initCanvas();
	this._initItems();

	for (var i=0;i<this._size[0];i++) {
		for (var j=0;j<this._size[1];j++) {
			this.draw(i, j);
		}
	}	

	this._zombiePotential = 20;
	this._rounds = 0;
	this.player = new RZ.Player();
	this._addBeing(this.player, 10, 10);
	
	this._turnPlayer();
}

RZ.prototype.removeItem = function(item) {
	var id = item.x+"-"+item.y;
	delete this._items[id];
	this.draw(item.x, item.y);
}

RZ.prototype.removeBeing = function(being) {
	var id = being.x+"-"+being.y;
	delete this._beings[id];
	this.draw(being.x, being.y);
}

RZ.prototype._spawnZombies = function(amount) {
	var corners = [
		[0, 0],
		[this._size[0]-1, 0],
		[this._size[0]-1, this._size[1]-1],
		[0, this._size[1]-1]
	];
	for (var i=0;i<amount;i++) {
		var corner = corners.random();
		var z = new RZ.Zombie();
		this._addBeing(z, corner[0], corner[1]);
		this._zombies.push(z);
	}
};

RZ.prototype._addBeing = function(being, x, y) {
	being.x = x;
	being.y = y;
	this._beings[x+"-"+y] = being;
	this.draw(x, y);
}

RZ.prototype._addItem = function(item, x, y) {
	item.x = x;
	item.y = y;
	this._items[x+"-"+y] = item;
	this.draw(x, y);
}

RZ.prototype._turnPlayer = function() {
	var amount = this._rounds / 20;
	this._zombiePotential += amount;
	if (this._zombiePotential >= 1) {
		amount = Math.floor(this._zombiePotential);
		this._zombiePotential -= amount;
		this._spawnZombies(amount);
	}
	
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
		case 101:
		case 109:
			dir = -1;
		break;
	}
	
	if (dir === null) { return; }
	
	if (dir > -1) {
		var x = this.player.x + DIRS[dir][0];
		var y = this.player.y + DIRS[dir][1];
		if (this.at(x, y).blocks) { return; }
		this.move(this.player, dir);
	}

	this._actionsRemaining--;
	this._rounds++;
	
	if (!this._actionsRemaining) { this._turnZombies(); }
}

RZ.prototype._turnZombies = function() {
	OZ.Event.remove(this._event);
	for (var i=0;i<this._zombies.length;i++) {
		var z = this._zombies[i];
		z.act();
	}
	
	this._turnPlayer();
}

RZ.prototype.gameOver = function() {
	this._zombies = [];
	alert("GAME OVER in round " + this._rounds);
}

RZ.prototype.move = function(what, dir) {
	var id = what.x+"-"+what.y;
	delete this._beings[id];
	this.draw(what.x, what.y);
	what.x += DIRS[dir][0];
	what.y += DIRS[dir][1];
	id = what.x+"-"+what.y;
	this._beings[id] = what;
	this.draw(what.x, what.y);
}

RZ.prototype.at = function(x, y) {
	if (x < 0 || y < 0 || x >= this._size[0] || y >= this._size[1]) { return null; }

	var id = x+"-"+y;
	return (this._beings[id] || this._items[id] || this._grass);
}

RZ.prototype.draw = function(x, y) {
	var left = x*(this._char[0]+0*2);
	var top = y*(this._char[1]+0*2);
	this._canvas.fillStyle = "black";
	this._canvas.fillRect(left, top, this._char[0]+0*2, this._char[1]+0*2);
	
	var id = x+"-"+y;
	var what = this._beings[id] || this._items[id] || this._grass;
	
	var vis = what.visual;
	this._canvas.fillStyle = vis.fg;
	this._canvas.fillText(vis.ch, left+0*1, top + this._char[1] + 0*1);	
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

RZ.prototype._initItems = function() {
	var b = new RZ.Barricade();
	this._addItem(b, 2, 2);
}

RZ.Object = OZ.Class();
RZ.Object.prototype.init = function() {
	this.x = 0;
	this.y = 0;
	this.hp = 1;
	this.blocks = 2; /* 0 nothing, 1 destructible, 2 blocking */
	this.visual = {fg:"white",ch:"?"};
}

RZ.Object.prototype.damage = function() {
	this.hp--;
	if (!this.hp) { 
		this._die();
	} else {
		this._updateVisual();
		RZ.rz.draw(this.x, this.y);
	}
}

RZ.Object.prototype._die = function() {
}

RZ.Object.prototype._updateVisual = function() {
}

RZ.Zombie = OZ.Class();
RZ.Zombie.prototype = Object.create(RZ.Object.prototype);

RZ.Zombie.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	var color = ["DarkOliveGreen", "LightSlateGray", "Olive", "OliveDrab", "SaddleBrown", "GoldenRod", "DarkSeaGreen"].random();
	var ch = ["z", "Z"].random();
	this.visual = {fg:color, ch:ch};
}

RZ.Zombie.prototype.act = function() {
	var player = RZ.rz.player;
	
	var bestFree = [];
	var bestDestroyable = [];
	var dist = Infinity;

	for (var i=0;i<DIRS.length;i++) {
		var x = this.x + DIRS[i][0];
		var y = this.y + DIRS[i][1];
		var what = RZ.rz.at(x, y);
		if (what == null) { continue; }
		if (what.blocks == 2) { continue; }
		var d = player.distance(x, y);
		if (d < dist) { 
			dist = d;
			bestFree = []; 
			bestDestroyable = []; 
		}
		if (d == dist) { 
			(what.blocks == 0 ? bestFree : bestDestroyable).push(i);
		}
	}
	if (bestFree.length+bestDestroyable.length == 0) { return; }
	
	if (bestFree.length) {
		var dir = bestFree.random();
		RZ.rz.move(this, dir);
	} else {
		var dir = bestDestroyable.random();
		var victim = RZ.rz.at(this.x + DIRS[dir][0], this.y + DIRS[dir][1]);
		victim.damage();
	}
	
}

RZ.Zombie.prototype._die = function() {
	RZ.rz.removeBeing(this);
}


RZ.Player = OZ.Class();
RZ.Player.prototype = Object.create(RZ.Object.prototype);
RZ.Player.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	this.visual = {ch:"@"};
	this.blocks = 1;
	this.hp = 3;
	this._updateVisual();
}

RZ.Player.prototype._updateVisual = function() {
	var colors = ["white", "red", "orange", "white"];
	this.visual.fg = colors[this.hp];
	if (!this.hp) { this.visual.ch = "✝"; }
}

RZ.Player.prototype.distance = function(x, y) {
	var dx = x-this.x;
	var dy = y-this.y;
	return Math.abs(dx)+Math.abs(dy);
}

RZ.Player.prototype._die = function() {
	this._updateVisual();
	RZ.rz.draw(this.x, this.y);
	RZ.rz.gameOver();
}

RZ.Grass = OZ.Class();
RZ.Grass.prototype = Object.create(RZ.Object.prototype);
RZ.Grass.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	this.visual = {ch:".", fg:"gray"};
	this.blocks = 0;
}

RZ.Barricade = OZ.Class();
RZ.Barricade.prototype = Object.create(RZ.Object.prototype);
RZ.Barricade.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	this.hp = 5;
	this.visual = {ch:"#"};
	this._updateVisual();
	this.blocks = 1;
}

RZ.Barricade.prototype._updateVisual = function() {
	var colors = ["", "#300", "#520", "#850", "#a70", "#c90"];
	this.visual.fg = colors[this.hp];
}

RZ.Barricade.prototype._die = function() {
	RZ.rz.removeItem(this);
}
