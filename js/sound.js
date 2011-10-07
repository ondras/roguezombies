RZ.Sound = {
	supported: !!window.Audio,
	_ext: "",
	_bg: null,
	_dom: {
		container: OZ.DOM.elm("div", {id:"audio"}),
		title: OZ.DOM.elm("strong"),
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
	
	init: function() {
		if (!this.supported) { return; }
		
		this._build();
		
		this._bg = new Audio();
		this._ext = (this._bg.canPlayType("audio/ogg") ? "ogg" : "mp3");
		OZ.Event.add(this._bg, "ended", this._next.bind(this));
	},
	
	start: function() {
		if (!this.supported) { return; }
		document.body.appendChild(this._dom.container);
		this._playBackground(); 
	},

	_expandName: function(name) {
		return "sfx/" + name  + "." + this._ext;
	},
	
	_playpause: function() {
		if (this._bg.paused) { this._bg.play(); } else { this._bg.pause(); }
	},
	
	_next: function() {
		this._backgrounds.push(this._backgrounds.shift());
		this._playBackground();
	},
	
	_prev: function() {
		this._backgrounds.unshift(this._backgrounds.pop());
		this._playBackground();
	},
	
	_playBackground: function() {
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
		
		OZ.Event.add(prev, "click", this._prev.bind(this));
		OZ.Event.add(next, "click", this._next.bind(this));
		OZ.Event.add(pause, "click", this._playpause.bind(this));
		
		OZ.Event.add(this._dom.container, "mouseover", this._show.bind(this));
		OZ.Event.add(this._dom.container, "mouseout", this._hide.bind(this));
		
		OZ.DOM.append(
			[
				this._dom.container, OZ.DOM.elm("span", {innerHTML:"Currently playing: "}), 
				this._dom.title, this._dom.controls, OZ.DOM.elm("span", {id:"note", innerHTML:"♪"})
			],
			[this._dom.controls, prev, pause, next]
		);
	},
	
	_show: function() {
		this._dom.container.style.right = "0px";
		this._dom.container.style.top = "0px";
	},
	
	_hide: function() {
		var radius = 25;
		var width = this._dom.container.offsetWidth - radius;
		var height = this._dom.container.offsetHeight - radius;
		this._dom.container.style.right = (-width) + "px";
		this._dom.container.style.top = (-height) + "px";
	},

}
