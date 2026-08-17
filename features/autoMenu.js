const { ChannelType } = require('discord.js');
const { findMenuKey, buildMenuPayload } = require('./menu');
const { loadStore, saveStore } = require('./menuStore');

const BUMP_DEBOUNCE_MS = 2500;
const bumpTimers = new Map(); // channelId -> Timeout

// โพสต์เมนูปุ่มในห้องที่รองรับตอนบอทเริ่มทำงาน ถ้ามีอยู่แล้ว (ยังไม่โดนแชทท่วม) ก็แค่รีเฟรชปุ่มแทนการโพสต์ซ้ำ
async function ensureChannelMenu(channel) {
    if (!channel || channel.type !== ChannelType.GuildText) return;

    const menuKey = findMenuKey(channel.name);
    if (!menuKey) return;

    const store = loadStore();
    const existingId = store[channel.id];

    if (existingId) {
        const existing = await channel.messages.fetch(existingId).catch(() => null);
        if (existing) {
            await existing.edit(buildMenuPayload(menuKey)).catch(() => { });
            return;
        }
    }

    const sent = await channel.send(buildMenuPayload(menuKey)).catch(() => null);
    if (!sent) return;

    store[channel.id] = sent.id;
    saveStore(store);
}

async function ensureAllMenus(client) {
    for (const guild of client.guilds.cache.values()) {
        const channels = await guild.channels.fetch().catch(() => null);
        if (!channels) continue;

        for (const channel of channels.values()) {
            await ensureChannelMenu(channel);
        }
    }
}

// ย้ายเมนูปุ่มไปอยู่ล่างสุดของห้อง (ลบอันเก่า + โพสต์ใหม่) ถ้ามันไม่ใช่ข้อความล่าสุดอยู่แล้ว
async function bumpChannelMenu(channel) {
    const menuKey = findMenuKey(channel.name);
    if (!menuKey) return;

    const store = loadStore();
    const oldId = store[channel.id];

    const lastFetched = await channel.messages.fetch({ limit: 1 }).catch(() => null);
    const lastMessage = lastFetched?.first();

    // เมนูอยู่ล่างสุดอยู่แล้ว ไม่ต้องทำอะไร
    if (lastMessage && oldId && lastMessage.id === oldId) return;

    if (oldId) {
        const old = await channel.messages.fetch(oldId).catch(() => null);
        if (old) await old.delete().catch(() => { });
    }

    const sent = await channel.send(buildMenuPayload(menuKey)).catch(() => null);
    if (!sent) return;

    store[channel.id] = sent.id;
    saveStore(store);
}

// หน่วงเวลาไว้สักพัก (debounce) เพื่อรวมข้อความที่เข้ามารัวๆ ให้เด้งเมนูแค่ครั้งเดียวตอนแชทเงียบ
function scheduleBump(channel) {
    if (!channel || channel.type !== ChannelType.GuildText) return;
    if (!findMenuKey(channel.name)) return;

    if (bumpTimers.has(channel.id)) clearTimeout(bumpTimers.get(channel.id));

    const timer = setTimeout(() => {
        bumpTimers.delete(channel.id);
        bumpChannelMenu(channel).catch(err => console.error('❌ bumpChannelMenu error:', err));
    }, BUMP_DEBOUNCE_MS);

    bumpTimers.set(channel.id, timer);
}

module.exports = { ensureAllMenus, ensureChannelMenu, scheduleBump };
