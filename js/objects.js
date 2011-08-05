/**
 * Base map object
 */
RZ.Object = OZ.Class();
RZ.Object.prototype.init = function() {
	this.x = 0;
	this.y = 0;
	this.hp = 1;
	this.blocks = 2; /* 0 nothing, 1 destructible, 2 blocking */
	this.visual = {fg:"white",ch:"?"};
}

RZ.Object.prototype.damage = function(who) {
	this.hp--;
	if (!this.hp) { 
		this._die();
	} else {
		this._updateVisual();
		RZ.rz.draw(this.x, this.y);
	}
}

RZ.Object.prototype._die = function() {}
RZ.Object.prototype._updateVisual = function() {}

/**
 * Being
 */

/**
 * Empty map cell
 */
RZ.Grass = OZ.Class().extend(RZ.Object);
RZ.Grass.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	this.visual = {ch:".", fg:"gray"};
	this.blocks = 0;
}
RZ.Grass.prototype.damage = function(who) {}; /* not destroyable */

/**
 * Player character
 */
RZ.Player = OZ.Class().extend(RZ.Object);
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
	if (!this.hp) { this.visual.ch = "+"; }
}

RZ.Player.prototype.distance = function(x, y) {
	var dx = x-this.x;
	var dy = y-this.y;
	return Math.abs(dx)+Math.abs(dy);
//	return Math.max(Math.abs(dx), Math.abs(dy));
}

RZ.Player.prototype._die = function() {
	this._updateVisual();
	RZ.rz.draw(this.x, this.y);
	RZ.rz.gameOver();
}

/**
 * Braaainz!
 */
RZ.Zombie = OZ.Class().extend(RZ.Object);
RZ.Zombie.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	var color = ["DarkOliveGreen", "LightSlateGray", "Olive", "OliveDrab", "SaddleBrown", "GoldenRod", "DarkSeaGreen"].random();
	var ch = ["z", "Z"].random();
	this.visual = {fg:color, ch:ch};
}

RZ.Zombie.prototype.act = function() {
	var player = RZ.rz.player;
	var best = [];
	var bestBlocks = -1;
	var bestDist = Infinity;

	for (var i=0;i<DIRS.length;i+=2) {
		var x = this.x + DIRS[i][0];
		var y = this.y + DIRS[i][1];
		var what = RZ.rz.at(x, y);
		if (what == null) { continue; }
		if (what.blocks == 2) { continue; }
		var d = player.distance(x, y);
		
		if (what.blocks == 1 && bestBlocks == 0 && d != 0) { continue; } /* worse blocking, not interested */

		/** 
		 * reset if:
		 * a) better distance
		 * b) player not encountered, same or worse distance, but better blocking
		 */
		if (d < bestDist || (what.blocks == 0 && bestBlocks == 1 && bestDist != 0)) {
			bestDist = d;
			best = [];
		}
		
		if (d == bestDist) {
			best.push(i);
			bestBlocks = what.blocks;
		}

	}
	if (!best.length) { return; }
	
	var dir = best.random();
	if (bestBlocks == 0) {
		RZ.rz.move(this, dir);
	} else {
		var victim = RZ.rz.at(this.x + DIRS[dir][0], this.y + DIRS[dir][1]);
		victim.damage(this);
	}
	
}

RZ.Zombie.prototype._die = function() {
	RZ.rz.removeBeing(this);
	var what = RZ.rz.at(this.x, this.y);
	
	if (!what.blocks) { /* free to create a corpse */
		var corpse = new RZ.Corpse(this.visual.fg);
		RZ.rz.addItem(corpse, this.x, this.y);
	}
}

/**
 * Basic item: object which can be destroyed in a standard way. Player can hold them.
 */
RZ.Item = OZ.Class().extend(RZ.Object);
RZ.Item.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	this.price = -1; /* can be bought? */
	this.amount = 1; /* how many bought at once */
	this.desc = "";
}
RZ.Item.prototype.use = function() {} /* using a bought item */
RZ.Item.prototype._die = function() {
	RZ.rz.removeItem(this);
}

/**
 * Dead undead
 */
RZ.Corpse = OZ.Class().extend(RZ.Item);
RZ.Corpse.prototype.init = function(fg) {
	RZ.Item.prototype.init.call(this);
	this.visual = {ch:"%", fg:fg};
	this.blocks = 0;
}

/**
 * Barricade - blocks movement
 */
RZ.Barricade = OZ.Class().extend(RZ.Item);
RZ.Barricade.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.hp = 5;
	this.visual = {ch:"#"};
	this._updateVisual();
	this.blocks = 1;
	this.amount = 3;
	this.desc = "Wooden barricade; destroyed after "+this.hp+" hits";
}

RZ.Barricade.prototype._updateVisual = function() {
	var colors = ["", "#300", "#520", "#850", "#a70", "#c90"];
	this.visual.fg = colors[this.hp];
}
