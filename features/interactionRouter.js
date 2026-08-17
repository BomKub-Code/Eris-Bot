const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    UserSelectMenuBuilder, StringSelectMenuBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    MessageFlags
} = require('discord.js');
const { loadDB, ensureUserData } = require('./db');
const { WEAPONS_CONFIG, getWeaponLevel, hasWeapon } = require('./weapons');
const { fromInteraction } = require('./uiContext');
const { isPlayerMember } = require('./playerCheck');

// ยิงคำสั่งเดิม (จาก commandRouter ใน index.js) โดยจำลอง message ด้วย fromInteraction
function runCommand(interaction, commandRouter, command, args, targetUser, targetMember) {
    const feature = commandRouter.get(command);
    if (!feature) {
        return interaction.reply({ content: '❌ ไม่พบคำสั่งนี้', flags: MessageFlags.Ephemeral });
    }

    const db = loadDB();
    ensureUserData(db, interaction.user.id);
    if (targetUser) ensureUserData(db, targetUser.id);

    const ctx = fromInteraction(interaction, targetUser, targetMember);
    return feature.execute(ctx, args, command, db);
}

function showAmountModal(interaction, customId, title, label) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title.slice(0, 45));
    const input = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel(label.slice(0, 45))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
}

function handleBuyMenu(interaction) {
    const options = [
        ...Object.values(WEAPONS_CONFIG).map(w => ({
            label: w.displayName,
            value: w.id,
            description: `ราคา ${w.price.toLocaleString()} ฟรุ้งฟริ้ง`
        })),
        { label: '🛡️ ยันต์ป้องกันภัย', value: 'amulet', description: 'ราคา 1,500 ฟรุ้งฟริ้ง' },
        { label: '🧪 ยาโพชั่นเร่งสปีด', value: 'potion', description: 'ราคา 800 ฟรุ้งฟริ้ง' },
        { label: '💍 แหวนแห่งโชคลาภ', value: 'ring', description: 'ราคา 10,000 ฟรุ้งฟริ้ง' }
    ];

    const menu = new StringSelectMenuBuilder()
        .setCustomId('strsel|buy|')
        .setPlaceholder('เลือกไอเทมที่จะซื้อ')
        .addOptions(options);

    return interaction.reply({
        content: '🛍️ เลือกไอเทมที่จะซื้อ:',
        components: [new ActionRowBuilder().addComponents(menu)],
        flags: MessageFlags.Ephemeral
    });
}

function handleUpgradeMenu(interaction) {
    const db = loadDB();
    ensureUserData(db, interaction.user.id);
    const owned = Object.keys(WEAPONS_CONFIG).filter(key => hasWeapon(db, interaction.user.id, key));

    if (owned.length === 0) {
        return interaction.reply({
            content: '❌ คุณยังไม่มีอาวุธใดๆ เลย! กดปุ่ม 🛍️ ซื้อของ ก่อนนะ',
            flags: MessageFlags.Ephemeral
        });
    }

    const options = owned.map(key => {
        const w = WEAPONS_CONFIG[key];
        const lvl = getWeaponLevel(db, interaction.user.id, key);
        return { label: `${w.displayName} (+${lvl})`, value: key };
    });

    const menu = new StringSelectMenuBuilder()
        .setCustomId('strsel|upgrade|')
        .setPlaceholder('เลือกอาวุธที่จะตีบวก')
        .addOptions(options);

    return interaction.reply({
        content: '🔨 เลือกอาวุธที่จะตีบวก:',
        components: [new ActionRowBuilder().addComponents(menu)],
        flags: MessageFlags.Ephemeral
    });
}

async function handleButton(interaction, commandRouter) {
    const [ns, action, payload] = interaction.customId.split('|');

    if (ns === 'cmd') {
        return runCommand(interaction, commandRouter, action, payload ? [payload] : []);
    }

    if (ns === 'cfchoice') {
        return showAmountModal(interaction, `modal|cf|${action}`, `ทาย${action}`, 'จำนวนเงินที่แทง');
    }

    if (ns !== 'flow') return;

    switch (action) {
        case 'rob':
            return interaction.reply({
                content: '🥷 เลือกเป้าหมายที่จะปล้น:',
                components: [new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder().setCustomId('usersel|rob|').setPlaceholder('เลือกเป้าหมาย').setMaxValues(1)
                )],
                flags: MessageFlags.Ephemeral
            });
        case 'pay':
            return interaction.reply({
                content: '💸 เลือกผู้รับเงิน:',
                components: [new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder().setCustomId('usersel|pay|').setPlaceholder('เลือกผู้รับเงิน').setMaxValues(1)
                )],
                flags: MessageFlags.Ephemeral
            });
        case 'dep':
            return showAmountModal(interaction, 'modal|dep|', 'ฝากเงินเข้าธนาคาร', 'จำนวนเงิน (หรือพิมพ์ all)');
        case 'with':
            return showAmountModal(interaction, 'modal|with|', 'ถอนเงินจากธนาคาร', 'จำนวนเงิน (หรือพิมพ์ all)');
        case 'cf':
            return interaction.reply({
                content: '🪙 เลือกด้านที่จะทาย:',
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('cfchoice|หัว|').setLabel('หัว').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('cfchoice|ก้อย|').setLabel('ก้อย').setStyle(ButtonStyle.Primary)
                )],
                flags: MessageFlags.Ephemeral
            });
        case 'slots':
            return showAmountModal(interaction, 'modal|slots|', 'ตู้สล็อต', 'จำนวนเงินที่จะลง');
        case 'buy':
            return handleBuyMenu(interaction);
        case 'upgrade':
            return handleUpgradeMenu(interaction);
    }
}

