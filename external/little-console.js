;(function() {

var api = LittleConsole;
api.forEls = function(els) {
  [].forEach.call(els,function(el) {
    new LittleConsole({
      el: el,
      commands: new Commands
    });
  });
}

window.LittleConsole = api;
LittleConsole.Commands = Commands;

// library

var evts = {
  on: function(evt,fn,ctx) {
    this._evts = this._evts || {};
    this._evts[evt] = this._evts[evt] || [];
    this._evts[evt].push({fn:fn,ctx:ctx});
  },
  off: function(evt,fn,ctx) {
    this._evts = this._evts || {};
    if(fn == null && ctx == null) {
      return delete this._evts[evt];
    }
    this._evts[evt] = (this._evts[evt] || []).filter(function(cb) {
      return cb.fn === fn && cb.ctx === ctx;
    });
  },
  fire: function(evt) {
    this._evts = this._evts || {};
    var args = [].slice.call(arguments,1);
    (this._evts[evt] || []).forEach(function(cb) {
      cb.fn.apply(cb.ctx,args);
    });
  }
}

function LittleConsole(opts) {
  this.el = opts.el || mk("div");
  this.commands = opts.commands;
  this.input = new ConsoleInput({commands: this.commands});
  this.input.on("command",this.commands.run.bind(this.commands));
  this.results = new Results({commands: this.commands});
  this.el.appendChild(this.input.el);
  this.el.appendChild(this.results.el);
}
LittleConsole.prototype = {
  setCommand: function(cmd) {
    this.input.setCommand(cmd);
  }
}


function ConsoleInput(opts) {
  this.el = mk("form");
  this.inputEl = mk("input");
  this.el.appendChild(this.inputEl);

  this.commands = opts.commands;
  this.offset = 0;
  this.currentCommand = {command: ""};

  on(this.el,"submit",this.checkAndFire,this);
  on(this.el,"keyup",this.handleKey,this);
}
ConsoleInput.prototype = {
  checkAndFire: function(evt) {
    evt.preventDefault();
    if(!/^\s*$/.test(this.inputEl.value)) {
      this.fire("command",this.inputEl.value);
      this.inputEl.value = "";
      this.offset = 0;
    }
  },
  setCommand: function(cmd) {
    this.inputEl.value = cmd;
  },
  handleKey: function(evt) {
    switch(evt.keyCode) {
    case UP:
      evt.preventDefault();
      return this.changeOffset(1);
    case DOWN:
      evt.preventDefault();
      return this.changeOffset(-1);
    }
  },
  changeOffset: function(by) {
    if(this.offset === 0) {
      this.currentCommand = {command: this.inputEl.value};
    }
    if(this.offset + by > this.commands.length || this.offset + by < 0) {
      return;
    }
    this.offset += by;
    var cmd = this.offset === 0 ? this.currentCommand : this.commands.nthAgo(this.offset - 1);
    this.inputEl.value = cmd.command;
  }
}
var UP = 38;
var DOWN = 40;
mixin(ConsoleInput.prototype,evts);

function Results(opts) {
  this.el = mk("code");
  this.commands = opts.commands;
  this.commands.on("command",this.addCommand,this);

  this.insertType = opts.insertType || "top";
}
Results.prototype = {
  addCommand: function(cmd) {
    var el = mk("p");
    el.innerHTML = "&gt; " + escapeHtml(cmd.command);

    var resultEl = mk("p");
    if(cmd.error) {
      resultEl.innerText = cmd.error;
      resultEl.className = "error";
    } else {
      try {
        resultEl.innerText = JSON.stringify(cmd.result);
      } catch(e) {
        // circular JSON etc
        resultEl.innerText = cmd.result;
      }
      resultEl.className = "result";
    }

    if(this.insertType === "last"){
      this.el.appendChild(el);
      this.el.appendChild(resultEl);
    }else{
      this.el.insertBefore(el, this.el.firstChild);
      this.el.insertBefore(resultEl, this.el.firstChild);
    }


    // workaround bug where first element is squashed
    // after scroll, can only see 2nd until scroll changed
    setTimeout(function() {

      if(this.insertType === "last"){
        this.el.scrollTop = this.el.scrollHeight;
      } else{
        this.el.scrollTop = 0;
      }
    }.bind(this));
  }
}
mixin(Results.prototype,evts);

function Commands() {
  this._cmds = [];
}
Commands.prototype = {
  nthAgo: function(nth) {
    return this._cmds[this._cmds.length - 1 - nth];
  },
  get length() {
    return this._cmds.length;
  },
  run: function(src) {
    var cmd = {command:src};
    //var _ = this.result;
    src = this.clean(src)
    try {
      console.log(src)
      this.result = eval(src);
    } catch(e) {
      cmd.error = e; 
    }
    if(!cmd.error) {
      console.log(this.result);
      cmd.result = this.result;
    }else{
      console.log('error', cmd.error);
    }
    if(!this._cmds[0] || this._cmds[this._cmds.length - 1].command != cmd.command) {
      this._cmds.push(cmd);
    }
    this.fire("command",cmd);
  },
  clean: function(src) {
    return src.replace(/^\s*var /,"");
  }
}
mixin(Commands.prototype,evts);


function mixin(into,from) {
  for(var p in from) into[p] = from[p];
}
function mk(e) { return document.createElement(e) }
function on(el,evt,fn,ctx) {
  el.addEventListener(evt,fn.bind(ctx));
}
var escaper;
function escapeHtml(text) {
  if(!escaper) escaper = mk("div");
  escaper.innerText = text;
  return escaper.innerHTML;
}

})();
