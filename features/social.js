const { saveDB, ensureUserData, isInJail } = require('./db');
const { EmbedBuilder } = require('discord.js');
const { getWeaponLevel } = require('./weapons');
const { isPlayerMember } = require('./playerCheck');
const { getActorName, getTargetName } = require('./nameResolver');

// ==========================================
// 🤝 สังคมและการโอนเงิน (!pay และ !rob)
// ==========================================
module.exports = {
    commands: ['!pay', '!rob'],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (command === '!pay') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const target = message.mentions.users.first();
            const amount = parseInt(args[1]);

            if (!target) return message.reply('❌ คุณต้องแท็กเพื่อนที่ต้องการโอนเงินให้ด้วย (เช่น `!pay @ชื่อเพื่อน 100`)');
            if (target.id === userId) return message.reply('❌ โอนเงินให้ตัวเองไม่ได้เว้ย!');
            if (!isPlayerMember(message.mentions.members?.first())) return message.reply('❌ โอนเงินได้เฉพาะผู้เล่นที่มี Role ในเซิร์ฟเวอร์เท่านั้น!');
            if (!amount || amount <= 0 || isNaN(amount)) return message.reply('❌ ใส่จำนวนเงินที่ถูกต้องด้วย');
            if (db[userId].balance < amount) return message.reply('💸 ฟรุ้งฟริ้งไม่พอ! ไปทำงานหาเงินก่อนไป');

            ensureUserData(db, target.id);

            db[userId].balance -= amount;
            db[target.id].balance += amount;
            saveDB(db);

            return message.reply(`💸 **${getActorName(message)}** ได้โอนเงิน **${amount} ฟรุ้งฟริ้ง** ให้กับ **${getTargetName(message, target)}** เรียบร้อยแล้ว!`);
        }

        if (command === '!rob') {
            if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
                return message.reply('❌ กรุณาไปสุ่มสเตตัส ออกล่า และปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const jailStatus = isInJail(db, userId);
            if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะปล้นได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ จะปล้นใคร แท็กชื่อด้วย! (เช่น `!rob @ชื่อเพื่อน`)');
            if (target.id === userId) return message.reply('❌ บ้าไปแล้ว ปล้นตัวเองทำไม!');
            if (!isPlayerMember(message.mentions.members?.first())) return message.reply('❌ ปล้นได้เฉพาะผู้เล่นที่มี Role ในเซิร์ฟเวอร์เท่านั้น!');

            ensureUserData(db, target.id);
            if (db[target.id].balance < 100) return message.reply('❌ เป้าหมายจนเกินไป ปล้นไปก็ไม่ได้อะไร ปล่อยเขาไปเถอะ...');
            if (db[userId].balance < 500) return message.reply('❌ คุณต้องมีฟรุ้งฟริ้งติดตัวอย่างน้อย 500 เพื่อเป็นค่าปรับเผื่อโดนจับหรือเจอยันต์สะท้อน!');

            const cooldown = 1 * 60 * 1000;
            const timeNow = Date.now();
            if (!db[userId].lastRob) db[userId].lastRob = 0;

            if (timeNow - db[userId].lastRob < cooldown) {
                const timeLeft = Math.ceil((cooldown - (timeNow - db[userId].lastRob)) / 1000);
                return message.reply(`⏳ ใจเย็นสายย่อ! คุณเพิ่งปล้นไป ต้องรอคูลดาวน์อีก **${timeLeft} วินาที** ถึงจะปล้นใหม่ได้`);
            }

            db[userId].lastRob = timeNow;

            // 1. เช็คยันต์ป้องกันภัย (amulet)
            const targetAmulet = db[target.id].inventory?.amulet || 0;
            if (targetAmulet > 0) {
                const penalty = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
                const actualPenalty = Math.min(db[userId].balance, penalty);
                db[userId].balance -= actualPenalty;
                db[target.id].balance += actualPenalty;

                db[target.id].inventory.amulet -= 1;
                const remainingAmulets = db[target.id].inventory.amulet;
                const amuletStatus = `🛡️ **ยันต์ของเป้าหมายถูกใช้งานและสลายไป 1 ชิ้น!** (ยันต์คงเหลือ: ${remainingAmulets} ชิ้น)`;

                saveDB(db);

                const amuletEmbed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🛡️ ยันต์ป้องกันภัยทำงาน!')
                    .setDescription(`⚡ **${getActorName(message)}** พยายามจะเข้าไปปล้น **${getTargetName(message, target)}** แต่เจอยันต์ศักดิ์สิทธิ์เปล่งแสงทำลายโอกาสปล้น!\n\n> ${amuletStatus}\n> 💥 **${getActorName(message)}** โดนพลังยันต์สะท้อนกลับ เสียเงิน **${actualPenalty.toLocaleString()} ฟรุ้งฟริ้ง!** (โอนเป็นค่าทำขวัญให้เหยื่อ)`);

                return message.reply({ embeds: [amuletEmbed] });
            }

            // 2. เช็คโล่ศักดิ์สิทธิ์ (shield) ของเป้าหมาย
            const targetShieldLvl = getWeaponLevel(db, target.id, 'shield');
            if (targetShieldLvl >= 0) {
                const reflectChance = (25 + Math.max(0, targetShieldLvl) * 5) / 100;
                if (Math.random() < reflectChance) {
                    const penalty = Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
                    const actualPenalty = Math.min(db[userId].balance, penalty);
                    db[userId].balance -= actualPenalty;
                    db[target.id].balance += actualPenalty;
                    saveDB(db);

                    const shieldEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('🛡️ โล่ศักดิ์สิทธิ์สะท้อนการถูกปล้น!')
                        .setDescription(`⚡ **${getActorName(message)}** พยายามจะปล้น **${getTargetName(message, target)}** แต่ถูก **🛡️ โล่ศักดิ์สิทธิ์ +${targetShieldLvl}** ยกขึ้นมาบล็อกและสะท้อนกลับ!\n\n> 💥 **${getActorName(message)}** เสียเงิน **${actualPenalty.toLocaleString()} ฟรุ้งฟริ้ง** (โอนชดเชยให้เป้าหมาย)`);

                    return message.reply({ embeds: [shieldEmbed] });
                }
            }

            // 3. คิดโอกาสปล้นโดยมีดสั้น (dagger)
            const attackerDaggerLvl = getWeaponLevel(db, userId, 'dagger');
            const robChance = attackerDaggerLvl >= 0 ? 0.70 : 0.60;
            const chance = Math.random();

            if (chance < robChance) {
                let percentWin = Math.floor(Math.random() * (95 - 20 + 1)) + 20;
                if (attackerDaggerLvl > 0) percentWin += (attackerDaggerLvl * 2);

                const stolenAmount = Math.floor((db[target.id].balance * percentWin) / 100);

                db[target.id].balance = Math.max(0, db[target.id].balance - stolenAmount);
                db[userId].balance += stolenAmount;
                saveDB(db);

                const daggerNote = attackerDaggerLvl >= 0 ? ` *(มีดสั้น +${attackerDaggerLvl} ช่วยเพิ่มโอกาสสำเร็จ & เงินที่ได้)*` : '';
                return message.reply(`🥷 **สำเร็จ!** คุณแอบขโมยถุงเงินของ ${getTargetName(message, target)} มาได้ **${stolenAmount.toLocaleString()} ฟรุ้งฟริ้ง!** (${percentWin}% ของเป้าหมาย)${daggerNote} 🏃‍♂️💨`);
            } else {
                const percentLose = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
                const lostAmount = Math.floor((db[userId].balance * percentLose) / 100);

                db[userId].balance -= lostAmount;
                saveDB(db);

                return message.reply(`🚨 **โดนจับได้!** ยามหน้าประตูเมืองจับคุณขังคุก โดนยึดค่าปรับไป **${lostAmount.toLocaleString()} ฟรุ้งฟริ้ง** (${percentLose}% ของเงินคุณ) สมน้ำหน้า! 😂`);
            }
        }
    }
};
