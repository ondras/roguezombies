RZ.Dialog = OZ.Class();
RZ.Dialog.prototype.init = function(title) {
	this._ec = [];
	this._container = OZ.DOM.elm("div", {id:"dialog"});
	this._content = OZ.DOM.elm("div");
	document.body.appendChild(this._container);
	this._container.appendChild(OZ.DOM.elm("h2", {innerHTML:title}));
	this._container.appendChild(this._content);

	this._build();
	this._sync();
	this._ec.push(OZ.Event.add(window, "resize", this._resize.bind(this)));
	RZ.rz.lock();
}

RZ.Dialog.prototype._build = function() {
}

RZ.Dialog.prototype._resize = function(e) {
	this._sync();
}

RZ.Dialog.prototype._sync = function() {
	var win = OZ.DOM.win();
	var w = this._container.offsetWidth;
	var h = this._container.offsetHeight;
	this._container.style.left = Math.round((win[0]-w)/2) + "px";
	this._container.style.top = Math.round((win[1]-h)/2) + "px";
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
	var item = this._itemlist[index];
	if (this._showPrice && item.price > RZ.rz.player.getMoney()) { return; }
	var open = this._callback(item);
	if (open) { 
		this._build();
	} else {
		this._close(); 
	}
}

RZ.Dialog.prototype._close = function() {
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }
	RZ.Keyboard.forget(this);

	var s = this._container.style;
	if ("MozTransition" in s || "webkitTransition" in s || "transition" in s || "oTransition" in s) {
		var done = this._closeDone.bind(this);
		this._ec.push(OZ.Event.add(this._container, "transitionend", done));
		this._ec.push(OZ.Event.add(this._container, "oTransitionEnd", done));
		this._ec.push(OZ.Event.add(this._container, "webkitTransitionEnd", done));
		
		var r = Math.floor(Math.random()*5);
		OZ.DOM.addClass(this._container, "hidden");
		OZ.DOM.addClass(this._container, "hidden-"+r);
	} else {
		this._closeDone();
	}

}

RZ.Dialog.prototype._closeDone = function() {
	while (this._ec.length) { OZ.Event.remove(this._ec.pop()); }
	this._container.parentNode.removeChild(this._container);
	RZ.rz.unlock();
}

/**
 * Dialog with list of items (buy, use)
 */
RZ.Dialog.Items = OZ.Class().extend(RZ.Dialog);
RZ.Dialog.Items.prototype.init = function(title, itemlist, callback, showPrice) {
	this._itemlist = itemlist;
	this._callback = callback;
	this._showPrice = showPrice;
	
	RZ.Dialog.prototype.init.call(this, title);

	RZ.Keyboard.listen(this, this._keyDown);
	this._ec.push(OZ.Event.add(this._content, "click", this._click.bind(this)));
}

RZ.Dialog.Items.prototype._build = function() {
	OZ.DOM.addClass(this._container, "items");
	var str = "<table><thead><tr><td></td><td>Item</td>";
	if (this._showPrice) { str += "<td>Price</td>"; }
	str += "<td>Amount</td></tr></thead><tfoot></tfoot><tbody></tbody></table>";
	this._content.innerHTML = str;

	var tb = this._content.getElementsByTagName("tbody")[0];
	var tf = this._content.getElementsByTagName("tfoot")[0];
	
	var playerItems = RZ.rz.player.items;
	var playerMoney = RZ.rz.player.getMoney();
	
	for (var i=0;i<this._itemlist.length;i++) {
		var item = this._itemlist[i];
		var tr = OZ.DOM.elm("tr");
		
		var td = OZ.DOM.elm("td");
		var b = OZ.DOM.elm("input", {type:"button", value:String.fromCharCode(i+65)});
		if (this._showPrice && item.price > playerMoney) { b.disabled = true; }
		td.appendChild(b);
		tr.appendChild(td);
		
		var td = OZ.DOM.elm("td", {innerHTML: "<strong>"+item.name+"</strong>: "+item.desc});
		tr.appendChild(td);
		
		if (this._showPrice) {
			var td = OZ.DOM.elm("td", {innerHTML: item.price + "&nbsp;for&nbsp;" + item.amount});
			tr.appendChild(td);
		}
		
		var amount = 0;
		for (var j=0;j<playerItems.length;j++) {
			var playerItem = playerItems[j];
			if (item.equals(playerItem)) { amount = playerItem.amount; }
		}
		var td = OZ.DOM.elm("td", {innerHTML: amount});
		tr.appendChild(td);
		
		tb.appendChild(tr);
	}
	
	var tr = OZ.DOM.elm("tr");
	var td = OZ.DOM.elm("td", {colSpan:(this._showPrice ? 4 : 3)});
	var b = OZ.DOM.elm("input", {type:"button", value:"Z (cancel)"});
	OZ.DOM.append([tf, tr], [tr, td], [td, b]);
}

RZ.Dialog.Items.prototype._keyDown = function(e) {
	var kc = e.keyCode;
	this._processCode(kc);
}

RZ.Dialog.Items.prototype._click = function(e) {
	var t = OZ.Event.target(e);
	if (t.nodeName.toLowerCase() != "input") { return; }
	var code = t.value.charCodeAt(0);
	this._processCode(code);
}

RZ.Dialog.Items.prototype._processCode = function(code) {
	if (code == "Z".charCodeAt(0)) {
		var open = this._callback(null);
		if (!open) { this._close(); }
		return;
	}
	
	var index = code - "A".charCodeAt(0);
	if (index < 0 || index >= this._itemlist.length) { return; }
	var item = this._itemlist[index];
	if (this._showPrice && item.price > RZ.rz.player.getMoney()) { return; }
	var open = this._callback(item);
	if (open) { 
		this._build();
	} else {
		this._close(); 
	}
}

/**
 * Welcome dialog
 */
RZ.Dialog.Welcome = OZ.Class().extend(RZ.Dialog);
RZ.Dialog.Welcome.prototype.init = function() {
	RZ.Dialog.prototype.init.call(this, "Welcome to Rogue Zombies!");
}
RZ.Dialog.Welcome.prototype._build = function() {
	OZ.DOM.addClass(this._container, "welcome");
	var texts = [
		"Those undead bastards are getting close to your house! It is time to put up some defenses, \
		buy necessary tools, lay out some traps and get ready to kick many brainless asses. \
		Remember: they might eventually get you, so try to survive as long as possible!",
		"This game is played only by keyboard arrows (to move yourself around) and \
		letters (to buy and use stuff). You gain money for every zombie killed; you exchange money \
		for items and traps. You start with three lives, so take care&hellip;",
		"Press any key to start game."
	];
	while (texts.length) { this._content.appendChild(OZ.DOM.elm("p", {innerHTML:texts.shift()})); }
	this._ec.push(OZ.Event.add(document, "keypress", this._keyPress.bind(this)));
}

RZ.Dialog.Welcome.prototype._keyPress = function(e) {
	this._close();
}
