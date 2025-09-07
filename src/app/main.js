import '../styles/main.css';

import beep from '../assets/audio/alert_short.mp3';
import level_up from '../assets/audio/alert_medium_01.mp3';
import ding_dong from '../assets/audio/alert_medium_02.mp3';
import melody from '../assets/audio/alert_long.mp3';

const alerts = {
    short: new Audio(beep),
    medium_01: new Audio(level_up),
    medium_02: new Audio(ding_dong),
    long: new Audio(melody),
};

const long_break_interval_defaults = { default: 4, min: 2, max: 8 };
const long_break_interval = { value: long_break_interval_defaults.default };

const mode_defaults = {
    focus: { default: 25 * 60, min: 5 * 60, max: 480 * 60 },
    short_break: { default: 5 * 60, min: 5 * 60, max: 30 * 60 },
    long_break: { default: 15 * 60, min: 10 * 60, max: 90 * 60 }
};

const mode_durations = {
    focus: mode_defaults.focus.default,
    short_break: mode_defaults.short_break.default,
    long_break: mode_defaults.long_break.default
};

const splash = document.querySelector('.splash');

const sidebar = document.querySelector('.sidebar');
const overlay = document.querySelector('.overlay');

const theme_toggle = document.querySelectorAll('.theme_toggle');
const audio_toggle = document.querySelectorAll('.audio_toggle');
const sidebar_toggle = document.querySelectorAll('.sidebar_toggle');

const audio_alerts = document.querySelectorAll('.audio_option');
const increase_interval_button = document.getElementById('increase_interval');
const decrease_interval_button = document.getElementById('decrease_interval');
const long_break_interval_text = document.getElementById('long_break_interval');
const automatic_sequence_toggle = document.getElementById('automatic_sequence_toggle');
const automatic_sequence_checkbox = document.getElementById('automatic_sequence_checkbox');

const time_display = document.querySelector('.time_display');
const session_alert = document.querySelector('.session_alert');
const session_alert_mode = document.getElementById('session_alert_mode');
const session_alert_continue = document.getElementById('session_alert_continue');

const start_pause_button = document.getElementById('start_pause_button');
const stop_button = document.getElementById('stop_button');
const reset_button = document.getElementById('reset_button');
const edit_button = document.getElementById('edit_button');

const time_adjust = document.querySelectorAll('.time_adjust');
const increase_time_button = document.getElementById('increase_time');
const decrease_time_button = document.getElementById('decrease_time');
const time_text = document.getElementById('time_text');

const mode_buttons = document.querySelectorAll('.mode_button');
const session_counter_amount = document.getElementById('session_counter_amount');

let dark_theme = false;
let audio_muted = false;
let timer_interval = null;
let remaining_time = 0;
let end_time = null;
let is_running = false;
let is_editing = false;
let current_mode = 'focus';
let current_audio_alert = 'short';
let focus_sessions_count = 0;
let automatic_sequence = true;

function animate_splash() {
    setTimeout(() => {
        splash.classList.add('animate');
        setTimeout(() => {
            splash.classList.remove('animate');
            splash.classList.add('hidden');
        }, 300);
    }, 1200);
}

function format_time(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function update_time_display() {
    time_text.textContent = format_time(remaining_time);
    document.title = is_running ? `PomoPixel - ${format_time(remaining_time)}` : 'PomoPixel';
}

function update_time_inputs(total_seconds) {
    remaining_time = total_seconds;
    update_time_display();
    end_time = null;
}

function set_theme() {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        dark_theme = true;
        document.body.classList.add('theme_dark');
        document.body.classList.remove('theme_light');
    } else {
        dark_theme = false;
        document.body.classList.add('theme_light');
        document.body.classList.remove('theme_dark');
    }
}

function toggle_theme() {
    dark_theme = !dark_theme;
    document.body.classList.toggle('theme_dark', dark_theme);
    document.body.classList.toggle('theme_light', !dark_theme);
}

function toggle_audio() {
    audio_muted = !audio_muted;
    Object.values(alerts).forEach(audio => audio.muted = audio_muted);
    audio_toggle.forEach(button => button.classList.toggle('muted', audio_muted));
}

