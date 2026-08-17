const { EmbedBuilder } = require('discord.js');
const { saveDB, isInJail } = require('./db');

// ==========================================
// 🎲 เสี่ยงโชค/มินิเกม (!cf และ !slots)
// ==========================================
module.exports = {
    commands: ['!cf', '!coinflip', '!slots'],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (command === '!cf' || command === '!coinflip') {
            if (!message.channel.name.includes('ตลาดมืด')) {
                return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const jailStatus = isInJail(db, userId);
            if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะเสี่ยงโชคได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

            const choice = args[0]?.toLowerCase();
            const bet = parseInt(args[1]);

            if (!choice || (choice !== 'หัว' && choice !== 'ก้อย')) return message.reply('❌ วิธีเล่น: พิมพ์ `!cf หัว <เงิน>` หรือ `!cf ก้อย <เงิน>`');
            if (!bet || bet <= 0 || isNaN(bet)) return message.reply('❌ ใส่จำนวนเงินแทงที่ถูกต้องด้วยครับ');
            if (db[userId].balance < bet) return message.reply('💸 ฟรุ้งฟริ้งไม่พอแทง! ไปหาเงินมาก่อน');

            const result = Math.random() < 0.5 ? 'หัว' : 'ก้อย';

            if (choice === result) {
                db[userId].balance += bet;
                saveDB(db);
                return message.reply(`🪙 เหรียญออก **[ ${result} ]** !! 🎉 คุณทายถูก! ได้รับเงินเพิ่ม **${bet} ฟรุ้งฟริ้ง** (ยอดรวม: ${db[userId].balance})`);
            } else {
                db[userId].balance -= bet;
                saveDB(db);
                return message.reply(`🪙 เหรียญออก **[ ${result} ]** !! 😭 คุณทายผิด! เสียเงินไป **${bet} ฟรุ้งฟริ้ง** (ยอดคงเหลือ: ${db[userId].balance})`);
            }
        }

        if (command === '!slots') {
            if (!message.channel.name.includes('ตลาดมืด')) {
                return message.reply('❌ กรุณาไปซื้อขาย ตีบวก และเสี่ยงโชคที่ห้อง **🛒-ตลาดมืด-และ-คาสิโน** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const jailStatus = isInJail(db, userId);
            if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะเสี่ยงโชคได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

            const bet = parseInt(args[0]);
            if (!bet || bet <= 0 || isNaN(bet)) return message.reply('❌ วิธีเล่น: พิมพ์ `!slots <จำนวนเงิน>`');
            if (db[userId].balance < bet) return message.reply('💸 ฟรุ้งฟริ้งไม่พอลงตู้สล็อต!');

            const items = ['🎰', '💎', '👑', '7️⃣', '💣', '🍒'];
            const reel1 = items[Math.floor(Math.random() * items.length)];
            const reel2 = items[Math.floor(Math.random() * items.length)];
            const reel3 = items[Math.floor(Math.random() * items.length)];

            let resultText = "";

            if (reel1 === reel2 && reel2 === reel3) {
                const reward = bet * 5;
                db[userId].balance += reward;
                resultText = `🎉 **JACKPOT!!** ออกเหมือนกันหมด! คุณได้รับเงิน **${reward} ฟรุ้งฟริ้ง!** (5 เท่า)`;
            } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                const reward = bet * 2;
                db[userId].balance += reward;
                resultText = `✨ **เกือบเทพ!** ออกเหมือนกัน 2 ช่อง! คุณได้รับเงิน **${reward} ฟรุ้งฟริ้ง!** (2 เท่า)`;
            } else {
                db[userId].balance -= bet;
                resultText = `💸 **เกลือกระจาย!** ไม่ตรงกันเลย คุณเสียเงินไป **${bet} ฟรุ้งฟริ้ง**`;
            }

            saveDB(db);

            const slotEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🎰 ตู้สล็อตสมาคมนักผจญภัย')
                .setDescription(`[ ${reel1} | ${reel2} | ${reel3} ]\n\n${resultText}\n💰 ยอดคงเหลือ: **${db[userId].balance} ฟรุ้งฟริ้ง**`);

            return message.reply({ embeds: [slotEmbed] });
        }
    }
};
