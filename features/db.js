const fs = require('fs');

// ไฟล์สำหรับเก็บข้อมูลบัญชีของกิลด์
const dbPath = './economy.json';

function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '{}');
    const data = JSON.parse(fs.readFileSync(dbPath));

    // ตัวแปรข้อมูลบอสโลกเริ่มต้น หากยังไม่มีใน DB
    if (!data['boss']) {
        data['boss'] = {
            name: '🔥 มังกรดำเพลิงอสูร (Ancient Black Dragon)',
            hp: 5000,
            maxHp: 5000,
            reward: 10000,
            damages: {}
        };
    }
    return data;
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

function ensureUserData(db, id) {
    if (!db[id]) {
        db[id] = {
            balance: 0,
            bank: 0,
            lastDaily: 0,
            lastHunt: 0,
            lastBossAttack: 0,
            lastRob: 0,
            inventory: {
                amulet: 0,
                potion: 0,
                ring: 0,
                weapons: {
                    sword: 0,
                    shield: 0,
                    bow: 0,
                    dagger: 0,
                    staff: 0
                }
            }
        };
    } else {
        if (db[id].bank === undefined) db[id].bank = 0;
        if (db[id].lastBossAttack === undefined) db[id].lastBossAttack = 0;
        if (db[id].lastRob === undefined) db[id].lastRob = 0;
        if (db[id].jailUntil === undefined) db[id].jailUntil = 0;
        if (db[id].lastHeist === undefined) db[id].lastHeist = 0;
        if (!db[id].inventory) db[id].inventory = {};
        if (db[id].inventory.amulet === undefined) db[id].inventory.amulet = 0;
        if (db[id].inventory.potion === undefined) db[id].inventory.potion = 0;
        if (db[id].inventory.ring === undefined) db[id].inventory.ring = 0;

        if (!db[id].inventory.weapons) {
            db[id].inventory.weapons = {
                sword: 0,
                shield: 0,
                bow: 0,
                dagger: 0,
                staff: 0
            };
            // ไมเกรทข้อมูลดาบเก่า
            if (db[id].inventory.sword && db[id].inventory.sword > 0) {
                const oldLvl = (db[id].inventory.swordLevel || 0) + 1;
                db[id].inventory.weapons.sword = oldLvl;
            }
        }
    }
}

// 🔒 ระบบเช็คสถานะนักโทษ (Jail System)
function isInJail(db, userId) {
    const jailUntil = db[userId]?.jailUntil || 0;
    if (jailUntil <= Date.now()) return { inJail: false, minutesLeft: 0 };
    const minutesLeft = Math.ceil((jailUntil - Date.now()) / (60 * 1000));
    return { inJail: true, minutesLeft };
}

module.exports = {
    dbPath,
    loadDB,
    saveDB,
    ensureUserData,
    isInJail
};
