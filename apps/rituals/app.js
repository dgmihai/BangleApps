// ===== File I/O =====

const RITUALS_FILE = "rituals.json";
const RITUALS_DATA_FILE = "rituals_data.json";

let data = require("Storage").readJSON(RITUALS_FILE, true);
let rituals = { acts:{} };

function writeData(name, input) {
  require("Storage").writeJSON(name, input);
}

// ===== States =====

const TStates = { // Timer states
  active: 1,
  paused: 2,
  expired: 3
};
const LStates = { // Layout states
  menu: 1,
  act: 2,
  description: 3
};
const AStates = { // Act states
  active: 1,
  completed: 2,
  incomplete: 3,
  skipped: 4,
  alreadyDone: 5
};
let tState = TStates.start;
let lState = LStates.start;
let timed = false;

// Timer state
function setTState(s) {
  if (s == TStates.active) {
    tState = (counter <= 0 && timed) ? tState = TStates.expired : tState = TStates.active;
  } else {
    tState = s;
  }
  if (layout) recolor();
  draw();
}

// Layout state
function setLState(s) {
  switch (s) {
    case LStates.act:
      setTimerLayout();
      break;
    case LStates.description:
      setDescLayout();
      break;
    case LStates.menu:
      break;
    default:
      break;
  }
}

// ===== Time =====

let counter, counterInterval;

function now() {
  return Math.floor(Date.now() / 1000);
}

function getTime(add) {
  let t = new Date();
  t.setSeconds(t.getSeconds() + add);
  let sec = t.getSeconds();
  let min = t.getMinutes();
  let hour = t.getHours();
  min = min < 10 ? "0" + min : min;
  let suffix = hour < 12 ? " am" : " pm";
  hour = hour == 0 ? 12 : hour;
  hour = hour > 12 ? hour - 12 : hour;
  return hour + ":" + min + suffix;
}

function formatTimespan(sec, hm) {
  let prefix = sec > 0 ? "" : "+";
  sec = Math.abs(sec);
  let ret = "";
  let min = Math.floor(sec / 60);
  let hour = Math.floor(min / 60);
  min = hm ? min % 60 + "m" : min % 60;
  if (!hm) {
    sec = sec % 60;
    if (sec < 10) {
      sec = "0" + sec;
    }
  }
  if (hour > 0 ) {
    if (min < 10) {
      min = "0" + min;
    }
    ret = hm ? hour + "h" : hour + ":";
  }
  ret = prefix + ret + min;
  ret = hm ? ret : ret + ":" + sec;
  return ret;
}

// ===== Graphics =====

let fontSmall = "6x8";
let fontMedium = g.getFonts().includes("6x15")?"6x15":"6x8:2";
let fontBig = g.getFonts().includes("12x20")?"12x20":"6x8:2";
let fontLarge = g.getFonts().includes("6x15")?"6x15:2":"6x8:4";
let fontHuge = g.getFonts().includes("12x20")?"12x20:2":"6x8:5";

// hack for 2v10 firmware's lack of ':size' font handling
try {
  g.setFont("6x8:2");
} catch (e) {
  g._setFont = g.setFont;
  g.setFont = function(f,s) {
    if (f.includes(":")) {
      f = f.split(":");
      return g._setFont(f[0],f[1]);
    }
    return g._setFont(f,s);
  };
}

let btnPause = {type:"btn", src:atob("EhKCAP/wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP///wAP/w=="), cb: l=>{
  pause();
}};
let btnPlay = {type:"btn", src:atob("EhKCAPAAAAAP8AAAAP/wAAAP//AAAP//8AAP///wAP////AP////8P////////////////8P////AP///wAP//8AAP//AAAP/wAAAP8AAAAPAAAAAA=="), cb: l=>{
  play();
}};
let btns = [ {}, {}, btnPlay, {}, {} ];

var Layout = require("Layout");
let layout, timerLayout, descLayout;
let l = { timer:"", eta:"", fg:"", bg:""};

function draw(item) {
  if (item) {
    layout.clear(item);
    layout.render(item);
  } else {
    layout.clear();
    layout.render();
  }
}

function setTimerLayout() {
  if (!timerLayout) {
    timerLayout = {
      type:"v", c: [
        {type:"h", fillx:1, c: [
          {type:"v", fillx:1, c: [
            {type:"txt", id:"upper",
              font:fontSmall,
              fillx:1, pad:2, halign:1 },
            {type:"txt", id:"title",
              height:"44", fillx:1, pad:2 },
          ]},
        ]},
        {type:"txt", id:"timer",
          font:fontHuge,
          fillx:1, filly:1, pad:2},
        {type:"txt", id:"eta",
          font:fontBig,
          col:"#222222",
          fillx:1, filly:1, pad:2},
        {type:"h", id:"buttons", c: btns }
      ]
    };
  }
  layout = new Layout(timerLayout);
  layout.upper.label = currRit.n;
  layout.title.label = currAct.n;
  recolor();
  if (timed) {
    layout.timer.col = "#000000";
  } else {
    layout.timer.col = "#222222";
  }
  let w = g.getWidth(), lines;
  layout.title.font = fontHuge;
  if (g.setFont(layout.title.font).stringWidth(layout.title.label) > w) {
    layout.title.font = fontBig;
    if (g.setFont(layout.title.font).stringWidth(layout.title.label) > w*2) {
      layout.title.font = fontMedium;
    }
  }
  if (g.setFont(layout.title.font).stringWidth(layout.title.label) > w) {
    lines = g.wrapString(layout.title.label, w);
    layout.title.label = (lines.length>2) ? lines.slice(0,2).join("\n")+"..." : lines.join("\n");
  }
  g.clear();
  draw();
}

