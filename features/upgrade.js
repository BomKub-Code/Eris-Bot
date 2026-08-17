const { EmbedBuilder } = require('discord.js');
const { saveDB } = require('./db');
const { WEAPONS_CONFIG, getWeaponLevel, hasWeapon, findWeapon } = require('./weapons');

// ==========================================
// 🔨 ระบบตีบวกอุปกรณ์ (!upgrade หรือ !ตีบวก)
// ==========================================
module.exports = {
    commands: ['!upgrade', '!ตีบวก'],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (!message.channel.name.includes('ตลาดมืด')) {
            return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }
        const weaponArg = args[0]?.toLowerCase();

        const targetWeapon = findWeapon(weaponArg);

        if (!targetWeapon) {
            let ownedList = "";
            for (const key of Object.keys(WEAPONS_CONFIG)) {
                const w = WEAPONS_CONFIG[key];
                const lvl = getWeaponLevel(db, userId, key);
                if (lvl >= 0) {
                    ownedList += `• ${w.displayName}: **+${lvl}**\n`;
                }
            }
            if (!ownedList) ownedList = "❌ คุณยังไม่มีอาวุธใดๆ เลย! เลือกซื้อได้จากร้านค้า (`!shop`)\n";

            const infoEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle(`🔨 โรงตีเหล็กสมาคมนักผจญภัย (${message.author.username})`)
                .setDescription(`**อาวุธที่คุณครอบครอง:**\n${ownedList}\n💡 **วิธีตีบวก:** พิมพ์ \`!ตีบวก <ชื่ออาวุธ>\`\n*(เช่น \`!ตีบวก sword\`, \`!ตีบวก shield\`, \`!ตีบวก bow\`, \`!ตีบวก dagger\`, \`!ตีบวก staff\`)*`)
                .setFooter({ text: 'ระดับตีบวกสูงสุดคือ +10' });

            return message.reply({ embeds: [infoEmbed] });
        }

        if (!hasWeapon(db, userId, targetWeapon.id)) {
            return message.reply(`❌ คุณยังไม่มี **${targetWeapon.displayName}**! สั่งซื้อได้ที่ร้านค้า (\`!buy ${targetWeapon.id}\`)`);
        }

        const currentLevel = getWeaponLevel(db, userId, targetWeapon.id);
        if (currentLevel >= 10) return message.reply(`👑 **${targetWeapon.displayName} ของคุณอยู่ที่ระดับสูงสุด (+10) แล้ว!** ไม่สามารถตีบวกเพิ่มได้อีก`);

        const upgradeCosts = [1000, 2000, 3500, 5000, 8000, 12000, 18000, 25000, 35000, 50000];
        const successChances = [0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.25, 0.20, 0.15];

        const cost = upgradeCosts[currentLevel];
        const chance = successChances[currentLevel];

        if (db[userId].balance < cost) return message.reply(`💸 เงินสดติดตัวไม่พอ! ค่าตีบวก ${targetWeapon.displayName} เป็น +${currentLevel + 1} ต้องใช้ **${cost.toLocaleString()} ฟรุ้งฟริ้ง**`);

        db[userId].balance -= cost;

        const isSuccess = Math.random() < chance;
        let resultMsg = "";

        if (isSuccess) {
            db[userId].inventory.weapons[targetWeapon.id] += 1;
            saveDB(db);
            resultMsg = `✨ **สำเร็จ!!** อัปเกรดอาวุธเป็น **${targetWeapon.displayName} +${currentLevel + 1}** เรียบร้อยแล้ว!`;
        } else {
            if (currentLevel >= 4) {
                db[userId].inventory.weapons[targetWeapon.id] -= 1;
                saveDB(db);
                resultMsg = `💥 **ล้มเหลว!** การตีบวกผิดพลาด... ระดับลดลงเหลือ **${targetWeapon.displayName} +${currentLevel - 1}** 😭`;
            } else {
                saveDB(db);
                resultMsg = `💔 **ล้มเหลว!** การตีบวกผิดพลาด แต่โชคดีที่ระดับอาวุธยังคงอยู่ที่ **+${currentLevel}**`;
            }
        }

        const upEmbed = new EmbedBuilder()
            .setColor(isSuccess ? '#2ECC71' : '#E74C3C')
            .setTitle(`🔨 โรงตีเหล็กสมาคมนักผจญภัย (${message.author.username})`)
            .setDescription(resultMsg)
            .setFooter({ text: `ค่าธรรมเนียม: ${cost.toLocaleString()} ฟรุ้งฟริ้ง | โอกาสสำเร็จ: ${Math.round(chance * 100)}%` });

        return message.reply({ embeds: [upEmbed] });
    }
};
