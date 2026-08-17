const { EmbedBuilder } = require('discord.js');
const { saveDB } = require('./db');
const { getWeaponLevel } = require('./weapons');

// ==========================================
// 👹 ระบบสู้บอสโลก (!boss และ !attack)
// ==========================================
module.exports = {
    commands: ['!boss', '!บอส', '!attack', '!ตีบอส'],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (command === '!boss' || command === '!บอส') {
            if (!message.channel.name.includes('บอสโลก')) {
                return message.reply('❌ กรุณาไปเช็คสถานะและโจมตีบอสที่ห้อง **🐉-ลานประลองบอสโลก** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const boss = db['boss'];

            const percentage = Math.max(0, boss.hp / boss.maxHp);
            const filled = Math.round(percentage * 10);
            const empty = 10 - filled;
            const hpBar = '🟩'.repeat(filled) + '⬛'.repeat(empty);

            const dmgEntries = Object.entries(boss.damages || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
            let topDmgText = "";
            dmgEntries.forEach(([id, dmg], idx) => {
                topDmgText += `${idx + 1}. <@${id}>: **${dmg.toLocaleString()}** DMG\n`;
            });
            if (!topDmgText) topDmgText = "ยังไม่มีใครโจมตีบอสตัวนี้";

            const bossEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle(`👹 ${boss.name}`)
                .setDescription(`**พลังชีวิต:** ${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()} HP\n${hpBar} (${Math.floor(percentage * 100)}%)\n\n💰 **รางวัลรวมเมื่อบอสพ่ายแพ้:** ${boss.reward.toLocaleString()} ฟรุ้งฟริ้ง\n⚔️ พิมพ์ \`!attack\` เพื่อร่วมโจมตีบอส!`)
                .addFields({ name: '🏆 ผู้ทำความเสียหายสูงสุด 5 อันดับแรก', value: topDmgText })
                .setFooter({ text: 'คูลดาวน์โจมตีบอส: 5 นาทีต่อครั้ง' });

            return message.reply({ embeds: [bossEmbed] });
        }

        if (command === '!attack' || command === '!ตีบอส') {
            if (!message.channel.name.includes('บอสโลก')) {
                return message.reply('❌ กรุณาไปเช็คสถานะและโจมตีบอสที่ห้อง **🐉-ลานประลองบอสโลก** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const boss = db['boss'];
            if (boss.hp <= 0) return message.reply('☠️ บอสเพิ่งพ่ายแพ้ไป! กำลังรอระบบเกิดบอสตัวใหม่...');

            const cooldown = 5 * 60 * 1000;
            const timeNow = Date.now();
            const lastAttack = db[userId].lastBossAttack || 0;

            if (timeNow - lastAttack < cooldown) {
                const timeLeftSec = Math.ceil((cooldown - (timeNow - lastAttack)) / 1000);
                const mins = Math.floor(timeLeftSec / 60);
                const secs = timeLeftSec % 60;
                return message.reply(`⏳ พักเหนื่อยจากการร่ายเวท! รอคูลดาวน์อีก **${mins} นาที ${secs} วินาที** ค่อยตีใหม่`);
            }

            // 🛑 ระบบคำนวณพลังอาวุธแบบเต็มพิกัด (ดาบ, ธนู, คทา)
            const swordLvl = getWeaponLevel(db, userId, 'sword');
            const bowLvl = getWeaponLevel(db, userId, 'bow');
            const staffLvl = getWeaponLevel(db, userId, 'staff');

            let damage = Math.floor(Math.random() * (250 - 80 + 1)) + 80;
            let weaponBonusStr = [];

            // คำนวณดาเมจพื้นฐานจาก ดาบ และ คทา
            if (swordLvl >= 0) {
                const swordBonus = 50 + (swordLvl * 25);
                damage += swordBonus;
                weaponBonusStr.push(`ดาบอัศวิน +${swordBonus}`);
            }
            if (staffLvl >= 0) {
                const staffBonus = 120 + (staffLvl * 45);
                damage += staffBonus;
                weaponBonusStr.push(`คทาเวทมนตร์ +${staffBonus}`);
            }

            // คำนวณโอกาสติดคริติคอลจาก ธนู
            let critChance = bowLvl >= 0 ? 0.35 : 0.20;
            let critMult = 1.5;
            if (bowLvl >= 0) {
                critMult = Math.min(2.5, 1.5 + (bowLvl * 0.1));
                weaponBonusStr.push(`ธนูเอลฟ์ x${critMult.toFixed(1)}`);
            }

            const isCritical = Math.random() < critChance;
            if (isCritical) {
                damage = Math.floor(damage * critMult);
            }

            // หักพลังชีวิตบอส
            boss.hp = Math.max(0, boss.hp - damage);
            if (!boss.damages) boss.damages = {};
            boss.damages[userId] = (boss.damages[userId] || 0) + damage;
            db[userId].lastBossAttack = timeNow;

            const bonusNote = weaponBonusStr.length > 0 ? `*(โบนัสอาวุธ: ${weaponBonusStr.join(' | ')})*` : '';
            let attackResultMsg = `💥 **${message.author.username}** โจมตีใส่ ${boss.name}!\n> ${isCritical ? '💥 **CRITICAL HIT!!** ' : ''}สร้างความเสียหาย **${damage.toLocaleString()} DMG!** ${bonusNote}\n> HP บอสเหลือ: **${boss.hp.toLocaleString()} / ${boss.maxHp.toLocaleString()}**`;

            // บอสพ่ายแพ้
            if (boss.hp <= 0) {
                attackResultMsg += `\n\n🎉🎉 **บอสถูกพิชิตแล้ว!!** 🎉🎉\n⚔️ **${message.author.username}** ได้รับโบนัส **Last Hit 1,500 ฟรุ้งฟริ้ง!**`;

                db[userId].balance += 1500;

                const totalDmg = Object.values(boss.damages).reduce((a, b) => a + b, 0);
                let rewardSummary = "";

                for (const [attackerId, attackerDmg] of Object.entries(boss.damages)) {
                    const sharePercent = attackerDmg / totalDmg;
                    const rewardAmount = Math.floor(sharePercent * boss.reward);

                    if (db[attackerId]) {
                        db[attackerId].balance += rewardAmount;
                    }
                    rewardSummary += `• <@${attackerId}>: ได้รับ **${rewardAmount.toLocaleString()}** ฟรุ้งฟริ้ง (${(sharePercent * 100).toFixed(1)}% DMG)\n`;
                }

                db['boss'] = {
                    name: '🔥 มังกรดำเพลิงอสูร (Ancient Black Dragon)',
                    hp: 6000,
                    maxHp: 6000,
                    reward: 12000,
                    damages: {}
                };

                saveDB(db);

                const winEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('👑 ชัยชนะครั้งยิ่งใหญ่ของสมาคมนักผจญภัย!')
                    .setDescription(attackResultMsg + '\n\n💰 **สรุปการรับส่วนแบ่งเงินรางวัล:**\n' + rewardSummary);

                return message.reply({ embeds: [winEmbed] });
            }

            saveDB(db);

            const attackEmbed = new EmbedBuilder()
                .setColor('#E67E22')
                .setDescription(attackResultMsg);

            return message.reply({ embeds: [attackEmbed] });
        }
    }
};
