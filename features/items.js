const { saveDB } = require('./db');

// ==========================================
// 🧪 คำสั่งใช้ไอเทม (!use หรือ !ใช้)
// ==========================================
module.exports = {
    commands: ['!use', '!ใช้'],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
            return message.reply('❌ กรุณาไปสุ่มสเตตัส ออกล่า และปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const item = args[0]?.toLowerCase();
        if (!item) return message.reply('❌ ระบุไอเทมที่ต้องการใช้ด้วย (เช่น `!use potion` หรือ `!ใช้ โพชั่น`)');

        if (item === 'potion' || item === 'โพชั่น' || item === 'ยาโพชั่น') {
            const count = db[userId].inventory?.potion || 0;
            if (count <= 0) return message.reply('❌ คุณไม่มี **🧪 ยาโพชั่นเร่งสปีด** ในกระเป๋า! สั่งซื้อได้ที่ `!shop`');

            db[userId].inventory.potion -= 1;
            db[userId].lastHunt = 0;
            saveDB(db);

            return message.reply('🧪 **ดื่มยาโพชั่นเร่งสปีดสำเร็จ!** คูลดาวน์การออกล่า (`!hunt`) ถูกรีเซ็ตทันที! ลุยต่อได้เลย!');
        } else {
            return message.reply('❌ ไม่พบไอเทมนี้ที่สามารถใช้งานได้');
        }
    }
};