function toggle_sidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function select_audio(option) {
    current_audio_alert = option.dataset.alert;
    audio_alerts.forEach(el => el.classList.remove('current_alert'));
    option.classList.add('current_alert');
    if (audio_muted) toggle_audio();
    Object.entries(alerts).forEach(([key, audio]) => {
        if (key !== current_audio_alert) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    if (alerts[current_audio_alert]) alerts[current_audio_alert].play();
}

function edit_timer() {
    if (!is_running) {
        stop_timer();
        is_editing = !is_editing;
        edit_button.classList.toggle('current', is_editing);
        time_adjust.forEach(elem => elem.classList.toggle('hidden', !is_editing));
    }
}

function increase_time() {
    if (!is_running) {
        const max_time = mode_defaults[current_mode].max;
        remaining_time = Math.min(remaining_time + 5 * 60, max_time);
        mode_durations[current_mode] = remaining_time;
        update_time_display();
        end_time = null;
    }
}

function decrease_time() {
    if (!is_running) {
        const min_time = mode_defaults[current_mode].min;
        remaining_time = Math.max(remaining_time - 5 * 60, min_time);
        mode_durations[current_mode] = remaining_time;
        update_time_display();
        end_time = null;
    }
}

function start_timer() {
    if (!is_running) {
        if (is_editing) edit_timer();
        update_time_display();
        end_time = Date.now() + remaining_time * 1000;

        timer_interval = setInterval(() => {
            const now = Date.now();
            remaining_time = Math.max(Math.round((end_time - now) / 1000), 0);
            update_time_display();

            if (remaining_time <= 0) {
                clearInterval(timer_interval);
                is_running = false;
                if (alerts[current_audio_alert]) alerts[current_audio_alert].play();
                show_session_alert(current_mode);
            }
        }, 250);

        start_pause_button.classList.add('current');
        is_running = true;
    } else pause_timer();
}

function pause_timer() {
    start_pause_button.classList.remove('current');
    clearInterval(timer_interval);
    if (end_time) {
        remaining_time = Math.max(Math.round((end_time - Date.now()) / 1000), 0);
        end_time = null;
    }
    is_running = false;
    update_time_display();
}

function stop_timer() {
    pause_timer();
    update_time_inputs(mode_durations[current_mode]);
    end_time = null;
}

function reset_timer() {
    if (is_editing) edit_timer();
    stop_timer();
    switch_mode('focus');
    mode_durations[current_mode] = mode_defaults[current_mode].default;
    update_time_inputs(mode_durations[current_mode]);
    focus_sessions_count = 0;
    update_session_counter_amount();
    long_break_interval.value = long_break_interval_defaults.default;
    update_long_break_interval_display();
    automatic_sequence = true;
    automatic_sequence_checkbox.classList.add('checked');
    end_time = null;
}

function switch_mode(new_mode) {
    current_mode = new_mode;
    mode_buttons.forEach(button => button.classList.toggle('current', button.dataset.mode === new_mode));
    stop_timer();
}

function show_session_alert(finished_mode) {
    session_alert_mode.textContent = finished_mode === 'focus' ? 'Focus session' : 'Break';
    time_display.classList.add('hidden');
    session_alert.classList.remove('hidden');
    document.title = finished_mode === 'focus' ? "Focus session finished!" : "Break finished!";
    start_pause_button.classList.remove('current');

    if (automatic_sequence) {
        session_alert_continue.classList.add('hidden');
    } else {
        session_alert_continue.classList.remove('hidden');
    }

    let next_mode;
    if (finished_mode === 'focus') {
        if (focus_sessions_count % long_break_interval.value === 0 && focus_sessions_count !== 0) {
            next_mode = 'long_break';
        } else {
            next_mode = 'short_break';
        }
    } else if (finished_mode === 'long_break') {
        focus_sessions_count = 0;
        next_mode = 'focus';
    } else {
        next_mode = 'focus';
    }

    const continue_sequence = () => {
        hide_session_alert();
        if (finished_mode !== 'focus') focus_sessions_count++;
        switch_mode(next_mode);
        update_session_counter_amount();
        start_pause_button.classList.add('current');
        start_timer();
    };

    if (automatic_sequence) {
        setTimeout(continue_sequence, 2000);
    } else {
        session_alert_continue.onclick = continue_sequence;
    }

    document.querySelector('.timer').classList.add("click_off");
    session_alert.classList.add("click_on");
    setTimeout(() => update_time_display(), 2000);
}

function hide_session_alert() {
    session_alert.classList.add('hidden');
    time_display.classList.remove('hidden');
    document.querySelector('.timer').classList.remove("click_off");
    session_alert.classList.remove("click_on");
}

function update_long_break_interval_display() {
    long_break_interval_text.textContent = long_break_interval.value;
}

function increase_long_break_interval() {
    if (long_break_interval.value < long_break_interval_defaults.max) {
        long_break_interval.value++;
        update_long_break_interval_display();
        update_session_counter_amount();
    }
}

function decrease_long_break_interval() {
    if (long_break_interval.value > long_break_interval_defaults.min) {
        long_break_interval.value--;
        update_long_break_interval_display();
        update_session_counter_amount();
    }
}

function update_session_counter_amount() {
    const total = long_break_interval.value;
    let current = focus_sessions_count || 1;
    if (current > total) current = current % total || total;
    session_counter_amount.textContent = `${current} / ${total}`;
}

theme_toggle.forEach(button => {
    button.addEventListener('click', () => {
        toggle_theme();
    });
});

audio_toggle.forEach(button => {
    button.addEventListener('click', () => {
        toggle_audio();
    });
});

sidebar_toggle.forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle_sidebar();
    });
});

sidebar.addEventListener('click', e => e.stopPropagation());
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
});

edit_button.addEventListener('click', edit_timer);
increase_time_button.addEventListener('click', increase_time);
decrease_time_button.addEventListener('click', decrease_time);
start_pause_button.addEventListener('click', () => {
    if (!is_running && current_mode === 'focus' && focus_sessions_count === 0) {
        focus_sessions_count = 1;
        update_session_counter_amount();
    }
    start_timer();
});
stop_button.addEventListener('click', stop_timer);
reset_button.addEventListener('click', reset_timer);

mode_buttons.forEach(button => button.addEventListener('click', () => {
    switch_mode(button.dataset.mode);
    if (button.dataset.mode === 'focus' && focus_sessions_count === 0) {
        focus_sessions_count = 1;
        update_session_counter_amount();
    }
}));

increase_interval_button.addEventListener('click', e => { e.stopPropagation(); increase_long_break_interval(); });
decrease_interval_button.addEventListener('click', e => { e.stopPropagation(); decrease_long_break_interval(); });

automatic_sequence_toggle.addEventListener('click', e => {
    e.stopPropagation();
    automatic_sequence = !automatic_sequence;
    automatic_sequence_checkbox.classList.toggle('checked');
});

audio_alerts.forEach(option => {
    option.addEventListener('click', e => {
        e.stopPropagation();
        select_audio(option);
    });
});

set_theme();
animate_splash();
update_long_break_interval_display();
update_session_counter_amount();
reset_timer();