function setDescLayout() {
  if (!descLayout) {
    descLayout = {
      type:"v", c: [
        {type:"h", fillx:1, c: [
          {type:"v", fillx:1, c: [
            {type:"txt", id:"upper",
              label:currAct.n,
              font:fontSmall,
              fillx:1, pad:2, halign:1 },
            {type:"txt", id:"timer",
              label:l.timer,
              font:fontMedium,
              height:"44", fillx:1, pad:2 },
          ]},
        ]},
        {type:"txt", id:"body",
          label:currAct.d,
          fillx:1, filly:1, pad:2},
        {type:"h", id:"buttons", fillx:1, c: btns }
      ]
    };
  }
  layout = new Layout(descLayout);
  recolor();
  if (timed) {
    layout.title.col = "#000000";
  } else {
    layout.title.col = "#222222";
  }
  let w = g.getWidth()-10;
  if (g.setFont(layout.body.font).stringWidth(layout.body.label) > w) {
    layout.body.font = fontBig;
    if (g.setFont(layout.body.font).stringWidth(layout.body.label) > w * 2)
      layout.body.font = fontMedium;
  }
  if (g.setFont(layout.body.font).stringWidth(layout.body.label) > w) {
    lines = g.setFont(layout.body.font).wrapString(layout.body.label, w);
    var maxLines = Math.floor((g.getHeight()-110) / g.getFontHeight());
    layout.body.label = (lines.length>maxLines) ? lines.slice(0,maxLines).join("\n")+"..." : lines.join("\n");
  }
  g.clear();
  draw();
}

function recolor() {
  // Colors
  switch (tState) {
    case TStates.active:
      if (timed) {
        l.bg = '#CAFFFF';
        l.fg = '#000000';
      } else {
        l.bg = '#CAFFFF';
        l.fg = '#222222';
      }
      break;
    case TStates.paused:
      l.bg = '#FFFFE0';
      l.fg = '#222222';
      break;
    case TStates.expired:
      l.bg = '#ff4d4d';
      l.fg = '#cc0000';
      break;
    default:
      l.bg = '#00FFFF';
      l.fg = '#000000';
      break;
  }
  layout.upper.bgCol = l.bg;
  layout.title.bgCol = l.bg;
  layout.timer.col = l.fg;
}

// ==== Update Act and Ritual =====

function updateRit() {
  if (!rituals.acts[currAct.pt]) {
    rituals.acts[currAct.pt] = data.acts[currAct.pt];
    if (!rituals.acts[currAct.pt].ti)
      rituals.acts[currAct.pt].ti = {};
  }
  currRit = rituals.acts[currAct.pt];
  if (!currRit.ti.s) currRit.ti.s = now();
}

function updateAct() {
  // Prev act
  if (timed) {
    counter = currAct.ti.est - currAct.ti.et;
    if (currAct.s == AStates.completed || currAct.s == AStates.skipped) {
      if (counter > 0) {
        remaining -= counter;
      }
    }
  }
  if (queue[idx]) {
    currAct = rituals.acts[queue[idx]];
    timed = currAct.ti.est ? true : false;
    // Next act
    if (timed) {
      counter = currAct.ti.est - currAct.ti.et;
      if (currAct.s == AStates.completed || currAct.s == AStates.skipped) {
        if (counter > 0) {
          remaining += counter;
        }
      }
    }
    if (currRit) {
      if (currAct.pt != currRit.id) {
        currRit.s = AStates.incomplete;
        updateRit();
      }
    } else updateRit();
    setTimerLayout();
    play();
  } else {
    clearInterval();
    counterInterval = undefined;
    g.clear();
    E.showMessage("COMPLETE! :)");  
  }
  writeData();
}

// ==== Update =====

function pause() {
  btns[2] = btnPlay;
  currAct.s = AStates.incomplete;
  updateTimer();
  layout.update()
  setTState(TStates.paused);
}

function play() {
  if (!currAct.ti.s) {
    currAct.ti.s = now();
  }
  btns[2] = btnPause;
  currAct.s = AStates.active;
  updateTimer();
  layout.update()
  setTState(TStates.active);
}

