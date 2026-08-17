const { EmbedBuilder } = require('discord.js');
const { saveDB, ensureUserData } = require('./db');
const { WEAPONS_CONFIG, getWeaponLevel, hasWeapon, findWeapon } = require('./weapons');

// ==========================================
// 🛒 ระบบร้านค้าและกระเป๋าเก็บของ (!shop, !buy, !inv)
// ==========================================
module.exports = {
    commands: [
        '!shop', '!ร้านค้า',
        '!buy', '!ซื้อ',
        '!inv', '!bag', '!กระเป๋า'
    ],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (command === '!shop' || command === '!ร้านค้า') {
            if (!message.channel.name.includes('ตลาดมืด')) {
                return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const shopEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🛒 ร้านค้าสมาคมนักผจญภัย')
                .setDescription('เลือกซื้อไอเทมและอาวุธเพื่อช่วยเหลือในการเดินทางได้ที่นี่!\nพิมพ์ `!buy <ชื่อไอเทม/ชื่ออาวุธ>` เพื่อทำการซื้อ')
                .addFields(
                    { name: '⚔️ ดาบอัศวิน (`sword`)', value: '💰 **ราคา:** 3,000 ฟรุ้งฟริ้ง\n✨ เพิ่มโอกาสออกล่าชนะเป็น **65%** + ดาเมจบอส **+50 DMG**', inline: false },
                    { name: '🛡️ โล่ศักดิ์สิทธิ์ (`shield`)', value: '💰 **ราคา:** 3,500 ฟรุ้งฟริ้ง\n✨ ลดเงินที่เสียเวลาล่าล้มเหลว **30%** + สะท้อนการถูกปล้น **25%**', inline: false },
                    { name: '🏹 ธนูเอลฟ์ (`bow`)', value: '💰 **ราคา:** 4,000 ฟรุ้งฟริ้ง\n✨ เพิ่มโอกาสคริติคอลเวลาตีบอสเป็น **35%** + ตีแรงขึ้น', inline: false },
                    { name: '🗡️ มีดสั้นนักฆ่า (`dagger`)', value: '💰 **ราคา:** 4,500 ฟรุ้งฟริ้ง\n✨ เพิ่มโอกาสปล้น (`!rob`) เป็น **70%** + ได้เงินปล้นเพิ่มตามบวก', inline: false },
                    { name: '🧙‍♂️ คทาเวทมนตร์ (`staff`)', value: '💰 **ราคา:** 5,000 ฟรุ้งฟริ้ง\n✨ สร้างความเสียหายตีบอสมหาศาล **+120 DMG** (สายระเบิดบอส!)', inline: false },
                    { name: '🛡️ ยันต์ป้องกันภัย (`amulet`)', value: '💰 **ราคา:** 1,500 ฟรุ้งฟริ้ง | ป้องกันการถูกปล้น (`!rob`) อัตโนมัติ 1 ครั้ง', inline: false },
                    { name: '🧪 ยาโพชั่นเร่งสปีด (`potion`)', value: '💰 **ราคา:** 800 ฟรุ้งฟริ้ง | รีเซ็ตคูลดาวน์ออกล่าทันที (`!use potion`)', inline: false },
                    { name: '💍 แหวนแห่งโชคลาภ (`ring`)', value: '💰 **ราคา:** 10,000 ฟรุ้งฟริ้ง | เพิ่มเงิน `!daily` และ `!hunt` ขึ้น **20%** ถาวร', inline: false }
                )
                .setFooter({ text: 'พิมพ์ !buy <ไอเทม> เพื่อสั่งซื้อ | พิมพ์ !ตีบวก เพื่ออัปเกรดอาวุธ' });

            return message.reply({ embeds: [shopEmbed] });
        }

        if (command === '!buy' || command === '!ซื้อ') {
            if (!message.channel.name.includes('ตลาดมืด')) {
                return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const item = args[0]?.toLowerCase();
            if (!item) return message.reply('❌ กรุณาระบุชื่อไอเทมหรืออาวุธที่ต้องการซื้อ (เช่น `!buy sword`, `!buy shield`, `!buy amulet`)');

            const targetWep = findWeapon(item);
            if (targetWep) {
                if (hasWeapon(db, userId, targetWep.id)) return message.reply(`❌ คุณมี **${targetWep.displayName}** อยู่แล้ว! (ใช้คำสั่ง \`!ตีบวก ${targetWep.id}\` เพื่ออัปเกรด)`);
                if (db[userId].balance < targetWep.price) return message.reply(`💸 เงินสดไม่พอ! ${targetWep.displayName} ราคา **${targetWep.price.toLocaleString()} ฟรุ้งฟริ้ง**`);

                db[userId].balance -= targetWep.price;
                db[userId].inventory.weapons[targetWep.id] = 1; // +0 level
                saveDB(db);

                return message.reply(`🎉 สั่งซื้อ **${targetWep.displayName}** สำเร็จ! ใช้คำสั่ง \`!ตีบวก ${targetWep.id}\` เพื่ออัปเกรดได้เลย!`);
            }

            if (item === 'amulet' || item === 'ยันต์') {
                const price = 1500;
                if (db[userId].balance < price) return message.reply(`💸 เงินสดไม่พอ! ยันต์ป้องกันภัยราคา **${price.toLocaleString()} ฟรุ้งฟริ้ง**`);

                db[userId].balance -= price;
                db[userId].inventory.amulet = (db[userId].inventory.amulet || 0) + 1;
                saveDB(db);

                return message.reply(`🎉 สั่งซื้อ **🛡️ ยันต์ป้องกันภัย** สำเร็จ! ตอนนี้คุณมีทั้งหมด **${db[userId].inventory.amulet} ชิ้น** (เงินสดคงเหลือ: ${db[userId].balance.toLocaleString()} ฟรุ้งฟริ้ง)`);
            } else if (item === 'potion' || item === 'โพชั่น' || item === 'ยาโพชั่น') {
                const price = 800;
                if (db[userId].balance < price) return message.reply(`💸 เงินสดไม่พอ! ยาโพชั่นเร่งสปีดราคา **${price.toLocaleString()} ฟรุ้งฟริ้ง**`);

                db[userId].balance -= price;
                db[userId].inventory.potion = (db[userId].inventory.potion || 0) + 1;
                saveDB(db);

                return message.reply(`🎉 สั่งซื้อ **🧪 ยาโพชั่นเร่งสปีด** สำเร็จ! ตอนนี้คุณมี **${db[userId].inventory.potion} ขวด** (ใช้พิมพ์ \`!use potion\`)`);
            } else if (item === 'ring' || item === 'แหวน') {
                const price = 10000;
                if ((db[userId].inventory.ring || 0) > 0) return message.reply('❌ คุณมีแหวนแห่งโชคลาภอยู่แล้ว! (ครอบครองได้สูงสุด 1 วง)');
                if (db[userId].balance < price) return message.reply(`💸 เงินสดไม่พอ! แหวนแห่งโชคลาภราคา **${price.toLocaleString()} ฟรุ้งฟริ้ง**`);

                db[userId].balance -= price;
                db[userId].inventory.ring = 1;
                saveDB(db);

                return message.reply(`🎉 สั่งซื้อ **💍 แหวนแห่งโชคลาภ** สำเร็จ! ได้รับโบนัสเงินเพิ่ม 20% จากการรับเงินเดือนและออกล่าแล้ว!`);
            } else {
                return message.reply('❌ ไม่พบไอเทมหรืออาวุธนี้ในร้านค้า! พิมพ์ `!shop` เพื่อดูรายการที่มีขาย');
            }
        }

        if (command === '!inv' || command === '!bag' || command === '!กระเป๋า') {
            if (!message.channel.name.includes('ตลาดมืด')) {
                return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            ensureUserData(db, userId);

            let weaponsText = "";
            for (const key of Object.keys(WEAPONS_CONFIG)) {
                const w = WEAPONS_CONFIG[key];
                const lvl = getWeaponLevel(db, userId, key);
                if (lvl >= 0) {
                    weaponsText += `${w.displayName}: **+${lvl}**\n`;
                }
            }
            if (!weaponsText) weaponsText = "ยังไม่มีอาวุธ";

            const amuletCount = db[userId].inventory?.amulet || 0;
            const potionCount = db[userId].inventory?.potion || 0;
            const hasRing = (db[userId].inventory?.ring || 0) > 0;
            const ringText = hasRing ? '✅ สวมใส่อยู่ (+20% Money)' : '❌ ยังไม่มี';

            const invEmbed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle(`🎒 กระเป๋าเดินทางของ ${message.author.username}`)
                .setDescription(`💵 **เงินสดติดตัว:** ${db[userId].balance.toLocaleString()} ฟรุ้งฟริ้ง\n🏦 **เงินในธนาคาร:** ${(db[userId].bank || 0).toLocaleString()} ฟรุ้งฟริ้ง`)
                .addFields(
                    { name: '⚔️ อาวุธในครอบครอง', value: weaponsText, inline: false },
                    { name: '🛡️ ยันต์ป้องกันภัย', value: `${amuletCount} ชิ้น`, inline: true },
                    { name: '🧪 ยาโพชั่นเร่งสปีด', value: `${potionCount} ขวด`, inline: true },
                    { name: '💍 แหวนแห่งโชคลาภ', value: ringText, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL());

            return message.reply({ embeds: [invEmbed] });
        }
    }
};
