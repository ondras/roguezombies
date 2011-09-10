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
	this._char = [0, 0];
	this._grass = new RZ.Grass();
	this._zombies = [];
	this._beings = {};
	this._items = {};
	this._pendingItem = null;
	
	this._initCanvas();
	this._initStatus();
	this._initItems();
	this._resize();

	this._zombiePotential = 4;
	this._rounds = 0;
	this.player = new RZ.Player();
	this.addBeing(this.player, Math.round(this._size[0]/2), Math.round(this._size[1]/2));
	
	this._playerLoop();
}

RZ.prototype.status = function(text) {
	this._status.innerHTML = text || "&nbsp;";
}

RZ.prototype.lock = function() {
	this._lock++;
}

RZ.prototype.unlock = function() {
	this._lock--;
	if (!this._lock) { this._playerLoop(); }
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
		if (this.at(x, y).blocks) { 
			this._playerLoop();
			return; 
		}
		this.move(this.player, dir);
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
	if (!item) { return false; }
	
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
		return;
	}
	
	if (!item.requiresDirection) {
		item.use();
		this._playerLoop();
		return; /* FIXME what next? */
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
	
	var item = this._items[id];
	if (item) { item.activate(what); }
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

RZ.prototype._initStatus = function() {
	this._status = OZ.DOM.elm("pre", {id:"status"});
	document.body.appendChild(this._status);
	this.status();
}

RZ.prototype._initCanvas = function() {
	var c = OZ.DOM.elm("canvas");
	document.body.appendChild(c);
	this._canvas = c.getContext("2d");
	OZ.Event.add(window, "resize", this._resize.bind(this));
}

RZ.prototype._getCharSize = function(avail) {
	var span = OZ.DOM.elm("span", {position:"absolute",innerHTML:"x"});
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
	var win = OZ.DOM.win();
	win[1] -= this._status.offsetHeight;
	var charSize = this._getCharSize(win);

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
	this._div.parentNode.removeChild(this._div);
}
