// index.js
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const config = require("./bot_config");

// ---------- ส่วน Web Server เอาไว้ให้ UptimeRobot มาปลุก ----------
const app = express();
const port = process.env.PORT || 3000;

// route หลักไว้เช็คว่าโปรเจคยังตื่นอยู่
app.get("/", (req, res) => {
  res.send("Thai Calendar Discord Bot is alive ✅");
});

// เริ่มฟังพอร์ต (สำคัญมาก ไม่งั้น Replit จะไม่สร้าง URL ให้)
app.listen(port, () => {
  console.log(`Web server running on port ${port}`);
});

// ---------- ส่วน Discord Bot เหมือนเดิม ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ----- ฟังก์ชันสร้างข้อความปฏิทินไทยสวย ๆ -----
function generateThaiCalendarMessage(date = new Date()) {
  // ชื่อวัน / เดือน แบบไทย
  const thaiWeekdaysFull = [
    "วันอาทิตย์",
    "วันจันทร์",
    "วันอังคาร",
    "วันพุธ",
    "วันพฤหัสบดี",
    "วันศุกร์",
    "วันเสาร์"
  ];

  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม"
  ];

  const now = new Date(date); // copy
  const year = now.getFullYear();
  const beYear = year + 543; // แปลงเป็น พ.ศ.
  const monthIndex = now.getMonth();
  const dayOfMonth = now.getDate();
  const weekdayIndex = now.getDay(); // 0=อาทิตย์,1=จันทร์,...

  const monthName = thaiMonths[monthIndex];
  const weekdayName = thaiWeekdaysFull[weekdayIndex];

  // ----- สร้างตารางปฏิทินทั้งเดือน -----
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // แปลง day ให้จันทร์เป็นคอลัมน์แรก
  // JS: getDay() => 0=อาทิตย์ ... 6=เสาร์
  // ให้: 0=จันทร์ ... 6=อาทิตย์
  const jsDay = firstOfMonth.getDay();      // 0..6
  const offset = (jsDay + 6) % 7;           // เลื่อนให้จันทร์เป็น 0

  // header วันในสัปดาห์ (จันทร์-อาทิตย์)
  const headers = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

  // สร้างบรรทัด header
  let lines = [];
  lines.push(`ปฏิทินเดือน ${monthName} พ.ศ. ${beYear}`);
  lines.push(""); // เว้นบรรทัด

  // โครงสร้างเป็น fixed-width ให้ดูเป็นตารางสวย ๆ
  const headerLine = headers
    .map((h) => h.padStart(2, " ").padEnd(3, " "))
    .join("");
  lines.push(headerLine);

  let currentDay = 1;
  let row = [];

  // แถวแรก: เติมช่องว่างก่อนถึงวันแรกของเดือน
  for (let i = 0; i < 7; i++) {
    if (i < offset) {
      row.push("   "); // ช่องว่าง
    } else {
      row.push(String(currentDay).padStart(2, " ") + " ");
      currentDay++;
    }
  }
  lines.push(row.join(""));

  // แถวถัด ๆ ไป
  while (currentDay <= daysInMonth) {
    row = [];
    for (let i = 0; i < 7; i++) {
      if (currentDay > daysInMonth) {
        row.push("   ");
      } else {
        row.push(String(currentDay).padStart(2, " ") + " ");
        currentDay++;
      }
    }
    lines.push(row.join(""));
  }

  const calendarBlock = lines.join("\n");

  // ----- ข้อความรวมทั้งหมด -----
  const title = "✨ ปฏิทินไทยประจำวัน ✨";
  const subtitle =
    `วันนี้เป็น${weekdayName}ที่ ${dayOfMonth} ${monthName} พ.ศ. ${beYear}`;

  const message =
    `${title}\n` +
    `**${subtitle}**\n` +
    "────────────────────\n" +
    "ปฏิทินทั้งเดือน (จันทร์ - อาทิตย์)\n" +
    "```txt\n" +
    calendarBlock +
    "\n```";

  return message;
}

// ----- schedule งานส่งปฏิทินทุกวันเวลา 00:00 -----
function scheduleDailyCalendar() {
  cron.schedule(
    "0 0 * * *", // นาที 0 ชั่วโมง 0 ของทุกวัน
    async () => {
      try {
        const channel = await client.channels.fetch(config.channelId);
        if (!channel) {
          console.error("ไม่พบ channel ตาม channelId ที่ตั้งไว้");
          return;
        }

        const now = new Date();
        const calendarMessage = generateThaiCalendarMessage(now);

        await channel.send(calendarMessage);
        console.log("ส่งปฏิทินแล้ว:", now.toISOString());
      } catch (err) {
        console.error("ส่งปฏิทินล้มเหลว:", err);
      }
    },
    {
      timezone: config.timezone || "Asia/Bangkok"
    }
  );
}

// ----- event ready -----
client.once("ready", async () => {
  console.log(`ล็อกอินเป็น ${client.user.tag} แล้วจ้า`);

  // ยิงปฏิทินครั้งแรกตอนบอทเปิด (เผื่ออยากเห็นเลย)
  try {
    const channel = await client.channels.fetch(config.channelId);
    if (channel) {
      const now = new Date();
      const calendarMessage = generateThaiCalendarMessage(now);
      await channel.send(calendarMessage);
    }
  } catch (err) {
    console.error("ส่งปฏิทินตอนเริ่มต้นล้มเหลว:", err);
  }

  // แล้วค่อยตั้ง schedule ให้ยิงทุกวัน 00:00
  scheduleDailyCalendar();
});

// ----- login บอท -----
client.login(config.token);