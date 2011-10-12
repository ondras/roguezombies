RZ.Sound = {
	supported: !!window.Audio,
	_ext: "",
	_bg: null,
	_dom: {
		container: OZ.DOM.elm("div", {id:"audio"}),
		title: OZ.DOM.elm("strong", {innerHTML:"n/a"}),
		controls: OZ.DOM.elm("div", {id:"controls"})
	},
	_backgrounds: [
		{
			title: "Ray Parker Jr. &ndash; Ghostbusters",
			name: "ghostbusters"
		},
		{
			title: "Dire Straits &ndash; Six Blade Knife",
			name: "sixbladeknife"
		},
		{
			title: "Ozzy Osbourne &ndash; Perry Mason",
			name: "perrymason"
		}
		
	],
	_effects: {
		airstrike:		{ count: 1 },
		barricade:		{ count: 2 },
		bazooka: 		{ count: 1 },
		crowbar: 		{ count: 3 },
		fence: 			{ count: 3 },
		rake: 			{ count: 2 },
		"mine-large": 	{ count: 1 },
		"mine-small": 	{ count: 1 },
		wire: 			{ count: 2 },
		zombie: 		{ count: 9 }
	},
	
	init: function() {
		if (!this.supported) { return; }
		
		this._build();
		
		this._bg = new Audio();
		this._ext = (this._bg.canPlayType("audio/ogg") ? "ogg" : "mp3");
		OZ.Event.add(this._bg, "ended", this._next.bind(this));

		for (var name in this._effects) {
			var data = this._effects[name];
			data.audio = [];
			for (var i=0;i<data.count;i++) {
				var n = name;
				if (data.count > 1) { n += i; }
				var a = new Audio(this._expandName(n));
				a.load();
				data.audio.push(a);
			}
		}
	},
	
	start: function() {
		if (!this.supported) { return; }
		document.body.appendChild(this._dom.container);
		if (this._getMusicEnabled()) {
			this._playBackground(); 
		} else {
			this._hide();
		}
	},
	
	playEffect: function(name) {
		if (!this.supported) { return; }
		if (!this._getEffectsEnabled()) { return; }
		var data = this._effects[name];
		if (!data) { return; }
		data.audio.random().play();
	},
	
	_getMusicEnabled: function() {
		if (!window.localStorage) { return true; }
		if (localStorage.getItem("music-disabled")) { return false; }
		return true;
	},
	
	_setMusicEnabled: function(enabled) {
		if (!window.localStorage) { return; }
		if (enabled) {
			localStorage.removeItem("music-disabled");
		} else {
			localStorage.setItem("music-disabled", "1");
		}
	},

	_getEffectsEnabled: function() {
		if (!window.localStorage) { return true; }
		if (localStorage.getItem("effects-disabled")) { return false; }
		return true;
	},
	
	_setEffectsEnabled: function(enabled) {
		if (!window.localStorage) { return; }
		if (enabled) {
			localStorage.removeItem("effects-disabled");
		} else {
			localStorage.setItem("effects-disabled", "1");
		}
	},

	_expandName: function(name) {
		return "sfx/" + name  + "." + this._ext;
	},
	
	_playpause: function() {
		if (this._bg.paused) { 
			this._bg.play(); 
			this._setMusicEnabled(true);
		} else { 
			this._bg.pause(); 
			this._setMusicEnabled(false);
		}
	},
	
	_next: function() {
		this._backgrounds.push(this._backgrounds.shift());
		this._playBackground();
	},
	
	_prev: function() {
		this._backgrounds.unshift(this._backgrounds.pop());
		this._playBackground();
	},
	
	_toggleEffects: function(e) {
		this._setEffectsEnabled(OZ.Event.target(e).checked);
	},
	
	_playBackground: function() {
		this._setMusicEnabled(true);
		if (!this._backgrounds.length) { return; }
		var sound = this._backgrounds[0];
		this._bg.src = this._expandName(sound.name);
		this._bg.play();
		this._dom.title.innerHTML = sound.title;
		this._show();
		
		setTimeout(this._hide.bind(this), 2000);
	},
	
	_build: function() {
		var prev = OZ.DOM.elm("span", {title:"Play previous", innerHTML: "◀"});
		var pause = OZ.DOM.elm("span", {title:"Pause/Play", innerHTML: "■"});
		var next = OZ.DOM.elm("span", {title:"Play next", innerHTML: "▶"});
		
		var effects = OZ.DOM.elm("div", {innerHTML:"<label><input type='checkbox' />sound effects</label>"});
		var input = effects.getElementsByTagName("input")[0];
		input.checked = this._getEffectsEnabled();
		
		OZ.Event.add(prev, "click", this._prev.bind(this));
		OZ.Event.add(next, "click", this._next.bind(this));
		OZ.Event.add(pause, "click", this._playpause.bind(this));
		
		OZ.Event.add(input, "click", this._toggleEffects.bind(this));
		
		OZ.Event.add(this._dom.container, "mouseover", this._show.bind(this));
		OZ.Event.add(this._dom.container, "mouseout", this._hide.bind(this));
		
		OZ.DOM.append(
			[
				this._dom.container, OZ.DOM.elm("span", {innerHTML:"Currently playing: "}), 
				this._dom.title, this._dom.controls, effects, OZ.DOM.elm("span", {id:"note", innerHTML:"♫"})
			],
			[this._dom.controls, prev, pause, next]
		);
	},
	
	_show: function() {
		this._dom.container.style.right = "0px";
		this._dom.container.style.top = "0px";
	},
	
	_hide: function() {
		var radius = 30;
		var width = this._dom.container.offsetWidth - radius;
		var height = this._dom.container.offsetHeight - radius;
		this._dom.container.style.right = (-width) + "px";
		this._dom.container.style.top = (-height) + "px";
	},

}
