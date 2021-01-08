var animation_frame: number;

const PULSE_THICCNESS = [3, 3.5];
const PULSE_DURATION = [2, 5];

const COLORS = ["#ffa500", "#ff1493", "#00ced1", "#00ff00", "#f0e68c"];


function get_time_inputs(time_container?: HTMLElement): HTMLInputElement[] {
    if (time_container === undefined) time_container = document.getElementById("time-container");
    return Array.from(time_container.children).filter(x => x instanceof HTMLInputElement) as HTMLInputElement[]
}

var TIMES = [];
var TICKS = 0;
function update_times() {

    TIMES = [];

    let inputs = get_time_inputs();
    for (let input of inputs) {
        let val = parseInt(input.value);
        if (isFinite(val) && !isNaN(val) && val > 0) TIMES.push(val);

    }

    TICKS = TIMES.reduce((acc, t) => lcm(acc, t), 1);
}

function add_time() {
    let time_container = document.getElementById("time-container");

    let i = get_time_inputs(time_container).length;

    let new_input = document.createElement("input");
    new_input.onchange = update_times;
    new_input.setAttribute("autocomplete", "off");
    new_input.setAttribute("size", "3");
    new_input.setAttribute("style", "background-color: " + COLORS[i] || "#FFF");
    time_container.appendChild(new_input);

    time_container.appendChild(document.createElement("br"));

    update_times();
}
function sub_time() {

    let time_container = document.getElementById("time-container");
    for (let elem of Array.from(time_container.children).slice(-2)) {
        time_container.removeChild(elem);
    }

    update_times();
}


let mutes = {
    all: false,
    tick: false,
};

function toggle_mute(which: string) {
    mutes[which] = !mutes[which];
    this.checked = mutes[which];
}


var PERIOD = 4;


function update_period(self: HTMLInputElement) {
    let period = document.getElementById("period") as HTMLInputElement;
    let bpm = document.getElementById("bpm") as HTMLInputElement;

    let new_period = 0;
    if (self == period) {
        new_period = parseFloat(self.value)
        bpm.value = Math.round(60 * 4 / new_period).toString();
    } else if (self == bpm) {
        new_period = 60 * 4 / parseFloat(self.value);
        period.value = (Math.round(new_period * 100) / 100).toString();
    } else {
        console.error("unreachable");
    }



    if (!isNaN(new_period) && isFinite(new_period) && new_period > 0) PERIOD = new_period;
}


const AUDIOS = [
    ["audio/mp3", "https://soundcamp.org/sounds/381/snare/A/1990s-treble-heavy-snare-drum-a-key-05-3uy.mp3"],
    ["audio/wav", "https://soundcamp.org/sounds/381/snare/A/2000s-clicky-acoustic-snare-sound-a-key-02-WDx.wav"],
    ["audio/wav", "https://soundcamp.org/sounds/381/snare/A/00s-verby-acoustic-snare-a-key-03-uRg.wav"],
];

let AUDIO_ELEMENTS: [number, HTMLAudioElement[], number][] = [];


function play(audio_group: [number, HTMLAudioElement[], number]) {
    audio_group[0] += 1
    audio_group[0] %= audio_group[1].length

    let audio = audio_group[1][audio_group[0]];

    if (!audio.paused) {
        create_additional_audio_element(audio_group[2]);
    }

    audio.fastSeek(0);
    audio.play();
}

function create_additional_audio_element(i: number) {
    console.log("creating audio element " + i);

    let audio_container = document.getElementById("audios");

    let [type, src] = AUDIOS[i];
    let audio_elem = document.createElement("audio");
    audio_elem.setAttribute("type", type);
    audio_elem.setAttribute("src", src);
    audio_container.appendChild(audio_elem);
    audio_elem.load();

    AUDIO_ELEMENTS[i][1].push(audio_elem);

}

