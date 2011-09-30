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
	
	this._layers = {
		bg: {},
		items: {},
		beings: {},
		fx: {}
	}
	
	this._zombies = [];
	this._pendingItem = null;
	
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
	
	this._playerLoop();
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
	if (!this._lock) { this._playerLoop(); }
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
	this._updateZombies();
}

RZ.prototype.removeBackground = function(x, y) {
	delete this._layers.bg[x+"-"+y];
	this.draw(x, y);
}

RZ.prototype.removeFX = function(x, y) {
	delete this._layers.bg[x+"-"+y];
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
		this.addBeing(z, corner[0], corner[1]);
		this._zombies.push(z);
	}
};

RZ.prototype._turnPlayer = function() {
	this._rounds++;
	var amount = this._rounds / 20;
	this._zombiePotential += amount;
	if (this._zombiePotential >= 1) {
		amount = Math.floor(this._zombiePotential);
		this._zombiePotential -= amount;
		this._spawnZombies(amount);
	}
	
	this._playerLoop();
}

RZ.prototype._playerLoop = function() {
	if (this._lock) { return; }
	this.status("Arrow keys to move around, B to buy items, U to use an item");
	this._event = OZ.Event.add(window, "keydown", this._keyDown.bind(this));
}

RZ.prototype._keyDown = function(e) {
	OZ.Event.remove(this._event);
	var code = e.keyCode;
	var dir = this._keyCodeToDir(code);

	if (dir === null) { /* no direction */
		switch (code) {
			case 66: /* buy */
				this._buyDialog();
			break;
			case 85: /* use */
				this._useDialog();
			break;
			default: /* nothing interesting */
				this._playerLoop();
			break;
		}
		return;
	}
	
	if (dir > -1) {
		var x = this.player.x + DIRS[dir][0];
		var y = this.player.y + DIRS[dir][1];
		var being = this.getBeing(x, y);
		var item = this.getItem(x, y);
		if (being || (item && !item.destructible)) { 
			this._playerLoop();
			return; 
		}
		this.moveBeing(this.player, dir);
	}

	this._turnZombies();
}

RZ.prototype._dirKeyDown = function(e) {
	var dir = this._keyCodeToDir(e.keyCode);
	if (dir == -1 || dir === null) { return; }
	OZ.Event.remove(this._event);
	this._pendingItem.use(dir);
	this._playerLoop();
}

RZ.prototype._keyCodeToDir = function(code) {
	var def = {};
	def[38] = 0;
	def[104] = 0;
	def[105] = 1;
	def[39] = 2;
	def[102] = 2;
	def[99] = 3;
	def[40] = 4;
	def[98] = 4;
	def[97] = 5;
	def[37] = 6;
	def[100] = 6;
	def[103] = 7;
	def[101] = -1;
	def[109] = -1;
	
	return (code in def ? def[code] : null);
}

RZ.prototype._buyDialog = function() {
	this.status("A-Y to buy, Z to exit");
	new RZ.Dialog([new RZ.Item.Rake()], this._buyDone.bind(this));
}

RZ.prototype._useDialog = function() {
	this.status("A-Y to use, Z to cancel");
	new RZ.Dialog(RZ.rz.player.items, this._useDone.bind(this));
}

RZ.prototype._buyDone = function(item) {
	if (!item) { 
		this._playerLoop();
		return false; 
	}
	
	var items = this.player.items;
	var ok = false;
	for (var i=0;i<items.length;i++) {
		if (items[i].constructor == item.constructor) { 
			items[i].amount += item.amount;
			ok = true;
			break;
		}
	}
	
	if (!ok) { items.push(item); }
	
	this._playerLoop();
	return true;
}

RZ.prototype._useDone = function(item) {
	if (!item) { /* no item was picked */
		this._playerLoop();
		return false;
	}
	
	if (!item.requiresDirection) {
		item.use();
		this._playerLoop();
		return false; /* FIXME what next? */
	}
	
	this._pendingItem = item;
	RZ.rz.status("Use " + item.name + ": arrow keys to pick direction");
	this._event = OZ.Event.add(window, "keydown", this._dirKeyDown.bind(this));

	return false; /* always close dialog */
}

