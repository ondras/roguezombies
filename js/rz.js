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
	this._lock = 0;
	this._size = [80, 25];
	this._grass = new RZ.Object();
	this._grass.visual = {ch:".", fg:"gray"};
	
	this._share = OZ.$("share");
	this._share.parentNode.removeChild(share);
	
	this._layers = {
		bg: {},
		items: {},
		beings: {},
		fx: {}
	}
	
	this._zombies = [];
	this._pendingItem = null;
	this._lockedMethod = null;
	
	this._canvas = new OZ.Canvas(this);
	document.body.appendChild(this._canvas.getCanvas());

	this._initStatus();
	this._canvas.sync();
	this._initItems();

	this._zombiePotential = 4;
	this._rounds = 0;
	this._score = 0; /* dead zombies */
	this.player = new RZ.Player(this._status.$);
	this.addBeing(this.player, Math.round(this._size[0]/2), Math.round(this._size[1]/2));
	
	new RZ.Dialog.Welcome();
	this._turnPlayer();
}

RZ.prototype.getCanvasFont = function() {
	return "Inconsolata";
}

RZ.prototype.getCanvasMargin = function() {
	return [0, this._status.container.offsetHeight];
}

RZ.prototype.getCanvasSize = function() {
	return this._size;
}

RZ.prototype.getCanvasData = function(x, y) {
	var id = x+"-"+y;
	var what = (this._layers.fx[id] || this._layers.beings[id] || this._layers.items[id] || this._layers.bg[id] || this._grass);	
	var vis = what.visual;
	return [vis.ch, vis.fg];
}

RZ.prototype.status = function(text) {
	this._status.status.innerHTML = text || "&nbsp;";
}

RZ.prototype.lock = function() {
	this._lock++;
}

RZ.prototype.unlock = function() {
	this._lock--;
	if (!this._lock && this._lockedMethod) { 
		var m = this._lockedMethod;
		this._lockedMethod = null;
		m.call(this);
	}
}

RZ.prototype.addBeing = function(being, x, y) {
	being.x = x;
	being.y = y;
	this._layers.beings[x+"-"+y] = being;
	this.draw(x, y);
	this._updateZombies();
}

RZ.prototype.addItem = function(item, x, y) {
	item.x = x;
	item.y = y;
	this._layers.items[x+"-"+y] = item;
	this.draw(x, y);
}

RZ.prototype.addBackground = function(bg, x, y) {
	this._layers.bg[x+"-"+y] = bg;
	this.draw(x, y);
}

RZ.prototype.addFX = function(fx, x, y) {
	this._layers.fx[x+"-"+y] = fx;
	this.draw(x, y);
}

RZ.prototype.removeItem = function(item) {
	var id = item.x+"-"+item.y;
	delete this._layers.items[id];
	this.draw(item.x, item.y);
}

RZ.prototype.removeBeing = function(being) {
	var id = being.x+"-"+being.y;
	delete this._layers.beings[id];
	this.draw(being.x, being.y);
	this._score++;
	
	var index = this._zombies.indexOf(being);
	if (index > -1) { this._zombies.splice(index, 1); }
	
	this._updateZombies();
}

RZ.prototype.removeBackground = function(x, y) {
	delete this._layers.bg[x+"-"+y];
	this.draw(x, y);
}

RZ.prototype.removeFX = function(x, y) {
	delete this._layers.fx[x+"-"+y];
	this.draw(x, y);
}

RZ.prototype._updateZombies = function() {
	this._status.zombies.innerHTML = "Zombies: " + this._zombies.length + "/" + this._score;
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
		this._zombies.push(z);
		this.addBeing(z, corner[0], corner[1]);
	}
};

RZ.prototype._turnZombies = function() {
	if (this._lock) { 
		this._lockedMethod = arguments.callee;
		return;
	}

	this.status();
	for (var i=0;i<this._zombies.length;i++) {
		if (Math.random() > 0.5) { continue; }
		var z = this._zombies[i];
		z.act();
	}
	this._turnPlayer();
}

RZ.prototype._turnPlayer = function() {
	if (this._lock) { 
		this._lockedMethod = arguments.callee;
		return; 
	}

	this._rounds++;
	var amount = this._rounds / 20;
	this._zombiePotential += amount;
	if (this._zombiePotential >= 1) {
		amount = Math.floor(this._zombiePotential);
		this._zombiePotential -= amount;
		this._spawnZombies(amount);
	}
	
	this._playerLoop();
	this._turnZombies();
}

RZ.prototype._playerLoop = function() {
	this.status("Arrow keys to move around, B to buy items, U to use an item");
	this.lock();
	RZ.Keyboard.listen(this, this._keyDown);
}

RZ.prototype._keyDown = function(e) {
	var code = e.keyCode;
	var dir = RZ.Keyboard.keyCodeToDir(code);

	if (dir === null) { /* no direction */
		switch (code) {
			case 66: /* buy */
				this._buyDialog();
			break;
			case 85: /* use */
				this._useDialog();
			break;
			default: /* non-mapped key */
				return;
			break;
		}
	} else if (dir > -1) { /* move */
		var x = this.player.x + DIRS[dir][0];
		var y = this.player.y + DIRS[dir][1];
		var being = this.getBeing(x, y);
		var item = this.getItem(x, y);
		if (!this.isValid(x, y) || being || (item && item.blocks > 0)) { return; } /* cannot go this way */ 
		this.moveBeing(this.player, dir);
	}

	/* key succesully processed, terminate listening */
	RZ.Keyboard.forget(this);
	this.unlock();
}

