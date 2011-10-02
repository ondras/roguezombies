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
	this.adjustMoney(10);
}

RZ.Player.prototype.adjustMoney = function(diff) {
	this._$ += diff;
	this._status.innerHTML = "Money: " + this._$;
}

RZ.Player.prototype.getMoney = function() {
	return this._$;
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
	this._manhattan = true; /* use manhattan movement mode? */
	var color = ["DarkOliveGreen", "LightSlateGray", "Olive", "OliveDrab", "SaddleBrown", "GoldenRod", "DarkSeaGreen"].random();
	var ch = ["z", "Z"].random();
	this.visual = {fg:color, ch:ch};
}

RZ.Zombie.prototype.act = function() {
	var player = RZ.rz.player;
	var best = [];
	var bestBlocks = -1;
	var bestDist = Infinity;

	var step = (this._manhattan ? 2 : 1);
	for (var i=0;i<DIRS.length;i+=step) {
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
		var d = this._distance(x, y, player.x, player.y);

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

RZ.Zombie.prototype._distance = function(x1, y1, x2, y2) {
	var dx = Math.abs(x1-x2);
	var dy = Math.abs(y1-y2);
	if (this._manhattan) {
		return dx+dy;
	} else {
		return Math.max(dx, dy);
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
	this.blocks = 0; /* zombie pathfinding support: 0 passable, 1 destructible, 2 blocking */
	this.price = 0; /* when buying */
	this.amount = 1; /* how many bought at once */
	this.name = "";
	this.desc = "";
	this.directional = true;
}
RZ.Item.prototype.clone = function() {
	return new this.constructor();
}
RZ.Item.prototype.equals = function(item) {
	return (this.constructor == item.constructor);
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
RZ.Item.prototype._explode = function(coords) { /* explode on a set of coordinates */
	RZ.rz.lock();
	var fx = new RZ.Object();
	fx.visual.ch = "*";

	for (var i=0;i<coords.length;i++) {
		var c = coords[i];
		var being = RZ.rz.getBeing(c[0], c[1]);
		if (being) {
			if (being != RZ.rz.player) { being.damage(this); }
		} else {
			RZ.rz.removeBackground(c[0], c[1]);
		}
	}
	
	var length = 400;
	var start = new Date().getTime();
	
	var step = function() {
		var ts = new Date().getTime();
		var fraction = (ts-start)/length;
		if (fraction >= 1) {
			for (var i=0;i<coords.length;i++) { RZ.rz.removeFX(coords[i][0], coords[i][1]); }
			clearInterval(interval);
			RZ.rz.unlock();
		} else {
			this._explosionStep(coords, fx, fraction);
		}
	}.bind(this);
	
	step();
	var interval = setInterval(step, 30);
}
RZ.Item.prototype._explosionStep = function(coords, fx, fraction) {
	var amount = Math.round(3*255*(1-fraction));
	
	var r = Math.max(0, Math.min(amount-0*255, 255));
	var g = Math.max(0, Math.min(amount-1*255, 255));
	var b = Math.max(0, Math.min(amount-2*255, 255));
	fx.visual.fg = "rgb("+r+","+g+","+b+")"
	
	for (var i=0;i<coords.length;i++) {
		RZ.rz.addFX(fx, coords[i][0], coords[i][1]);
	}
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
 * This one is always available
 */
RZ.Item.Crowbar = OZ.Class().extend(RZ.Item);
RZ.Item.Crowbar.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.name = "Crowbar";
	this.desc = "the ultimate melee";
	this.amount = "∞";
}

RZ.Item.Crowbar.prototype.use = function(dir) {
	var x = RZ.rz.player.x + DIRS[dir][0];
	var y = RZ.rz.player.y + DIRS[dir][1];
	var being = RZ.rz.getBeing(x, y);
	var item = RZ.rz.getItem(x, y);
	if (!being && !item) { 
		RZ.rz.removeBackground(x, y);
		return; 
	} 
	(being || item).damage(RZ.rz.player); /* crowbar can destroy even non-destructible items */
}

/**
 * Barricade - blocks movement
 */
RZ.Item.Barricade = OZ.Class().extend(RZ.Item);
RZ.Item.Barricade.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.hp = 5;
	this.blocks = 1;
	this.visual = {ch:"#"};
	this._updateVisual();
	this.price = 1;
	this.amount = 3;
	this.name = "Wooden barricade";
	this.desc = "destroyed after "+this.hp+" hits";
}
RZ.Item.Barricade.prototype.use = function(dir) {
	var offsets = [0, -1, 1];
	for (var i=0;i<offsets.length;i++) {
		var offset = offsets[i];
		var d = DIRS[(dir+offset+8) % 8];
		var x = RZ.rz.player.x + d[0];
		var y = RZ.rz.player.y + d[1];
		var item = RZ.rz.getItem(x, y);
		if (item) { continue; } /* there is already an item */
		RZ.rz.addItem(this.clone(), x, y);
		RZ.Item.prototype.use.call(this, dir);
		if (!this.amount) { break; }
	}
}
RZ.Item.Barricade.prototype._updateVisual = function() {
	var colors = ["", "#300", "#520", "#850", "#a70", "#c90"];
	this.visual.fg = colors[this.hp];
}

/**
 * Rake - destroys one zombie
 */
RZ.Item.Rake = OZ.Class().extend(RZ.Item);
RZ.Item.Rake.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.blocks = 0;
	this.visual = {ch:"]", fg:"#999"};
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
		if (item) { continue; } /* there is already an item */
		RZ.rz.addItem(this.clone(), x, y);
		RZ.Item.prototype.use.call(this, dir);
		if (!this.amount) { break; }
	}
}
RZ.Item.Rake.prototype.activate = function(being) {
	being.damage(this);
	this._die();
}

/**
 * Mine - explosion
 */
RZ.Item.Mine = OZ.Class().extend(RZ.Item);
RZ.Item.Mine.prototype.init = function(type, radius) {
	RZ.Item.prototype.init.call(this);
	this.blocks = 0;
	this.visual = {ch:"*", fg:"gray"};
	this.amount = 1;
	this.type = type;
	this.radius = radius;
	this.name = type + " mine";
	var d = 2*radius + 1;
	this.price = d;
	this.desc = "destroys an area of "+d+"x"+d;
}
RZ.Item.Mine.prototype.clone = function() {
	return new this.constructor(this.type, this.radius);
}
RZ.Item.Mine.prototype.equals = function(item) {
	return (item.constructor == this.constructor && item.radius == this.radius);
}
RZ.Item.Mine.prototype.use = function(dir) {
	var x = RZ.rz.player.x + DIRS[dir][0];
	var y = RZ.rz.player.y + DIRS[dir][1];
	var item = RZ.rz.getItem(x, y);
	if (item) { return; } /* there is already an item */

	RZ.rz.addItem(this.clone(), x, y);
	RZ.Item.prototype.use.call(this, dir);
}
RZ.Item.Mine.prototype.activate = function(being) {
	this._die();
	var coords = [];
	for (var i=this.x-this.radius;i<=this.x+this.radius;i++) {
		for (var j=this.y-this.radius;j<=this.y+this.radius;j++) {
			if (!RZ.rz.isValid(i, j)) { continue; }
			coords.push([i, j]);
		}
	}
	this._explode(coords);
}


/**
 * Airstrike - ultimate explosion
 */
RZ.Item.Airstrike = OZ.Class().extend(RZ.Item);
RZ.Item.Airstrike.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.price = 20;
	this.amount = 1;
	this.name = "Airstrike";
	this.desc = "Ultimate bombing";
}
RZ.Item.Airstrike.prototype.use = function(dir) {
	var coords = [];
	
	var thickness = 2;
	var length = 5;
	var p = RZ.rz.player;
	var d1 = DIRS[dir];
	
	/**
	 * even directions use normals
	 * odd directions use +1/+3 (to achieve a level of aesthecity)
	 */
	var dirOffset = (dir % 2 ? dir % 4 : 2);
	var d2 = DIRS[(dir+dirOffset)%8];
	
	for (var i=-length;i<=length;i++) {
		for (var j=-thickness;j<=thickness;j++) {
			var x = p.x + i*d1[0] + j*d2[0];
			var y = p.y + i*d1[1] + j*d2[1];
			if (RZ.rz.isValid(x, y)) { coords.push([x, y]); }
		}
	}
	
	this._explode(coords);
	RZ.Item.prototype.use.call(this, dir);
}
