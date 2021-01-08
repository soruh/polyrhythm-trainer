var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var animation_frame;
var PULSE_THICCNESS = [3, 3.5];
var PULSE_DURATION = [2, 5];
var COLORS = ["#ffa500", "#ff1493", "#00ced1", "#00ff00", "#f0e68c"];
function get_time_inputs(time_container) {
    if (time_container === undefined)
        time_container = document.getElementById("time-container");
    return Array.from(time_container.children).filter(function (x) { return x instanceof HTMLInputElement; });
}
var TIMES = [];
var TICKS = 0;
function update_times() {
    TIMES = [];
    var inputs = get_time_inputs();
    for (var _a = 0, inputs_1 = inputs; _a < inputs_1.length; _a++) {
        var input = inputs_1[_a];
        var val = parseInt(input.value);
        if (isFinite(val) && !isNaN(val) && val > 0)
            TIMES.push(val);
    }
    TICKS = TIMES.reduce(function (acc, t) { return lcm(acc, t); }, 1);
}
function add_time() {
    var time_container = document.getElementById("time-container");
    var i = get_time_inputs(time_container).length;
    var new_input = document.createElement("input");
    new_input.onchange = update_times;
    new_input.setAttribute("autocomplete", "off");
    new_input.setAttribute("size", "3");
    new_input.setAttribute("style", "background-color: " + COLORS[i] || "#FFF");
    time_container.appendChild(new_input);
    time_container.appendChild(document.createElement("br"));
    update_times();
}
function sub_time() {
    var time_container = document.getElementById("time-container");
    for (var _a = 0, _b = Array.from(time_container.children).slice(-2); _a < _b.length; _a++) {
        var elem = _b[_a];
        time_container.removeChild(elem);
    }
    update_times();
}
var mutes = {
    all: false,
    tick: false
};
function toggle_mute(which) {
    mutes[which] = !mutes[which];
    this.checked = mutes[which];
}
var PERIOD = 4;
function update_period(self) {
    var period = document.getElementById("period");
    var bpm = document.getElementById("bpm");
    var new_period = 0;
    if (self == period) {
        new_period = parseFloat(self.value);
        bpm.value = Math.round(60 * 4 / new_period).toString();
    }
    else if (self == bpm) {
        new_period = 60 * 4 / parseFloat(self.value);
        period.value = (Math.round(new_period * 100) / 100).toString();
    }
    else {
        console.error("unreachable");
    }
    if (!isNaN(new_period) && isFinite(new_period) && new_period > 0)
        PERIOD = new_period;
}
var AUDIOS = [
    ["audio/mp3", "https://soundcamp.org/sounds/381/snare/A/1990s-treble-heavy-snare-drum-a-key-05-3uy.mp3"],
    ["audio/wav", "https://soundcamp.org/sounds/381/snare/A/2000s-clicky-acoustic-snare-sound-a-key-02-WDx.wav"],
    ["audio/wav", "https://soundcamp.org/sounds/381/snare/A/00s-verby-acoustic-snare-a-key-03-uRg.wav"],
];
var AUDIO_ELEMENTS = [];
function play(audio_group) {
    audio_group[0] += 1;
    audio_group[0] %= audio_group[1].length;
    var audio = audio_group[1][audio_group[0]];
    if (!audio.paused) {
        create_additional_audio_element(audio_group[2]);
    }
    audio.fastSeek(0);
    audio.play();
}
function create_additional_audio_element(i) {
    console.log("creating audio element " + i);
    var audio_container = document.getElementById("audios");
    var _a = AUDIOS[i], type = _a[0], src = _a[1];
    var audio_elem = document.createElement("audio");
    audio_elem.setAttribute("type", type);
    audio_elem.setAttribute("src", src);
    audio_container.appendChild(audio_elem);
    audio_elem.load();
    AUDIO_ELEMENTS[i][1].push(audio_elem);
}
window.addEventListener("load", function () {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    document.getElementById("period").value = PERIOD.toString();
    set_canvas_size(canvas);
    add_time();
    add_time();
    {
        var inputs = get_time_inputs();
        inputs[0].value = "3";
        inputs[1].value = "4";
    }
    toggle_mute.call(document.getElementById("mute-ticks"), "tick");
    update_times();
    var period = document.getElementById("period");
    period.value = PERIOD.toString();
    update_period(period);
    for (var i in AUDIOS) {
        AUDIO_ELEMENTS[i] = [0, [], +i];
        create_additional_audio_element(+i);
    }
    // Preemtively create aditional tick element
    create_additional_audio_element(0);
    var round_trip_time = function () { return Math.round(PERIOD * 1000); };
    var start_time = Date.now();
    var last_tick = TICKS - 1;
    var thick_frames = [0, 0];
    var tick_frac = 0;
    var do_tick = function () {
        var now = Date.now();
        tick_frac = (now - start_time) % round_trip_time() / round_trip_time() * TICKS;
        var tick = Math.floor(tick_frac);
        var playing = false;
        if (tick != last_tick) {
            thick_frames = mutes.all ? [0, 0] : mutes.tick ? [0, PULSE_DURATION[1]] : PULSE_DURATION;
            playing = true;
        }
        last_tick = tick;
        if (playing) {
            if (!(mutes.tick || mutes.all)) {
                var audio_group = AUDIO_ELEMENTS[0];
                play(audio_group);
            }
            if (!mutes.all) {
                for (var i in TIMES) {
                    if (tick % (TICKS / TIMES[i]) == 0) {
                        var audio_index = +i % (AUDIO_ELEMENTS.length - 1) + 1;
                        var audio_group = AUDIO_ELEMENTS[audio_index];
                        play(audio_group);
                    }
                }
            }
        }
    };
    var anim = function () {
        set_canvas_size(canvas);
        var thicc = thick_frames.map(function (x) { return x > 0; });
        thick_frames = thick_frames.map(function (x) { return x = x == 0 ? 0 : x - 1; });
        render(canvas, ctx, TIMES, TICKS, tick_frac, thicc);
        animation_frame = requestAnimationFrame(anim);
    };
    var start = document.getElementById("start");
    start.onclick = function () {
        document.body.removeChild(start);
        anim();
        setInterval(do_tick, 1);
    };
});
function set_canvas_size(canvas) {
    canvas.height = canvas.width = Math.min(window.innerWidth, window.innerHeight);
}
function render(canvas, ctx, times, ticks, tick, thicc) {
    var w = canvas.width;
    var h = canvas.height;
    var DOT_SIZE = w / 100;
    var DOT_PADDING = DOT_SIZE / 2;
    var DOT_SPACING = 2 * (DOT_SIZE + DOT_PADDING);
    var TICK_WIDTH = w / 50;
    function draw_dot(ctx, mid, radius, angle) {
        ctx.beginPath();
        ctx.arc.apply(ctx, __spreadArrays(spoke_point(mid, radius, angle), [DOT_SIZE, 0, 2 * Math.PI]));
        ctx.fill();
        ctx.setLineDash([]);
    }
    function dot_offset(i) {
        return (+i + 1) * DOT_SPACING;
    }
    var default_line_width = w / 200;
    var line_widths = [];
    for (var _a = 0, times_1 = times; _a < times_1.length; _a++) {
        var time = times_1[_a];
        var width = default_line_width;
        if (thicc[1] && Math.trunc(tick) % (ticks / time) == 0) {
            width *= PULSE_THICCNESS[1];
        }
        line_widths.push(width);
    }
    default_line_width *= thicc[0] ? PULSE_THICCNESS[0] : 1;
    var mid = [w / 2, h / 2];
    var radius = w / 2 - ctx.lineWidth - (times.length + 0.5) * DOT_SPACING;
    var dash_size = radius / 5;
    ctx.lineWidth = default_line_width;
    // Clear the screen
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    var spokes = [];
    for (var i = 0; i < ticks; i++)
        spokes[i] = [];
    for (var j in times) {
        var n = times[j];
        var spoke_ticks = ticks / n;
        for (var i = 0; i < n; i++) {
            var spoke_index = i * spoke_ticks;
            spokes[spoke_index].push(+j);
        }
    }
    // Draw dots
    for (var i in times) {
        ctx.fillStyle = ctx.strokeStyle = COLORS[i] || "#fff";
        ctx.lineWidth = line_widths[i];
        var spoke_radius = radius + dot_offset(+i);
        ctx.beginPath();
        ctx.arc.apply(ctx, __spreadArrays(mid, [spoke_radius, 0, 2 * Math.PI]));
        ctx.stroke();
    }
    for (var _i in spokes) {
        var i = +_i;
        var n = spokes[i].length;
        var frac = i / ticks;
        var angle = 2 * Math.PI * frac;
        // Draw spoke parts ouside of circle
        var first_index = spokes[i][0];
        var next_dots = spokes[i].slice(1);
        for (var _k in next_dots) {
            var k = +_k;
            var j = next_dots[k];
            ctx.fillStyle = ctx.strokeStyle = COLORS[j] || "#fff";
            ctx.lineWidth = line_widths[j];
            ctx.beginPath();
            ctx.moveTo.apply(ctx, spoke_point(mid, radius + dot_offset(first_index), angle));
            ctx.lineTo.apply(ctx, spoke_point(mid, radius + dot_offset(j), angle));
            ctx.stroke();
        }
        // Draw actual spokes
        spokes[i] = spokes[i].sort().reverse();
        for (var _k in spokes[i]) {
            var k = +_k;
            var j = spokes[i][k];
            ctx.fillStyle = ctx.strokeStyle = COLORS[j] || "#fff";
            ctx.lineWidth = line_widths[j];
            var spoke_radius = radius + dot_offset(j);
            draw_spoke(ctx, mid, spoke_radius, angle, dash_size, k, n);
            draw_dot(ctx, mid, spoke_radius, angle);
        }
    }
    ctx.beginPath();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = default_line_width;
    ctx.arc.apply(ctx, __spreadArrays(mid, [radius, 0, 2 * Math.PI]));
    ctx.stroke();
    for (var i = 0; i < ticks; i++) {
        var frac = i / ticks;
        var angle = 2 * Math.PI * frac;
        ctx.beginPath();
        ctx.moveTo.apply(ctx, spoke_point(mid, radius - TICK_WIDTH / 2, angle));
        ctx.lineTo.apply(ctx, spoke_point(mid, radius + TICK_WIDTH / 2, angle));
        ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc.apply(ctx, __spreadArrays(mid, [4, 0, 2 * Math.PI]));
    ctx.fill();
    var tick_angle = tick / ticks * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo.apply(ctx, spoke_point(mid, 0, tick_angle));
    ctx.lineTo.apply(ctx, spoke_point(mid, radius, tick_angle));
    ctx.stroke();
}
function lcm(x, y) {
    return (!x || !y) ? 0 : Math.abs((x * y) / gcd(x, y));
}
function gcd(x, y) {
    while (y) {
        var t = y;
        y = x % y;
        x = t;
    }
    return x;
}
function spoke_point(mid, radius, angle) {
    angle += Math.PI * 1.5;
    return [radius * Math.cos(angle) + mid[0], radius * Math.sin(angle) + mid[1]];
}
function draw_spoke(ctx, mid, radius, angle, dash_size, dash_index, n_dashes) {
    if (n_dashes > 1)
        ctx.setLineDash([dash_size / n_dashes, dash_size * (n_dashes - 1) / n_dashes]);
    ctx.beginPath();
    var spoke_start;
    if (n_dashes > 1) {
        spoke_start = spoke_point(mid, dash_index / n_dashes * dash_size, angle);
    }
    else {
        spoke_start = mid;
    }
    ctx.moveTo.apply(ctx, spoke_start);
    ctx.lineTo.apply(ctx, spoke_point(mid, radius, angle));
    ctx.stroke();
}