RZ.prototype._useKeyDown = function(e) {
	var code = e.keyCode;
	if (code == 27) { /* cancel */
		this._pendingItem = null;
		RZ.Keyboard.forget(this);
		this._useDialog();
		this.unlock();
		return;
	}
	
	var dir = RZ.Keyboard.keyCodeToDir(code);
	if (dir == -1 || dir === null) { return; }

	this._pendingItem.use(dir);

	RZ.Keyboard.forget(this);
	this.unlock();
}


RZ.prototype._buyDialog = function() {
	this.status("A–Z to buy, ESC to exit");
	var shop = [
		new RZ.Item.Barricade(),
		new RZ.Item.Rake(),
		new RZ.Item.Wire(),
		new RZ.Item.Fence(),
		new RZ.Item.Mine("Small", 1),
		new RZ.Item.Mine("Large", 2),
		new RZ.Item.Bazooka(),
		new RZ.Item.Airstrike()
	];
	new RZ.Dialog.Items("Buy items", shop, this._buyDone.bind(this), true);
}

RZ.prototype._useDialog = function() {
	this.status("A–Z to use, ESC to cancel");
	new RZ.Dialog.Items("Use items", RZ.rz.player.items, this._useDone.bind(this), false);
}

RZ.prototype._buyDone = function(item) {
	if (!item) { 
		this._playerLoop();
		return false; 
	}
	
	var items = this.player.items;
	var found = false;
	for (var i=0;i<items.length;i++) {
		if (items[i].equals(item)) { 
			items[i].amount += item.amount;
			found = true;
			break;
		}
	}
	
	if (!found) { 
		items.push(item.clone()); 
	}
	
	this.player.adjustMoney(-item.price);

	return true;
}

RZ.prototype._useDone = function(item) {
	if (!item) { /* no item was picked */
		this._playerLoop();
	} else if (!item.directional) { /* just use item */ 
		item.use();
	} else {
		this._pendingItem = item;
		RZ.rz.status("Use " + item.name + ": arrow keys to pick direction, ESC to cancel");
		RZ.Keyboard.listen(this, this._useKeyDown);
		this.lock();
	}
	
	return false; /* always close dialog */
}

RZ.prototype.gameOver = function() {
	new RZ.Dialog.GameOver(this._share, this._rounds, this._score);
}

RZ.prototype.moveBeing = function(being, dir) {
	var id = being.x+"-"+being.y;
	delete this._layers.beings[id];
	this.draw(being.x, being.y);
	being.x += DIRS[dir][0];
	being.y += DIRS[dir][1];
	id = being.x+"-"+being.y;
	this._layers.beings[id] = being;
	this.draw(being.x, being.y);
	
	if (being != this.player) {
		var item = this._layers.items[id];
		if (item) { item.activate(being); }
	}
}

RZ.prototype.getBeing = function(x, y) {
	return this._layers.beings[x+"-"+y];
}

RZ.prototype.getItem = function(x, y) {
	return this._layers.items[x+"-"+y];
}

RZ.prototype.isValid = function(x, y) {
	return (x >= 0 && y >= 0 && x < this._size[0] && y < this._size[1]);
}

RZ.prototype.draw = function(x, y) {
	this._canvas.draw(x, y);
}

RZ.prototype._initStatus = function() {
	this._status = {
		container: OZ.DOM.elm("pre", {id:"status"}),
		$: OZ.DOM.elm("span", {className:"money"}),
		zombies: OZ.DOM.elm("span", {className:"zombies", title:"Alive/Dead"}),
		status: OZ.DOM.elm("span"),
	}
	OZ.DOM.append(
		[document.body, this._status.container],
		[this._status.container, this._status.$, this._status.zombies, this._status.status]
	);
	this.status();
}

RZ.prototype._initItems = function() {
	var house = [
		"╔══h══h══hh══h══h══╗",
		"║                  ╵",
		"║                   ",
		"v                  ╷",
		"║                  ║",
		"v                  v",
		"║                  ║",
		"v                  ╵",
		"║                   ",
		"║                  ╷",
		"╚══h══h═╴  ╶═h══h══╝"
	];
	
	var offset = [Math.round((this._size[0]-house[0].length)/2), Math.round((this._size[1]-house.length)/2)];
	for (var j=0;j<house.length;j++) {
		for (var i=0;i<house[j].length;i++) {
			var ch = house[j].charAt(i);
			if (ch == " ") { continue; }
			
			var item = null;
			if (ch == "h" || ch =="v") { /* window */
				item = new RZ.Item.Window(ch == "h");
			} else {
				item = new RZ.Item.House(ch);
			}
			
			this.addItem(item, offset[0]+i, offset[1]+j);
		}
	}
}
