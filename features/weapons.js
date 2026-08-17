const { ensureUserData } = require('./db');

const WEAPONS_CONFIG = {
    sword: {
        id: 'sword',
        name: '⚔️ ดาบอัศวิน (`sword` หรือ `ดาบ`)',
        displayName: '⚔️ ดาบอัศวิน',
        aliases: ['sword', 'ดาบ', 'ดาบอัศวิน'],
        price: 3000,
        desc: '• เพิ่มโอกาสชนะออกล่าเป็น **65%**\n• ดาเมจบอส **+50 DMG**\n• ตีบวก: เงินออกล่า **+150**/ระดับ & ดาเมจบอส **+25 DMG**/ระดับ'
    },
    shield: {
        id: 'shield',
        name: '🛡️ โล่ศักดิ์สิทธิ์ (`shield` หรือ `โล่`)',
        displayName: '🛡️ โล่ศักดิ์สิทธิ์',
        aliases: ['shield', 'โล่', 'โล่ศักดิ์สิทธิ์'],
        price: 3500,
        desc: '• ลดเงินที่เสียจากการล่าล้มเหลว **30%**\n• มีโอกาสสะท้อนการปล้น (**25%**)\n• ตีบวก: ลดเงินที่เสีย **+5%**/ระดับ & สะท้อนการปล้น **+5%**/ระดับ'
    },
    bow: {
        id: 'bow',
        name: '🏹 ธนูเอลฟ์ (`bow` หรือ `ธนู`)',
        displayName: '🏹 ธนูเอลฟ์',
        aliases: ['bow', 'ธนู', 'ธนูเอลฟ์'],
        price: 4000,
        desc: '• โอกาส Critical ตีบอสเพิ่มเป็น **35%** (ปกติ 20%)\n• ตีบวก: เพิ่มความแรง Critical ตีบอส **+0.1x**/ระดับ (สูงสุด 2.5x)'
    },
    dagger: {
        id: 'dagger',
        name: '🗡️ มีดสั้นนักฆ่า (`dagger` หรือ `มีด`)',
        displayName: '🗡️ มีดสั้นนักฆ่า',
        aliases: ['dagger', 'มีด', 'มีดสั้น'],
        price: 4500,
        desc: '• เพิ่มโอกาสปล้น (`!rob`) สำเร็จเป็น **70%** (ปกติ 60%)\n• ตีบวก: เพิ่มเปอร์เซ็นต์เงินที่ปล้นได้ **+2%**/ระดับ'
    },
    staff: {
        id: 'staff',
        name: '🧙‍♂️ คทาเวทมนตร์ (`staff` หรือ `คทา`)',
        displayName: '🧙‍♂️ คทาเวทมนตร์',
        aliases: ['staff', 'คทา', 'คทาเวทมนตร์'],
        price: 5000,
        desc: '• พลังระเบิดบอสมหาศาล **+120 DMG**\n• ตีบวก: ดาเมจตีบอสเพิ่มขึ้น **+45 DMG**/ระดับ (สายระเบิดบอสแรงสุด!)'
    }
};

function getWeaponLevel(db, id, type) {
    ensureUserData(db, id);
    const val = db[id].inventory?.weapons?.[type] || 0;
    return val > 0 ? val - 1 : -1;
}

function hasWeapon(db, id, type) {
    return getWeaponLevel(db, id, type) >= 0;
}

function findWeapon(query) {
    if (!query) return null;
    const q = query.toLowerCase();
    for (const key of Object.keys(WEAPONS_CONFIG)) {
        const w = WEAPONS_CONFIG[key];
        if (w.aliases.includes(q)) return w;
    }
    return null;
}

module.exports = {
    WEAPONS_CONFIG,
    getWeaponLevel,
    hasWeapon,
    findWeapon
};
