const { EmbedBuilder } = require('discord.js');
const { saveDB, isInJail } = require('./db');
const { getActorName } = require('./nameResolver');

// ==========================================
// 🪙 เช็คเงิน และ เงินเดือน (!bal, !money, !daily)
// 🏦 ระบบธนาคาร (!dep, !with, !bank)
// ⚖️ ประกันตัวออกจากคุก (!bail)
// ==========================================
module.exports = {
    commands: [
        '!bal', '!money', '!เงิน',
        '!daily',
        '!dep', '!deposit', '!ฝาก',
        '!with', '!withdraw', '!ถอน',
        '!bank', '!ธนาคาร',
        '!bail', '!ประกันตัว'
    ],
    execute(message, args, command, db) {
        const userId = message.author.id;

        if (command === '!bal' || command === '!money' || command === '!เงิน') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const cash = db[userId].balance || 0;
            const bank = db[userId].bank || 0;
            const total = cash + bank;

            const balEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle(`💳 บัญชีทรัพย์สินของ ${getActorName(message)}`)
                .setDescription(`💵 **เงินสดติดตัว:** ${cash.toLocaleString()} ฟรุ้งฟริ้ง\n🏦 **เงินในธนาคาร:** ${bank.toLocaleString()} ฟรุ้งฟริ้ง\n✨ **ทรัพย์สินรวม:** ${total.toLocaleString()} ฟรุ้งฟริ้ง`)
                .setFooter({ text: 'ใช้คำสั่ง !ฝาก หรือ !ถอน เพื่อจัดการเงินในธนาคาร' });
            return message.reply({ embeds: [balEmbed] });
        }

        if (command === '!daily') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const jailStatus = isInJail(db, userId);
            if (jailStatus.inJail) return message.reply(`🔒 **อยู่ในคุกอย่ามาซ่า!** คุณเป็นนักโทษอยู่! รออีก **${jailStatus.minutesLeft} นาที** ถึงจะรับเงินเดือนได้ พิมพ์ \`!bail\` เพื่อประกันตัว`);

            const cooldown = 24 * 60 * 60 * 1000;
            const timeNow = Date.now();
            const lastDaily = db[userId].lastDaily;

            if (timeNow - lastDaily < cooldown) {
                const timeLeft = Math.floor((cooldown - (timeNow - lastDaily)) / (60 * 60 * 1000));
                return message.reply(`⏳ ใจเย็นวัยรุ่น! คุณรับเงินเดือนไปแล้ว ต้องรออีก **${timeLeft} ชั่วโมง** ถึงจะรับได้ใหม่`);
            }

            const baseDaily = 1500;
            const hasRing = (db[userId].inventory?.ring || 0) > 0;
            const bonus = hasRing ? Math.floor(baseDaily * 0.2) : 0;
            const totalDaily = baseDaily + bonus;

            db[userId].balance += totalDaily;
            db[userId].lastDaily = timeNow;
            saveDB(db);

            const ringMsg = hasRing ? ` *(+${bonus} จากโบนัสแหวนโชคลาภ 💍)*` : '';
            return message.reply(`🎉 รับเงินเดือนสำเร็จ! คุณได้รับ **${totalDaily.toLocaleString()} ฟรุ้งฟริ้ง** ✨${ringMsg} (เงินสดคงเหลือ: ${db[userId].balance.toLocaleString()})`);
        }

        if (command === '!dep' || command === '!deposit' || command === '!ฝาก') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const arg = args[0]?.toLowerCase();
            if (!arg) return message.reply('❌ วิธีใช้: `!ฝาก <จำนวนเงิน>` หรือ `!ฝาก all`');

            let amount = 0;
            if (arg === 'all' || arg === 'หมด') {
                amount = db[userId].balance;
            } else {
                amount = parseInt(arg);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ กรุณาระบุจำนวนเงินที่ถูกต้อง');
            if (db[userId].balance < amount) return message.reply('💸 คุณมีเงินสดติดตัวไม่พอฝาก!');

            db[userId].balance -= amount;
            db[userId].bank = (db[userId].bank || 0) + amount;
            saveDB(db);

            return message.reply(`🏦 **ฝากเงินสำเร็จ!** คุณได้ฝากเงิน **${amount.toLocaleString()} ฟรุ้งฟริ้ง** เข้าธนาคาร\n> 💵 เงินสดคงเหลือ: **${db[userId].balance.toLocaleString()}** | 🏦 เงินในธนาคาร: **${db[userId].bank.toLocaleString()}**`);
        }

        if (command === '!with' || command === '!withdraw' || command === '!ถอน') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const arg = args[0]?.toLowerCase();
            if (!arg) return message.reply('❌ วิธีใช้: `!ถอน <จำนวนเงิน>` หรือ `!ถอน all`');

            let amount = 0;
            if (arg === 'all' || arg === 'หมด') {
                amount = db[userId].bank || 0;
            } else {
                amount = parseInt(arg);
            }

            if (isNaN(amount) || amount <= 0) return message.reply('❌ กรุณาระบุจำนวนเงินที่ถูกต้อง');
            if ((db[userId].bank || 0) < amount) return message.reply('💸 เงินในธนาคารของคุณไม่พอถอน!');

            db[userId].bank -= amount;
            db[userId].balance += amount;
            saveDB(db);

            return message.reply(`🏧 **ถอนเงินสำเร็จ!** คุณได้ถอนเงิน **${amount.toLocaleString()} ฟรุ้งฟริ้ง** จากธนาคาร\n> 💵 เงินสดคงเหลือ: **${db[userId].balance.toLocaleString()}** | 🏦 เงินในธนาคาร: **${db[userId].bank.toLocaleString()}**`);
        }

        if (command === '!bank' || command === '!ธนาคาร') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปทำธุรกรรมการเงินและดูอันดับที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }
            const bankEmbed = new EmbedBuilder()
                .setColor('#34495E')
                .setTitle(`🏦 ธนาคารสมาคมนักผจญภัย - บัญชีของ ${getActorName(message)}`)
                .setDescription(`🏦 **เงินฝากในธนาคาร:** ${(db[userId].bank || 0).toLocaleString()} ฟรุ้งฟริ้ง\n💵 **เงินสดติดตัว:** ${db[userId].balance.toLocaleString()} ฟรุ้งฟริ้ง\n\n🛡️ *เงินในธนาคารปลอดภัยจากการปล้นรายบุคคล (!rob)*\n⚠️ *แต่ระวัง! แก๊งโจรอาจรวมตี้ปล้นธนาคารได้ (!heist)*`)
                .setFooter({ text: 'พิมพ์ !ฝาก <จำนวน> เพื่อฝากเงิน | !ถอน <จำนวน> เพื่อถอนเงิน' });
            return message.reply({ embeds: [bankEmbed] });
        }

        if (command === '!bail' || command === '!ประกันตัว') {
            if (!message.channel.name.includes('ธนาคาร')) {
                return message.reply('❌ กรุณาไปจ่ายค่าประกันตัวที่ห้อง **🏦-ธนาคาร-และ-จัดอันดับ** ครับ').then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }

            const jailStatus = isInJail(db, userId);
            if (!jailStatus.inJail) return message.reply('✅ คุณไม่ได้ติดคุกอยู่! สบายใจได้~');

            // คิดค่าประกันตัว = 20% ของเงินในธนาคาร หรือ 15,000 อย่างใดอย่างหนึ่งที่สูงกว่า
            const bankPercent = Math.floor((db[userId].bank || 0) * 0.20);
            const bailCost = Math.max(bankPercent, 15000);

            if ((db[userId].bank || 0) < bailCost) {
                return message.reply(`💸 **เงินในธนาคารไม่พอจ่ายค่าประกันตัว!**\n> ค่าประกันตัว: **${bailCost.toLocaleString()} ฟรุ้งฟริ้ง**\n> เงินในธนาคาร: **${(db[userId].bank || 0).toLocaleString()} ฟรุ้งฟริ้ง**\n> 😔 ต้องรอหมดโทษอีก **${jailStatus.minutesLeft} นาที**`);
            }

            db[userId].bank -= bailCost;
            db[userId].jailUntil = 0;
            saveDB(db);

            const bailEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('⚖️ ประกันตัวสำเร็จ!')
                .setDescription(`**${getActorName(message)}** จ่ายค่าประกันตัว **${bailCost.toLocaleString()} ฟรุ้งฟริ้ง** แล้ว!\n\n> 🏦 เงินในธนาคารคงเหลือ: **${db[userId].bank.toLocaleString()} ฟรุ้งฟริ้ง**\n> ✅ คุณเป็นอิสระแล้ว! กลับไปหาเงินได้เลย`)
                .setFooter({ text: '💡 ครั้งหน้าคิดให้ดีก่อนไปปล้นนะ!' });

            return message.reply({ embeds: [bailEmbed] });
        }
    }
};