async function handleUserSelect(interaction, commandRouter) {
    const [ns, action] = interaction.customId.split('|');
    if (ns !== 'usersel') return;

    const target = interaction.users.first();
    const targetMember = interaction.members.first();
    if (!target) return interaction.update({ content: '❌ ไม่พบผู้ใช้ที่เลือก', components: [] });

    if (!isPlayerMember(targetMember)) {
        const label = action === 'pay' ? 'โอนเงิน' : 'ปล้น';
        return interaction.update({ content: `❌ ${label}ได้เฉพาะผู้เล่นที่มี Role ในเซิร์ฟเวอร์เท่านั้น!`, components: [] });
    }

    if (action === 'rob') {
        await interaction.update({ content: `🥷 กำลังปล้น **${targetMember.displayName}**...`, components: [] });
        return runCommand(interaction, commandRouter, '!rob', [], target, targetMember);
    }

    if (action === 'pay') {
        const modal = new ModalBuilder().setCustomId(`modal|pay|${target.id}`).setTitle(`โอนเงินให้ ${targetMember.displayName}`.slice(0, 45));
        const input = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('จำนวนเงินที่จะโอน')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }
}

async function handleStringSelect(interaction, commandRouter) {
    const [ns, action] = interaction.customId.split('|');
    if (ns !== 'strsel') return;

    const value = interaction.values[0];
    await interaction.update({ content: '⏳ กำลังดำเนินการ...', components: [] });

    if (action === 'buy') return runCommand(interaction, commandRouter, '!buy', [value]);
    if (action === 'upgrade') return runCommand(interaction, commandRouter, '!upgrade', [value]);
}

async function handleModal(interaction, commandRouter) {
    const [ns, action, payload] = interaction.customId.split('|');
    if (ns !== 'modal') return;

    const amount = interaction.fields.getTextInputValue('amount').trim();

    if (action === 'dep') return runCommand(interaction, commandRouter, '!dep', [amount]);
    if (action === 'with') return runCommand(interaction, commandRouter, '!with', [amount]);
    if (action === 'slots') return runCommand(interaction, commandRouter, '!slots', [amount]);
    if (action === 'cf') return runCommand(interaction, commandRouter, '!cf', [payload, amount]);

    if (action === 'pay') {
        const target = await interaction.client.users.fetch(payload).catch(() => null);
        if (!target) return interaction.reply({ content: '❌ ไม่พบผู้ใช้เป้าหมาย', flags: MessageFlags.Ephemeral });

        const targetMember = await interaction.guild.members.fetch(payload).catch(() => null);
        if (!isPlayerMember(targetMember)) {
            return interaction.reply({ content: '❌ โอนเงินได้เฉพาะผู้เล่นที่มี Role ในเซิร์ฟเวอร์เท่านั้น!', flags: MessageFlags.Ephemeral });
        }

        return runCommand(interaction, commandRouter, '!pay', ['@target', amount], target, targetMember);
    }
}

async function handleInteraction(interaction, commandRouter) {
    try {
        if (interaction.isButton()) return await handleButton(interaction, commandRouter);
        if (interaction.isUserSelectMenu()) return await handleUserSelect(interaction, commandRouter);
        if (interaction.isStringSelectMenu()) return await handleStringSelect(interaction, commandRouter);
        if (interaction.isModalSubmit()) return await handleModal(interaction, commandRouter);
    } catch (err) {
        console.error('❌ interaction error:', err);
        const payload = { content: '❌ เกิดข้อผิดพลาดบางอย่าง ลองใหม่อีกครั้งนะ', flags: MessageFlags.Ephemeral };
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(payload).catch(() => { });
        } else {
            await interaction.reply(payload).catch(() => { });
        }
    }
}

module.exports = { handleInteraction };
