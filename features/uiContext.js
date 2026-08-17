// สร้าง "context" ที่มีหน้าตาเหมือน message (.author, .channel, .mentions, .reply())
// เพื่อให้ execute() เดิมของแต่ละ feature (เขียนไว้สำหรับ !command แบบพิมพ์) ใช้ซ้ำกับปุ่ม/interaction ได้เลย
// โดยไม่ต้องแก้โค้ดฝั่ง feature แม้แต่บรรทัดเดียว
function fromInteraction(interaction, targetUser, targetMember) {
    return {
        author: interaction.user,
        member: interaction.member,
        guild: interaction.guild,
        channel: interaction.channel,
        mentions: {
            users: {
                first: () => targetUser
            },
            members: {
                first: () => targetMember
            }
        },
        reply(payload) {
            const options = typeof payload === 'string' ? { content: payload } : payload;
            const send = (interaction.deferred || interaction.replied)
                ? interaction.followUp(options)
                : interaction.reply(options);

            // ให้ผลลัพธ์มี .delete() เหมือน Message ปกติ (ใช้กับ warning ที่ลบตัวเองหลัง 5 วิ)
            return send.then(() => ({
                delete: () => interaction.deleteReply().catch(() => { })
            }));
        }
    };
}

module.exports = { fromInteraction };