window.addEventListener("load", function () {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    let ctx = canvas.getContext("2d");

    (document.getElementById("period") as HTMLInputElement).value = PERIOD.toString();

    set_canvas_size(canvas);

    add_time();
    add_time();

    {
        let inputs = get_time_inputs();
        inputs[0].value = "3";
        inputs[1].value = "4";
    }

    toggle_mute.call(document.getElementById("mute-ticks"), "tick")

    update_times();

    let period = document.getElementById("period") as HTMLInputElement;
    period.value = PERIOD.toString();
    update_period(period);


    for (let i in AUDIOS) {
        AUDIO_ELEMENTS[i] = [0, [], +i];
        create_additional_audio_element(+i);
    }

    // Preemtively create aditional tick element
    create_additional_audio_element(0);

    let round_trip_time = () => Math.round(PERIOD * 1000);

    const start_time = Date.now();
    let last_tick = TICKS - 1;

    let thick_frames = [0, 0];


    let tick_frac = 0;
    let do_tick = () => {
        let now = Date.now();
        tick_frac = (now - start_time) % round_trip_time() / round_trip_time() * TICKS;
        let tick = Math.floor(tick_frac);

        let playing = false;
        if (tick != last_tick) {
            thick_frames = mutes.all ? [0, 0] : mutes.tick ? [0, PULSE_DURATION[1]] : PULSE_DURATION;

            playing = true;
        }


        last_tick = tick;

        if (playing) {
            if (!(mutes.tick || mutes.all)) {
                let audio_group = AUDIO_ELEMENTS[0];

                play(audio_group);
            }

            if (!mutes.all) {
                for (let i in TIMES) {
                    if (tick % (TICKS / TIMES[i]) == 0) {
                        let audio_index = +i % (AUDIO_ELEMENTS.length - 1) + 1

                        let audio_group = AUDIO_ELEMENTS[audio_index];

                        play(audio_group);
                    }
                }
            }
        }
    };

    let anim = () => {
        set_canvas_size(canvas);


        let thicc = thick_frames.map(x => x > 0) as [boolean, boolean];

        thick_frames = thick_frames.map(x => x = x == 0 ? 0 : x - 1);

        render(canvas, ctx, TIMES, TICKS, tick_frac, thicc);

        animation_frame = requestAnimationFrame(anim);
    }




    let start = document.getElementById("start");
    start.onclick = function () {
        document.body.removeChild(start);
        anim();

        setInterval(do_tick, 1);
    };
});

function set_canvas_size(canvas: HTMLCanvasElement) {
    canvas.height = canvas.width = Math.min(
        window.innerWidth,
        window.innerHeight,
    );
}



