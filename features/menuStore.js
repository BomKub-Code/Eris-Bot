const fs = require('fs');

// เก็บ mapping channelId -> messageId ของเมนูปุ่มที่ปักหมุดไว้ ป้องกันไม่ให้โพสต์ซ้ำทุกครั้งที่บอทรีสตาร์ท
const storePath = './menu-messages.json';

function loadStore() {
    if (!fs.existsSync(storePath)) fs.writeFileSync(storePath, '{}');
    return JSON.parse(fs.readFileSync(storePath));
}

function saveStore(data) {
    fs.writeFileSync(storePath, JSON.stringify(data, null, 4));
}

module.exports = { loadStore, saveStore };