function tick() {
  switch (tState) {
    case TStates.active:
      currAct.ti.et++;
      remaining--;
      break;
    case TStates.paused:
      currAct.ti.p++;
      break;
    case TStates.expired:
      currAct.ti.et++;
      break;
  }
  updateTimer();
  switch (tState) {
    case TStates.active:
      if (counter % 300 == 0) Bangle.buzz();
      break;
    case TStates.expired:
      if (counter % 60 == 0) Bangle.buzz();
      break;
  }
}

function updateTimer() {
  counter = currAct.ti.est - currAct.ti.et;
  l.timer = formatTimespan(counter);
  l.eta = getTime(remaining);
  layout.timer.label = l.timer;
  draw(layout.timer);
  if (layout.eta) {
    layout.eta.label = l.eta;
    draw(layout.eta);
  }
  if (counter <= 0 && timed)
    setTState(TStates.active);
}

// ===== Init Ritual =====

let currAct, currRit, idx, queue, currActs, remaining=0;
let queues = [ undefined, [], [], [], [] ];
let etas = [ undefined, 0, 0, 0, 0 ];
function createQueues(actId, pri) {
  let act = data.acts[actId];
  rituals.acts[actId] = act;
  if (!act.ti) act.ti = { et:0, est:0, p:0 };
  if (!act.ti.et) act.ti.et = 0;
  if (!act.ti.est) act.ti.est = 0;
  if (!act.ti.p) act.ti.p = 0;
  if (act.i) {
    createQueues(act.i, 4 - act.py + pri);
  } else if (!act.ty) { // TODO: Hide vs other types
  for (i = Math.max(act.py-pri, 1); i > 0; i--) {
      queues[i].push(actId);
      etas[i] += parseInt(act.ti.est);
    }
  }
  if (act.x) {
    createQueues(act.x, pri);
  }
}

function startRitual(id, priority) {
  E.showMenu();
  E.showMessage("Loading...");
  rituals.sync_token = data.sync_token;
  idx = 0;
  queue = queues[priority];
  initSwipeEvents();
  setWatch( ()=>{
    clearInterval();
    counterInterval = undefined;
    writeData();
    g.clear();
    clearEvents();
    back();
  }, BTN1, {repeat: true});
  g.clear();
  updateAct();
  if (!counterInterval)
    counterInterval = setInterval(tick, 1000);
}

// ===== Input Events =====

/* Navigate by swiping
    swipe up: skip
    swipe down: show description
      if description: swipe up, return
    swipe right: previous event
    swipe left: next event */
function initSwipeEvents() {
  Bangle.removeAllListeners('lock');
  Bangle.on("swipe", function(directionLR, directionUD) {
    if (directionLR == 1 && directionUD == 0) {
      // right
      currAct.s = AStates.incomplete;
      idx--;
      updateAct();
      print("Right")
    }
    if (directionLR == -1 && directionUD == 0) {
      // left
      currAct.s = AStates.completed;
      idx++;
      updateAct();
      print("Left")
    }
    if (directionLR == 0 && directionUD == 1) {
      // down
      if (currAct.d) {
        //setLState(LStates.description); TODO
      }
      print("Down")
    }
    if (directionLR == 0 && directionUD == -1) {
      // up
      if (lState == LStates.description) {
        setLState(LStates.act);
      } else if (lState == LStates.act) {
        currAct.s = AStates.skipped;
        idx++;
        updateAct();
      }
      print("Up")
    }
  });
}

function clearEvents() {
  Bangle.removeAllListeners('swipe');
}

// ===== Menu =====

var m = {};
let menuLayer = [];
function resetMenu() {
  E.showMenu();
  //setLState(LStates.menu);
  m = {
    '': {
    }
  };
}

function menuHeadings() {
  resetMenu();
  for (let hid of Object.keys(data.hdgs)) {
    const h = hid;
    m[data.hdgs[h].n] = ()=>{
      menuLayer.unshift(String(h));
      menuRitual(String(h));
    };
  }
  E.showMenu(m);
}

function menuRitual(id) {
  resetMenu();
  for (let rid of data.hdgs[id].rs) {
    const r = rid;
    m[data.acts[r].n] = ()=>{
      menuLayer.unshift(r);
      menuTimes(r);
    };
  }
  m['']['title'] = data.hdgs[id].n;
  m['']['back'] = ()=>{ back(); }
  E.showMenu(m);
}

function menuTimes(id) {
  resetMenu();
  E.showMessage("Loading...");
  createQueues(data.acts[id].x, 0);
  const r = id;
  for (i=1; i < 5; i++) {
    const k = i;
    if (etas[i]) {
      m[getTime(etas[k]) + ", " + formatTimespan(etas[k], true)] = ()=>{ remaining = etas[k]; startRitual(r, k); }
    }  
  }
  m['']['back'] = ()=>{ back(); }
  E.showMenu(m);
}

function back() {
  queues = [ undefined, [], [], [], [] ];
  etas = [ undefined, 0, 0, 0, 0 ];
  remaining = 0;
  queue = [];
  menuLayer = [];
  menuHeadings();
}

menuHeadings();