function render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, times: number[], ticks: number, tick: number, thicc: [boolean, boolean]) {
    let w = canvas.width;
    let h = canvas.height;


    const DOT_SIZE = w / 100;
    const DOT_PADDING = DOT_SIZE / 2;
    const DOT_SPACING = 2 * (DOT_SIZE + DOT_PADDING);
    const TICK_WIDTH = w / 50;


    function draw_dot(ctx: CanvasRenderingContext2D, mid: [number, number], radius: number, angle: number) {
        ctx.beginPath();
        ctx.arc(...spoke_point(mid, radius, angle), DOT_SIZE, 0, 2 * Math.PI);
        ctx.fill();
        ctx.setLineDash([]);
    }


    function dot_offset(i: number) {
        return (+i + 1) * DOT_SPACING;
    }


    let default_line_width = w / 200;

    let line_widths = [];
    for (let time of times) {
        let width = default_line_width;

        if (thicc[1] && Math.trunc(tick) % (ticks / time) == 0) {
            width *= PULSE_THICCNESS[1];
        }

        line_widths.push(width);
    }

    default_line_width *= thicc[0] ? PULSE_THICCNESS[0] : 1;


    let mid: [number, number] = [w / 2, h / 2];
    let radius = w / 2 - ctx.lineWidth - (times.length + 0.5) * DOT_SPACING;
    let dash_size = radius / 5;


    ctx.lineWidth = default_line_width;

    // Clear the screen
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);


    let spokes = [];
    for (let i = 0; i < ticks; i++) spokes[i] = [];

    for (let j in times) {
        let n = times[j];
        let spoke_ticks = ticks / n;

        for (let i = 0; i < n; i++) {
            let spoke_index = i * spoke_ticks;
            spokes[spoke_index].push(+j);
        }
    }


    // Draw dots
    for (let i in times) {
        ctx.fillStyle = ctx.strokeStyle = COLORS[i] || "#fff";
        ctx.lineWidth = line_widths[i];
        let spoke_radius = radius + dot_offset(+i);

        ctx.beginPath();
        ctx.arc(...mid, spoke_radius, 0, 2 * Math.PI);
        ctx.stroke();
    }



    for (let _i in spokes) {
        let i: number = +_i;

        let n = spokes[i].length;


        let frac = i / ticks;
        let angle = 2 * Math.PI * frac;


        // Draw spoke parts ouside of circle
        let first_index = spokes[i][0];
        let next_dots = spokes[i].slice(1);
        for (let _k in next_dots) {
            let k = +_k;
            let j = next_dots[k];

            ctx.fillStyle = ctx.strokeStyle = COLORS[j] || "#fff";
            ctx.lineWidth = line_widths[j];


            ctx.beginPath();
            ctx.moveTo(...spoke_point(mid, radius + dot_offset(first_index), angle));
            ctx.lineTo(...spoke_point(mid, radius + dot_offset(j), angle));
            ctx.stroke();
        }


        // Draw actual spokes
        spokes[i] = spokes[i].sort().reverse();

        for (let _k in spokes[i]) {
            let k = +_k;
            let j = spokes[i][k];

            ctx.fillStyle = ctx.strokeStyle = COLORS[j] || "#fff";
            ctx.lineWidth = line_widths[j];

            let spoke_radius = radius + dot_offset(j);

            draw_spoke(ctx, mid, spoke_radius, angle, dash_size, k, n);
            draw_dot(ctx, mid, spoke_radius, angle);
        }


    }


    ctx.beginPath();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = default_line_width;
    ctx.arc(...mid, radius, 0, 2 * Math.PI);
    ctx.stroke();




    for (let i = 0; i < ticks; i++) {
        let frac = i / ticks;

        let angle = 2 * Math.PI * frac;

        ctx.beginPath();
        ctx.moveTo(...spoke_point(mid, radius - TICK_WIDTH / 2, angle));
        ctx.lineTo(...spoke_point(mid, radius + TICK_WIDTH / 2, angle));
        ctx.stroke();
    }




    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(...mid, 4, 0, 2 * Math.PI);
    ctx.fill();


    let tick_angle = tick / ticks * 2 * Math.PI;

    ctx.beginPath();
    ctx.moveTo(...spoke_point(mid, 0, tick_angle));
    ctx.lineTo(...spoke_point(mid, radius, tick_angle));
    ctx.stroke();
}


function lcm(x: number, y: number): number {
    return (!x || !y) ? 0 : Math.abs((x * y) / gcd(x, y));
}

function gcd(x: number, y: number): number {
    while (y) {
        var t = y;
        y = x % y;
        x = t;
    }
    return x;
}

function spoke_point(mid: [number, number], radius: number, angle: number): [number, number] {
    angle += Math.PI * 1.5;
    return [radius * Math.cos(angle) + mid[0], radius * Math.sin(angle) + mid[1]];
}



function draw_spoke(ctx: CanvasRenderingContext2D, mid: [number, number], radius: number, angle: number, dash_size: number, dash_index: number, n_dashes: number) {
    if (n_dashes > 1) ctx.setLineDash([dash_size / n_dashes, dash_size * (n_dashes - 1) / n_dashes]);

    ctx.beginPath();
    let spoke_start: [number, number];
    if (n_dashes > 1) {
        spoke_start = spoke_point(mid, dash_index / n_dashes * dash_size, angle);
    } else {
        spoke_start = mid;
    }

    ctx.moveTo(...spoke_start);
    ctx.lineTo(...spoke_point(mid, radius, angle));
    ctx.stroke();

}

