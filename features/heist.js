const { EmbedBuilder } = require('discord.js');
const { loadDB, saveDB, ensureUserData, isInJail } = require('./db');
const { WEAPONS_CONFIG, getWeaponLevel } = require('./weapons');
const { getActorName } = require('./nameResolver');

// 🏦 ระบบปล้นธนาคารรวม (Heist) - เก็บ session ชั่วคราวใน memory
const activeHeists = new Map(); // channelId -> { leaderId, members: Set, timeout, createdAt }

// 🏦 ฟังก์ชันดำเนินการปล้นธนาคาร
async function executeHeist(channel, session) {
    let db = loadDB();
    const members = Array.from(session.members);
    const memberCount = members.length;

    // โอกาสสำเร็จตามจำนวนคน: 2=5%, 3=8%, 4=12%, 5=15%
    const chances = { 2: 0.05, 3: 0.08, 4: 0.12, 5: 0.15 };
    const successChance = chances[memberCount] || 0.05;
    const isSuccess = Math.random() < successChance;

    // ตั้งคูลดาวน์ให้ทุกคน
    const timeNow = Date.now();
    for (const memberId of members) {
        ensureUserData(db, memberId);
        db[memberId].lastHeist = timeNow;
    }

    if (isSuccess) {
        // === ปล้นสำเร็จ! ดึงเงินทั้งหมดจากธนาคารทุกคน ===
        const stealPercent = 1; // 100%
        const memberSet = new Set(members);
        let totalStolen = 0;

        for (const [id, data] of Object.entries(db)) {
            if (id === 'boss' || memberSet.has(id)) continue;
            if (!data.bank || data.bank <= 0) continue;
            const stolen = Math.floor(data.bank * stealPercent);
            if (stolen <= 0) continue;
            db[id].bank -= stolen;
            totalStolen += stolen;
        }

        const share = Math.floor(totalStolen / memberCount);
        let memberList = '';
        for (const memberId of members) {
            db[memberId].balance += share;
            const name = session.memberNames[memberId] || memberId;
            memberList += `• ${name}: +**${share.toLocaleString()}** ฟรุ้งฟริ้ง\n`;
        }

        saveDB(db);

        const successEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('💰🎉 ปล้นธนาคารสำเร็จ!! 🎉💰')
            .setDescription(`🦹 แก๊งโจรของ **${session.leaderName}** บุกเข้าธนาคารกลางสำเร็จ!\n\n💵 ดึงเงิน **ทั้งหมด 100%** จากบัญชีธนาคารของทุกคนในเซิร์ฟเวอร์!\n💰 เงินที่ปล้นได้ทั้งหมด: **${totalStolen.toLocaleString()} ฟรุ้งฟริ้ง**`)
            .addFields(
                { name: '💸 ส่วนแบ่งของสมาชิก', value: memberList || 'ไม่มี' },
                { name: '📊 โอกาสที่สำเร็จ', value: `**${(successChance * 100).toFixed(0)}%** (${memberCount} คน)` }
            )
            .setFooter({ text: '⚠️ เหยื่อทุกคนสูญเสียเงินในธนาคารไปบางส่วน!' });

        channel.send({ embeds: [successEmbed] });
    } else {
        // === ปล้นล้มเหลว! จับเข้าคุกทุกคน ===
        const jailDuration = 2 * 60 * 60 * 1000; // 2 ชั่วโมง
        const jailUntil = Date.now() + jailDuration;

        let penaltyList = '';
        for (const memberId of members) {
            ensureUserData(db, memberId);
            const name = session.memberNames[memberId] || memberId;

            // 1. ติดคุก 2 ชั่วโมง
            db[memberId].jailUntil = jailUntil;

            // 2. ยึดเงินสด 100%
            const seizedCash = db[memberId].balance;
            db[memberId].balance = 0;

            // 3. 50% โอกาสริบอาวุธ
            let weaponPenalty = 'ไม่มี';
            const ownedWeapons = [];
            if (db[memberId].inventory?.weapons) {
                for (const key of Object.keys(WEAPONS_CONFIG)) {
                    const lvl = getWeaponLevel(db, memberId, key);
                    if (lvl >= 0) ownedWeapons.push(key);
                }
            }

            if (ownedWeapons.length > 0 && Math.random() < 0.5) {
                const targetWeapon = ownedWeapons[Math.floor(Math.random() * ownedWeapons.length)];
                const currentLvl = getWeaponLevel(db, memberId, targetWeapon);
                const wConfig = WEAPONS_CONFIG[targetWeapon];

                if (currentLvl <= 0) {
                    // อาวุธ +0 → พังหายไปเลย
                    db[memberId].inventory.weapons[targetWeapon] = 0;
                    weaponPenalty = `${wConfig.displayName} **พังหาย!** 💥`;
                } else {
                    // ลดระดับ -1
                    db[memberId].inventory.weapons[targetWeapon] -= 1;
                    weaponPenalty = `${wConfig.displayName} ลดเหลือ **+${currentLvl - 1}** 📉`;
                }
            }

            penaltyList += `**${name}:**\n> 💸 ยึดเงินสด: ${seizedCash.toLocaleString()} ฟรุ้งฟริ้ง\n> 🗡️ อาวุธ: ${weaponPenalty}\n\n`;
        }

        saveDB(db);

        const failEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🚔 โดนจับ! ปล้นธนาคารล้มเหลว!')
            .setDescription(`🚨 ตำรวจสมาคมนักผจญภัยบุกจับแก๊งโจรของ **${session.leaderName}** ได้คาหนังคาเขา!\n\n⛓️ **สมาชิกทุกคนถูกจับเข้าคุก 2 ชั่วโมง!**\n💡 พิมพ์ \`!bail\` ที่ห้องธนาคารเพื่อจ่ายค่าประกันตัว`)
            .addFields(
                { name: '⚖️ บทลงโทษแต่ละคน', value: penaltyList || 'ไม่มี' },
                { name: '📊 โอกาสที่สำเร็จ', value: `**${(successChance * 100).toFixed(0)}%** (${memberCount} คน) — โชคไม่เข้าข้าง!` }
            )
            .setFooter({ text: '⏱️ ติดคุก 2 ชม. | พิมพ์ !bail ที่ห้องธนาคาร (ค่าปรับ 20% ของเงินในธนาคาร หรือ 15,000)' });

        channel.send({ embeds: [failEmbed] });
    }
}

