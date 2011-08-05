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
	this._char = [0, 0];
	this._grass = new RZ.Grass();
	this._zombies = [];
	this._beings = {};
	this._items = {};
	
	this._initCanvas();
	this._initItems();

	this._zombiePotential = 20;
	this._rounds = 0;
	this.player = new RZ.Player();
	this.addBeing(this.player, 10, 10);
	
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
		this.addBeing(z, corner[0], corner[1]);
		this._zombies.push(z);
	}
};

RZ.prototype.addBeing = function(being, x, y) {
	being.x = x;
	being.y = y;
	this._beings[x+"-"+y] = being;
	this.draw(x, y);
}

RZ.prototype.addItem = function(item, x, y) {
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
	
	this._rounds++;

	if (dir > -1) {
		var x = this.player.x + DIRS[dir][0];
		var y = this.player.y + DIRS[dir][1];
		if (this.at(x, y).blocks) { return; }
		this.move(this.player, dir);
	}

	this._turnZombies();
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
	var c = OZ.DOM.elm("canvas");
	document.body.appendChild(c);
	this._canvas = c.getContext("2d");
	this._resize();
	
	OZ.Event.add(window, "resize", this._resize.bind(this));
}

RZ.prototype._getCharSize = function(avail) {
	var span = OZ.DOM.elm("span", {innerHTML:"x"});
	document.body.appendChild(span);
	
	var size = 1;
	while (1) {
		span.style.fontSize = size + "px";
		var charWidth = span.offsetWidth;
		var charHeight = span.offsetHeight;
		var width = charWidth * this._size[0];
		var height = charHeight * this._size[1];
		
		if (width > avail[0] || height > avail[1]) {
			span.style.fontSize = (size-1) + "px";
			var result = [size-1, span.offsetWidth, span.offsetHeight];
			span.parentNode.removeChild(span);
			return result;
		}
		
		size++;
	}
}

RZ.prototype._resize = function(e) {
	var charSize = this._getCharSize(OZ.DOM.win());

	var size = charSize[0];
	this._char[0] = charSize[1];
	this._char[1] = charSize[2];
	
	/* adjust canvas size */
	var w = this._size[0] * this._char[0];
	var h = this._size[1] * this._char[1];
	this._canvas.canvas.width = w;
	this._canvas.canvas.height = h;
	this._canvas.font = size + "px Inconsolata";
	this._canvas.textBaseline = "bottom";

	for (var i=0;i<this._size[0];i++) {
		for (var j=0;j<this._size[1];j++) {
			this.draw(i, j);
		}
	}	
}

RZ.prototype._initItems = function() {
	this.addItem(new RZ.Barricade(), 2, 2);
	this.addItem(new RZ.Barricade(), 1, 2);
	this.addItem(new RZ.Barricade(), 2, 1);
}
