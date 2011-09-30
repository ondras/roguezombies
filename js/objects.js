/**
 * Base map object
 */
RZ.Object = OZ.Class();
RZ.Object.prototype.init = function() {
	this.x = 0;
	this.y = 0;
	this.hp = 1;
	this.visual = {fg:"white",ch:"?"};
}

RZ.Object.prototype.damage = function(who) {
	this.hp--;
	this._updateVisual();
	RZ.rz.draw(this.x, this.y);
	if (!this.hp) { this._die(); }
}

RZ.Object.prototype._updateVisual = function() {}
RZ.Object.prototype._die = function() {}

/**
 * Player character
 */
RZ.Player = OZ.Class().extend(RZ.Object);
RZ.Player.prototype.init = function(status) {
	RZ.Object.prototype.init.call(this);
	this.visual = {ch:"@"};
	this.hp = 3;
	this._status = status;
	this._$ = 0;
	this.items = [new RZ.Item.Crowbar()];
	this._updateVisual();
	this.adjustMoney(0);
}

RZ.Player.prototype.distance = function(x, y) {
	var dx = x-this.x;
	var dy = y-this.y;
//	return Math.abs(dx)+Math.abs(dy);
	return Math.max(Math.abs(dx), Math.abs(dy));
}

RZ.Player.prototype.adjustMoney = function(diff) {
	this._$ += diff;
	this._status.innerHTML = "Money: " + this._$;
}

RZ.Player.prototype._updateVisual = function() {
	var colors = ["white", "red", "orange", "white"];
	this.visual.fg = colors[this.hp];
	if (!this.hp) { this.visual.ch = "+"; }
}

RZ.Player.prototype._die = function() {
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

	for (var i=0;i<DIRS.length;i+=1) {
		var x = this.x + DIRS[i][0];
		var y = this.y + DIRS[i][1];
		if (!RZ.rz.isValid(x, y)) { continue; } /* out of area */
		
		var item = RZ.rz.getItem(x, y); /* indestructible items, not interested */
		if (item && item.blocks == 2) { continue; }

		var being = RZ.rz.getBeing(x, y);
		if (being) { /* surrounding zombies are ignored, player is immediately attacked */
			if (being == player) {
				player.damage(this);
				return;
			}
			continue;
		}
		
		/* either a free space or a (destructible, [in]visible) item */
		var blocks = (item ? item.blocks : 0);
		
		if (blocks == 1 && bestBlocks == 0) { continue; } /* worse blocking, not interested */
		var d = player.distance(x, y);

		/** 
		 * reset if:
		 * a) better distance
		 * b) same or worse distance, but better blocking
		 */
		if (d < bestDist || (blocks == 0 && bestBlocks == 1)) {
			bestDist = d;
			best = [];
		}
		
		if (d == bestDist) {
			best.push(i);
			bestBlocks = blocks;
		}

	}
	if (!best.length) { return; }
	
	var dir = best.random();
	if (bestBlocks == 0) {
		RZ.rz.moveBeing(this, dir);
	} else {
		var item = RZ.rz.getItem(this.x + DIRS[dir][0], this.y + DIRS[dir][1]);
		item.damage(this);
	}
	
}

RZ.Zombie.prototype._die = function() {
	RZ.rz.player.adjustMoney(1);
	RZ.rz.removeBeing(this);
	
	var corpse = new RZ.Object();
	corpse.visual = {ch:"%", fg:this.visual.fg};
	RZ.rz.addBackground(corpse, this.x, this.y);
}

/**
 * Basic item: object which can be destroyed in a standard way. Player can hold them.
 */
RZ.Item = OZ.Class().extend(RZ.Object);
RZ.Item.prototype.init = function() {
	RZ.Object.prototype.init.call(this);
	this.blocks = 2; /* zombie pathfinding support: 0 passable, 1 destructible, 2 blocking */
	this.price = 0; /* when buying */
	this.amount = 1; /* how many bought at once */
	this.name = "";
	this.desc = "";
	this.requiresDirection = true;
	this._event = null;
}
RZ.Item.prototype.use = function(dir) { /* using a bought item */
	this.amount--;
	if (!this.amount) { /* remove from inventory */
		var index = RZ.rz.player.items.indexOf(this);
		RZ.rz.player.items.splice(index, 1);
	}
} 
RZ.Item.prototype.activate = function(being) {} /* someone stepped on an item */
RZ.Item.prototype._die = function() {
	RZ.rz.removeItem(this);
}

/**
 * House - undestructible decoration
 */
RZ.Item.House = OZ.Class().extend(RZ.Item);
RZ.Item.House.prototype.init = function(ch) {
	RZ.Item.prototype.init.call(this);
	this.visual = {ch:ch,fg:"#930"};
	this.blocks = 2;
}

/**
 * Window - destructible decoration
 */
RZ.Item.Window = OZ.Class().extend(RZ.Item);
RZ.Item.Window.prototype.init = function(horiz) {
	RZ.Item.prototype.init.call(this);
	this.visual = {ch:horiz ? "═" : "║",fg:"#39f"};
	this.blocks = 1;
}

/**
 * Barricade - blocks movement
 */
RZ.Item.Barricade = OZ.Class().extend(RZ.Item);
RZ.Item.Barricade.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.hp = 5;
	this.visual = {ch:"#"};
	this._updateVisual();
	this.blocks = 1;
	this.amount = 3;
	this.name = "Wooden barricade";
	this.desc = "destroyed after "+this.hp+" hits";
}

RZ.Item.Barricade.prototype._updateVisual = function() {
	var colors = ["", "#300", "#520", "#850", "#a70", "#c90"];
	this.visual.fg = colors[this.hp];
}

/**
 * This one is always available
 */
RZ.Item.Crowbar = OZ.Class().extend(RZ.Item);
RZ.Item.Crowbar.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.name = "Crowbar";
	this.desc = "the ultimate melee";
}

RZ.Item.Crowbar.prototype.use = function(dir) {
	var x = RZ.rz.player.x + DIRS[dir][0];
	var y = RZ.rz.player.y + DIRS[dir][1];
	var being = RZ.rz.getBeing(x, y);
	var item = RZ.rz.getItem(x, y);
	if (!being && !item) { return; } /* crowbar can destroy even non-destructible items */
	(being || item).damage(RZ.rz.player);
}

/**
 * Rake - destroys one zombie
 */
RZ.Item.Rake = OZ.Class().extend(RZ.Item);
RZ.Item.Rake.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.blocks = 0;
	this.visual = {ch:"r", fg:"#999"};
	this.price = 1;
	this.amount = 3;
	this.name = "Rake";
	this.desc = "step on it and die";
}
RZ.Item.Rake.prototype.use = function(dir) {
	var offsets = [0, -1, 1];
	for (var i=0;i<offsets.length;i++) {
		var offset = offsets[i];
		var d = DIRS[(dir+offset+8) % 8];
		var x = RZ.rz.player.x + d[0];
		var y = RZ.rz.player.y + d[1];
		var item = RZ.rz.getItem(x, y);
		if (!item) { continue; } /* there is already an item */
		RZ.rz.addItem(new RZ.Item.Rake(), x, y);
		RZ.Item.prototype.use.call(this, dir);
		if (!this.amount) { break; }
	}
}
RZ.Item.Rake.prototype.activate = function(being) {
	being.damage(this);
	this._die();
}
