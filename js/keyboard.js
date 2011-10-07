RZ.Keyboard = {
	_listener: null,
	
	_keyDown: function(e) {
		if (this._listener) { this._listener[1](e); }
	},
	
	listen: function(purpose, callback) {
		this._listener = [purpose, callback];
	},
	
	forget: function(purpose) {
		if (this._listener && this._listener[0] == purpose) { this._listener = null; }
	},
	
	keyCodeToDir: function(code) {
		var def = {};
		def[38] = 0;
		def[104] = 0;
		def["W".charCodeAt(0)] = 0;
		
		def[105] = 1;
		def["E".charCodeAt(0)] = 1;

		def[39] = 2;
		def[102] = 2;
		def["D".charCodeAt(0)] = 2;

		def[99] = 3;
		def["C".charCodeAt(0)] = 3;

		def[40] = 4;
		def[98] = 4;
		def["X".charCodeAt(0)] = 4;
		
		def[97] = 5;
		def["Z".charCodeAt(0)] = 5;

		def[37] = 6;
		def[100] = 6;
		def["A".charCodeAt(0)] = 6;

		def[103] = 7;
		def["Q".charCodeAt(0)] = 7;

		def[101] = -1;
		def[109] = -1;
		def["S".charCodeAt(0)] = -1;
		
		return (code in def ? def[code] : null);
	},
	
	init: function() {
		OZ.Event.add(window, "keydown", this._keyDown.bind(this));
	}
};
RZ.Keyboard.init();
