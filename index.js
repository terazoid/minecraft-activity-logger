require('dotenv').config();

const axios = require('axios');
const util = require('minecraft-server-util');

const CHECK_INTERVAL_S = getEnv('CHECK_INTERVAL_S');
const MC_HOST = getEnv('MC_HOST');
const TG_TOKEN = getEnv('TG_TOKEN');
const TG_CHAT_ID = getEnv('TG_CHAT_ID');

const playersOnline = new Set();
const playerLoginTime = new Map();
const api = axios.create({
    baseURL: `https://api.telegram.org`,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
check();

async function check() {
    try {
        const newPlayersOnline = new Set();
        const DELAY = 5000;
        const MAX_PINGS = Math.ceil((1000*60*10)/DELAY);
        for(let i=0; i<MAX_PINGS; i++) {
            const pingTime = Date.now();
            const { samplePlayers, onlinePlayers } = await util.status(MC_HOST);
            for(const { name } of samplePlayers || []) {
                newPlayersOnline.add(name);
            }
            if(onlinePlayers <= newPlayersOnline.size || i===MAX_PINGS-1) {
                break;
            }
            await sleep(Math.max(0, DELAY - (Date.now() - pingTime)));
        }
        for(const name of newPlayersOnline) {
            if(!playersOnline.has(name)) {
                onPlayerLogin(name);
            }
        }
        for(const name of playersOnline) {
            if(!newPlayersOnline.has(name)) {
                onPlayerLogout(name);
            }
        }
    }
    catch(err) {
        console.error(err);
    }
    finally {
        setTimeout(check, CHECK_INTERVAL_S * 1000);
    }
}

function onPlayerLogin(name) {
    playersOnline.add(name);
    playerLoginTime.set(name, Date.now());

    sendMessage(`#login ${name}`)
        .catch(console.error);
}

function onPlayerLogout(name) {
    playersOnline.delete(name);
    const loginTime = playerLoginTime.get(name);
    playerLoginTime.delete(name);
    const onlineTime = Math.round((Date.now()-loginTime)/1000);

    const s = String(onlineTime%60).padStart(2, '0');
    const m = String(Math.floor(onlineTime%3600/60)).padStart(2, '0');
    const h = String(Math.floor(onlineTime/3600)).padStart(2, '0');

    sendMessage(`#logout ${name}\nSession duration: ${h}:${m}:${s}`)
        .catch(console.error);
}

async function sendMessage(text) {
    await api.post(`/bot${TG_TOKEN}/sendMessage`, {
        chat_id: Number(TG_CHAT_ID),
        text,
        parse_mode: 'HTML',
    })
}

function getEnv(name) {
    const value = process.env[name];
    if(!value) {
        throw new Error(`${name} env var required`);
    }
    return value;
}