RZ.prototype._turnZombies = function() {
	for (var i=0;i<this._zombies.length;i++) {
		if (Math.random() > 0.5) { continue; }
		var z = this._zombies[i];
		z.act();
	}
	
	this._turnPlayer();
}

RZ.prototype.gameOver = function() {
	alert("GAME OVER in round " + this._rounds + ", score: " + this._score);
	this.lock();
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
	this.addItem(new RZ.Item.Barricade(), 2, 2);
	this.addItem(new RZ.Item.Barricade(), 1, 2);
	this.addItem(new RZ.Item.Barricade(), 2, 1);
	this.addItem(new RZ.Item.Rake(), 1, 1);
	
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

RZ.Dialog = OZ.Class();
RZ.Dialog.prototype.init = function(itemlist, callback) {
	this._ec = [];
	this._itemlist = itemlist;
	this._callback = callback;

	var str = "<table><thead><tr><td></td><td>Item</td><td>Price</td></tr></thead><tbody></tbody></table>";
	this._div = OZ.DOM.elm("div", {innerHTML:str, id:"dialog"});
	var tb = this._div.getElementsByTagName("tbody")[0];
	
	for (var i=0;i<itemlist.length;i++) {
		var item = itemlist[i];
		var tr = OZ.DOM.elm("tr");
		
		var td = OZ.DOM.elm("td");
		var b = OZ.DOM.elm("input", {type:"button", value:String.fromCharCode(i+65)});
		td.appendChild(b);
		tr.appendChild(td);
		
		var td = OZ.DOM.elm("td", {innerHTML: "<strong>"+item.name+"</strong>:"+item.desc});
		tr.appendChild(td);
		
		var td = OZ.DOM.elm("td", {innerHTML: item.price + " for " + item.amount});
		tr.appendChild(td);
		
		tb.appendChild(tr);
	}
	
	var tr = OZ.DOM.elm("tr");
	var td = OZ.DOM.elm("td", {colSpan:3});
	var b = OZ.DOM.elm("input", {type:"button", value:"Z (cancel)"});
	OZ.DOM.append([tb, tr], [tr, td], [td, b]);

	document.body.appendChild(this._div);
	var win = OZ.DOM.win();
	var w = this._div.offsetWidth;
	var h = this._div.offsetHeight;
	this._div.style.left = Math.round((win[0]-w)/2) + "px";
	this._div.style.top = Math.round((win[1]-h)/2) + "px";
	
	this._ec.push(OZ.Event.add(document, "keydown", this._keyDown.bind(this)));
	this._ec.push(OZ.Event.add(this._div, "click", this._click.bind(this)));
}

RZ.Dialog.prototype._keyDown = function(e) {
	var kc = e.keyCode;
	this._processCode(kc);
}

RZ.Dialog.prototype._click = function(e) {
	var t = OZ.Event.target(e);
	if (t.nodeName.toLowerCase() != "input") { return; }
	var code = t.value.charCodeAt(0);
	this._processCode(code);
}

RZ.Dialog.prototype._processCode = function(code) {
	if (code == "Z".charCodeAt(0)) {
		var open = this._callback(null);
		if (!open) { this._close(); }
		return;
	}
	
	var index = code - "A".charCodeAt(0);
	if (index >= this._itemlist.length) { return; }
	var open = this._callback(this._itemlist[index]);
	if (!open) { this._close(); }
}

RZ.Dialog.prototype._close = function() {
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }

	var s = this._div.style;
	if ("MozTransition" in s || "webkitTransition" in s || "transition" in s || "oTransition" in s) {
		var done = this._closeDone.bind(this);
		this._ec.push(OZ.Event.add(this._div, "transitionend", done));
		this._ec.push(OZ.Event.add(this._div, "oTransitionEnd", done));
		this._ec.push(OZ.Event.add(this._div, "webkitTransitionEnd", done));
		this._div.className = "hidden";
	} else {
		this._closeDone();
	}

}

RZ.Dialog.prototype._closeDone = function() {
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }
	this._div.parentNode.removeChild(this._div);
}
