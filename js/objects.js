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
RZ.Item.prototype._explodeInRadius = function(x, y, r) {
	var coords = [];
	for (var i=x-r;i<=x+r;i++) {
		for (var j=y-r;j<=y+r;j++) {
			if (!RZ.rz.isValid(i, j)) { continue; }
			coords.push([i, j]);
		}
	}
	this._explode(coords);
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
	this.hp = 2;
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
	this._explodeInRadius(this.x, this.y, this.radius);
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
	RZ.Item.prototype.use.call(this, dir);

	var coords = [];
	
	var thickness = 2;
	var length = 5;
	var p = RZ.rz.player;
	var d1 = DIRS[dir];
	
	/**
	 * even directions use normals
	 * odd directions use +1/+3 (to achieve a certain level of aesthetics)
	 */
	var dirOffset = (dir % 2 ? dir % 4 : 2);
	var d2 = DIRS[(dir+dirOffset)%8];
	
	for (var i=-length;i<=length;i++) {
		var strip = [];
		for (var j=-thickness;j<=thickness;j++) {
			var x = p.x + i*d1[0] + j*d2[0];
			var y = p.y + i*d1[1] + j*d2[1];
			if (RZ.rz.isValid(x, y)) { strip.push([x, y]); }
		}
		coords.push(strip);
	}
	var step = function() {
		this._explode(coords.shift());
		if (coords.length) { setTimeout(step, 30); }
		
	}.bind(this);
	step();
}

/**
 * Bazooka - ranged explosion
 */
RZ.Item.Bazooka = OZ.Class().extend(RZ.Item);
RZ.Item.Bazooka.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.price = 8;
	this.amount = 1;
	this.name = "Bazooka";
	this.desc = "fire and forget";
	this.visual = {ch:"*", fg:"yellow"};
}
RZ.Item.Bazooka.prototype.use = function(dir) {
	RZ.Item.prototype.use.call(this, dir);
	RZ.rz.lock();
	
	var offset = DIRS[dir];
	var x = RZ.rz.player.x;
	var y = RZ.rz.player.y;
	
	var step = function() {
		RZ.rz.removeFX(x, y);
		x += offset[0];
		y += offset[1];
		if (!RZ.rz.isValid(x, y)) { 
			RZ.rz.unlock();
			return;
		}
		
		var being = RZ.rz.getBeing(x, y);
		var item = RZ.rz.getItem(x, y);
		if (being || (item && item.blocks > 0)) {
			this._explodeInRadius(x, y, 2);
			RZ.rz.unlock();
		} else {
			RZ.rz.addFX(this, x, y);
			setTimeout(step, 50);
		}
		
	}.bind(this);
	step();	
}

/**
 * Barbed wire
 */
RZ.Item.Wire = OZ.Class().extend(RZ.Item);
RZ.Item.Wire.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.price = 3;
	this.amount = 2;
	this.blocks = 1;
	this.name = "Barbed wire";
	this.desc = "auto-connects to other wires; blocks &amp; damages zombies";
	this.visual = {ch:"#", fg:"#888"};
}
RZ.Item.Wire.prototype.use = function(dir) {
	RZ.Item.prototype.use.call(this, dir);
	
	/* place this block */
	var d = DIRS[dir];
	var cx = RZ.rz.player.x + d[0];
	var cy = RZ.rz.player.y + d[1];
	RZ.rz.addItem(this.clone(), cx, cy);
	
	/* try other directions */
	for (var i=0;i<DIRS.length;i++) {
		var d = DIRS[i];
		var found = null;
		var length = 1;
		while (1) {
			var x = cx + length*d[0];
			var y = cy + length*d[1];
			if (!RZ.rz.isValid(x, y) || RZ.rz.getBeing(x, y)) { break; }

			var item = RZ.rz.getItem(x, y);
			if (item) {
				if (!this.equals(item)) { break; }
				found = length;
				break;
			} 
			
			length++;
		}
		
		if (!found) { continue; }
		for (var j=1;j<found;j++) {
			var x = cx + j*d[0];
			var y = cy + j*d[1];
			RZ.rz.addItem(this.clone(), x, y);
		}
	}
}
RZ.Item.Wire.prototype.damage = function(being) {
	being.damage(this); /* kill the zombie */
	RZ.Item.prototype.damage.call(this, being); /* die normally */
}

/**
 * Electric fence
 */
RZ.Item.Fence = OZ.Class().extend(RZ.Item);
RZ.Item.Fence.prototype.init = function() {
	RZ.Item.prototype.init.call(this);
	this.price = 3;
	this.amount = 2;
	this.hp = 3;
	this.name = "Electric fence";
	this.desc = "auto-connects to other fences; damages zombies";
	this.visual = {ch:"*"};
	this.chars = ["|", "/", "-", "\\"];
	this._updateVisual();
}
RZ.Item.Fence.prototype.use = function(dir) {
	RZ.Item.prototype.use.call(this, dir);
	
	/* place this block */
	var d = DIRS[dir];
	var cx = RZ.rz.player.x + d[0];
	var cy = RZ.rz.player.y + d[1];
	RZ.rz.addItem(this.clone(), cx, cy);
	

	/* try other directions */
	for (var i=0;i<DIRS.length;i++) {
		var d = DIRS[i];
		var found = null;
		var length = 1;
		while (1) {
			var x = cx + length*d[0];
			var y = cy + length*d[1];
			if (!RZ.rz.isValid(x, y) || RZ.rz.getBeing(x, y)) { break; }

			var item = RZ.rz.getItem(x, y);
			if (item) {
				if (!this.equals(item)) { break; }
				found = length;
				break;
			} 
			
			length++;
		}
		
		if (!found) { continue; }
		for (var j=1;j<found;j++) {
			var x = cx + j*d[0];
			var y = cy + j*d[1];
			var clone = this.clone();
			clone.visual.ch = this.chars[i % this.chars.length];
			RZ.rz.addItem(clone, x, y);
		}
		if (found > 1) {
			var x = cx + found*d[0];
			var y = cy + found*d[1];
			var node = RZ.rz.getItem(x, y);
			node.visual.ch = "*";
			RZ.rz.draw(x, y);
		}
	}
}
RZ.Item.Fence.prototype.activate = function(being) {
	being.damage(this); /* kill the zombie */
	
	this.damage(being); /* take some damage */	
	for (var i=0;i<DIRS.length;i++) { /* let other segments take damage as well */
		var d = DIRS[i];
		var length = 1;
		var ch = this.chars[i % this.chars.length];
		while (1) {
			var x = this.x + length * d[0];
			var y = this.y + length * d[1];
			var item = RZ.rz.getItem(x, y);
			if (item && this.equals(item) && item.visual.ch == ch) {
				item.damage(this);
			} else {
				break;
			}

			length++;
		}
	}
}

RZ.Item.Fence.prototype._updateVisual = function() {
	var colors = ["", "#008", "#33a", "#88f"];
	this.visual.fg = colors[this.hp];
}