// ==========================================
// 🏦 ระบบปล้นธนาคารรวม (!heist, !join)
// ==========================================
module.exports = {
    commands: ['!heist', '!ปล้น', '!join', '!เข้าร่วม'],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (command === '!heist' || command === '!ปล้น') {
            if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
                return message.reply('❌ กรุณาไปรวมแก๊งปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }

            // เช็คสถานะนักโทษ
            const jailStatus = isInJail(db, userId);
            if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะปล้นได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

            // เช็คคูลดาวน์ 30 นาที
            const heistCooldown = 30 * 60 * 1000;
            const timeNow = Date.now();
            if (timeNow - (db[userId].lastHeist || 0) < heistCooldown) {
                const timeLeft = Math.ceil((heistCooldown - (timeNow - db[userId].lastHeist)) / (60 * 1000));
                return message.reply(`⏳ คุณเพิ่งปล้นไป! ต้องรอคูลดาวน์อีก **${timeLeft} นาที** ถึงจะปล้นใหม่ได้`);
            }

            // เช็คว่ามี heist กำลังเปิดอยู่ในห้องนี้ไหม
            if (activeHeists.has(message.channel.id)) {
                return message.reply('❌ มีการปล้นกำลังรวบรวมทีมอยู่แล้วในห้องนี้! พิมพ์ `!join` เพื่อเข้าร่วม');
            }

            // สร้าง heist session
            const heistSession = {
                leaderId: userId,
                leaderName: getActorName(message),
                members: new Set([userId]),
                memberNames: { [userId]: getActorName(message) },
                createdAt: Date.now(),
                timeout: null
            };

            activeHeists.set(message.channel.id, heistSession);

            // ตั้ง timeout 60 วินาที
            heistSession.timeout = setTimeout(async () => {
                const session = activeHeists.get(message.channel.id);
                if (!session) return;
                activeHeists.delete(message.channel.id);

                if (session.members.size < 2) {
                    const cancelEmbed = new EmbedBuilder()
                        .setColor('#95A5A6')
                        .setTitle('❌ การปล้นถูกยกเลิก!')
                        .setDescription('หมดเวลาแล้ว! รวบรวมคนไม่ครบ 2 คน การปล้นถูกยกเลิก...\n\n> 💡 ครั้งหน้าชวนเพื่อนมาพิมพ์ `!join` ให้ทันภายใน 60 วินาทีนะ!');
                    return message.channel.send({ embeds: [cancelEmbed] });
                }

                // Execute heist!
                executeHeist(message.channel, session);
            }, 60000);

            const heistEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🚨 กำลังรวบรวมทีมปล้นธนาคาร!')
                .setDescription(`🦹 **${getActorName(message)}** กำลังวางแผนปล้นธนาคารกลาง!\n\n👥 พิมพ์ \`!join\` เพื่อเข้าร่วมแก๊ง (ต้องการอีก **1-4 คน**)\n⏱️ เหลือเวลา **60 วินาที**\n\n⚠️ **คำเตือน:** ถ้าปล้นพลาดจะโดนจับเข้าคุกทุกคน!\n• 🕒 ติดคุก 2 ชั่วโมง\n• 💸 ยึดเงินสดทั้งหมด 100%\n• 🗡️ 50% โอกาสอาวุธพังหรือลดระดับ`)
                .addFields(
                    { name: '👥 สมาชิกแก๊ง (1/5)', value: `• ${getActorName(message)} (หัวหน้า)` },
                    { name: '📊 โอกาสสำเร็จปัจจุบัน', value: '**5%** (เพิ่มคนเพิ่มโอกาส! สูงสุด 15%)' }
                )
                .setFooter({ text: '⚠️ ธนาคารไม่ใช่ Safe Zone อีกต่อไป! | ปล้นได้ 1-3% จากบัญชีทุกคน' });

            return message.reply({ embeds: [heistEmbed] });
        }

        if (command === '!join' || command === '!เข้าร่วม') {
            if (!message.channel.name.includes('ป่ามอนสเตอร์')) {
                return message.reply('❌ กรุณาไปรวมแก๊งปล้นที่ห้อง **🌲-ป่ามอนสเตอร์** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }

            const session = activeHeists.get(message.channel.id);
            if (!session) return message.reply('❌ ไม่มีการปล้นที่กำลังรวบรวมทีมอยู่ตอนนี้! ใช้ `!heist` เพื่อเริ่มปล้น');

            if (session.members.has(userId)) return message.reply('❌ คุณเข้าร่วมแก๊งนี้แล้ว! รอสมาชิกคนอื่นเข้ามา...');

            // เช็คสถานะนักโทษ
            const jailStatus = isInJail(db, userId);
            if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะร่วมปล้นได้`);

            // เช็คคูลดาวน์
            const heistCooldown = 30 * 60 * 1000;
            if (Date.now() - (db[userId].lastHeist || 0) < heistCooldown) {
                const timeLeft = Math.ceil((heistCooldown - (Date.now() - db[userId].lastHeist)) / (60 * 1000));
                return message.reply(`⏳ คุณเพิ่งปล้นไป! ต้องรอคูลดาวน์อีก **${timeLeft} นาที** ถึงจะร่วมปล้นใหม่ได้`);
            }

            if (session.members.size >= 5) return message.reply('❌ ทีมเต็มแล้ว (5/5 คน)!');

            // เพิ่มสมาชิก
            session.members.add(userId);
            session.memberNames[userId] = getActorName(message);

            const memberCount = session.members.size;
            const chances = { 2: '5%', 3: '8%', 4: '12%', 5: '15%' };
            const currentChance = chances[memberCount] || '5%';

            let memberList = '';
            for (const [memberId, name] of Object.entries(session.memberNames)) {
                memberList += `• ${name}${memberId === session.leaderId ? ' (หัวหน้า)' : ''}\n`;
            }

            const joinEmbed = new EmbedBuilder()
                .setColor('#F39C12')
                .setTitle('🦹 สมาชิกใหม่เข้าร่วมแก๊ง!')
                .setDescription(`**${getActorName(message)}** เข้าร่วมทีมปล้นธนาคาร!`)
                .addFields(
                    { name: `👥 สมาชิกแก๊ง (${memberCount}/5)`, value: memberList },
                    { name: '📊 โอกาสสำเร็จปัจจุบัน', value: `**${currentChance}**` }
                );

            message.channel.send({ embeds: [joinEmbed] });

            // ถ้าครบ 5 คน เริ่มปล้นทันที!
            if (memberCount >= 5) {
                clearTimeout(session.timeout);
                activeHeists.delete(message.channel.id);
                executeHeist(message.channel, session);
            }

            return;
        }
    }
};
