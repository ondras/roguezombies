OZ.Canvas = OZ.Class();

OZ.Canvas.prototype.init = function(dataProvider) {
	var c = OZ.DOM.elm("canvas");
	this._dataProvider = dataProvider;
	this._canvas = c.getContext("2d");
	this._char = [];
	
	OZ.Event.add(window, "resize", this._resize.bind(this));
}

OZ.Canvas.prototype.getCanvas = function() {
	return this._canvas.canvas;
}

OZ.Canvas.prototype.draw = function(x, y) {
	var what = this._dataProvider.getCanvasData(x, y);
	var left = x*(this._char[0]);
	var top = y*(this._char[1]);
	this._canvas.fillStyle = "black";
	this._canvas.fillRect(left, top, this._char[0], this._char[1]);
	
	this._canvas.fillStyle = what[1];
	this._canvas.fillText(what[0], left, top + this._char[1]);	
}

OZ.Canvas.prototype.sync = function() {
	var margin = this._dataProvider.getCanvasMargin();
	var win = OZ.DOM.win();
	win[0] -= margin[0];
	win[1] -= margin[1];

	this._size = this._dataProvider.getCanvasSize();
	var font = this._dataProvider.getCanvasFont();
	var charSize = this._getCharSize(win, font);
	var size = charSize[0];
	this._char[0] = charSize[1];
	this._char[1] = charSize[2];
	
	
	/* adjust canvas size - this also clears the canvas*/
	var w = this._size[0] * this._char[0];
	var h = this._size[1] * this._char[1];
	this._canvas.canvas.width = w;
	this._canvas.canvas.height = h;
	this._canvas.font = size + "px " + font;
	this._canvas.textBaseline = "bottom";

	for (var i=0;i<this._size[0];i++) {
		for (var j=0;j<this._size[1];j++) {
			this.draw(i, j);
		}
	}	
}

OZ.Canvas.prototype._resize = function(e) {
	this.sync();
}

OZ.Canvas.prototype._getCharSize = function(avail, font) {
	var span = OZ.DOM.elm("span", {position:"absolute",innerHTML:"x",fontFamily:font});
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
