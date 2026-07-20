// Vietnamese labels & descriptions for Sefaria categories & major works.
// Only display names/descriptions are localized — book text itself is served
// bilingually (Hebrew + English) directly from the Sefaria API.

export const CATEGORY_VI: Record<string, { name: string; desc: string; icon: string }> = {
  Tanakh: {
    name: "Tanakh — Kinh Thánh Hebrew",
    desc: "Bộ kinh nền tảng của văn hóa Israel: Torah, Nabiim (Ngôn sứ) và Ketubim (Trước tác).",
    icon: "📜",
  },
  Torah: {
    name: "Torah — Ngũ Kinh Moses",
    desc: "Năm cuốn sách khởi nguyên: Sáng thế, Xuất hành, Lê-vi, Dân số, Đệ nhị luật.",
    icon: "🕎",
  },
  Prophets: {
    name: "Nabiim — Sách Ngôn Sứ",
    desc: "Tiếng nói của các ngôn sứ Israel cổ đại: Joshua, Isaiah, Jeremiah, Ezekiel…",
    icon: "🪔",
  },
  Writings: {
    name: "Ketubim — Trước Tác",
    desc: "Thi ca, minh triết và biên niên: Thi thiên, Châm ngôn, Job, Nhã ca…",
    icon: "🎼",
  },
  Mishnah: {
    name: "Mishnah — Truyền Khẩu Luật",
    desc: "Tuyển tập luật Do Thái miệng, biên soạn tại Israel thế kỷ III.",
    icon: "⚖️",
  },
  Talmud: {
    name: "Talmud — Đại Luận",
    desc: "Bình chú và tranh luận của các Rabbi trải qua nghìn năm.",
    icon: "📚",
  },
  Midrash: {
    name: "Midrash — Diễn Giải",
    desc: "Truyện kể và ẩn dụ diễn giải sâu xa các đoạn Kinh Thánh.",
    icon: "🪶",
  },
  Halakhah: {
    name: "Halakhah — Luật Do Thái",
    desc: "Các bộ luật thực hành trải qua thời trung cổ và hiện đại.",
    icon: "📖",
  },
  Kabbalah: {
    name: "Kabbalah — Huyền Học",
    desc: "Tri thức huyền bí, ánh sáng Sephirot và cây Sự Sống.",
    icon: "✡️",
  },
  Liturgy: {
    name: "Liturgy — Phụng Vụ",
    desc: "Cầu nguyện, thánh ca và nghi thức của cộng đồng Israel.",
    icon: "🕯️",
  },
  Jewish_Thought: {
    name: "Tư Tưởng Do Thái",
    desc: "Triết học, thần học và luận đề từ Maimonides đến các học giả hiện đại.",
    icon: "💭",
  },
  "Jewish Thought": {
    name: "Tư Tưởng Do Thái",
    desc: "Triết học, thần học và luận đề từ Maimonides đến các học giả hiện đại.",
    icon: "💭",
  },
  Tosefta: {
    name: "Tosefta — Bổ Sung",
    desc: "Tuyển tập luật bổ sung Mishnah, ghi chép các truyền thống rabbinic.",
    icon: "📘",
  },
  Chasidut: {
    name: "Chasidut — Tinh Thần Hasidic",
    desc: "Truyền thống thần bí và niềm vui thánh thiện của phong trào Hasidic.",
    icon: "🔥",
  },
  Musar: {
    name: "Musar — Đạo Đức Học",
    desc: "Con đường tu dưỡng nhân cách và đạo đức Israel.",
    icon: "🌿",
  },
  Responsa: {
    name: "Responsa — Vấn Đáp",
    desc: "Thư trả lời của các Rabbi về những câu hỏi luật pháp và đời sống.",
    icon: "✉️",
  },
  Second_Temple: {
    name: "Đền Thờ Thứ Hai",
    desc: "Văn bản từ thời kỳ đền thờ Jerusalem thứ hai (516 TCN – 70 CN).",
    icon: "🏛️",
  },
  "Second Temple": {
    name: "Đền Thờ Thứ Hai",
    desc: "Văn bản từ thời kỳ đền thờ Jerusalem thứ hai (516 TCN – 70 CN).",
    icon: "🏛️",
  },
  Reference: {
    name: "Tham Khảo",
    desc: "Từ điển, bách khoa và công cụ tra cứu.",
    icon: "🔎",
  },
  Quoting_Commentary: {
    name: "Bình Chú Trích Dẫn",
    desc: "Các tác phẩm bình chú kinh điển.",
    icon: "🖋️",
  },
  Modern_Commentary: {
    name: "Bình Chú Hiện Đại",
    desc: "Tiếng nói đương đại của học giả Israel & Do Thái toàn cầu.",
    icon: "🌐",
  },
};

export const BOOK_VI: Record<string, { name: string; blurb: string }> = {
  Genesis: { name: "Sáng Thế Ký", blurb: "Khởi nguyên vũ trụ, loài người và các tổ phụ." },
  Exodus: { name: "Xuất Hành Ký", blurb: "Cuộc giải phóng khỏi Ai Cập và mặc khải trên Sinai." },
  Leviticus: { name: "Lê-vi Ký", blurb: "Luật tế lễ và sự thánh khiết." },
  Numbers: { name: "Dân Số Ký", blurb: "Bốn mươi năm lang thang trong hoang mạc." },
  Deuteronomy: { name: "Đệ Nhị Luật", blurb: "Di ngôn cuối cùng của Moses trước khi vào Đất Hứa." },
  Psalms: { name: "Thi Thiên", blurb: "150 khúc ca của vua David — thi ca vĩnh cửu." },
  Proverbs: { name: "Châm Ngôn", blurb: "Minh triết của vua Solomon." },
  Job: { name: "Sách Job", blurb: "Bi kịch và chất vấn về đau khổ và công lý." },
  "Song of Songs": { name: "Nhã Ca", blurb: "Bản tình ca thiêng liêng của Solomon." },
  Isaiah: { name: "Isaiah", blurb: "Ngôn sứ của công lý và niềm hy vọng thiên sai." },
  Jeremiah: { name: "Jeremiah", blurb: "Tiếng khóc trước khi Jerusalem sụp đổ." },
  Ecclesiastes: { name: "Truyền Đạo", blurb: "‘Hư không của hư không’ — chiêm nghiệm về ý nghĩa cuộc đời." },
  Ruth: { name: "Sách Ruth", blurb: "Câu chuyện về lòng trung thành và tổ mẫu của vua David." },
  Esther: { name: "Sách Esther", blurb: "Cuộc giải cứu người Do Thái ở Ba Tư — nguồn gốc lễ Purim." },
  Lamentations: { name: "Ai Ca", blurb: "Khúc bi ca cho Jerusalem hoang tàn." },
  Daniel: { name: "Daniel", blurb: "Khải thị và các đế chế trỗi dậy rồi tàn." },
  Joshua: { name: "Joshua", blurb: "Cuộc chinh phục và định cư trên Đất Israel." },
  Judges: { name: "Thủ Lãnh Ký", blurb: "Những vị thủ lãnh anh hùng của Israel." },
};

export const HERO_QUOTES: { he: string; vi: string; source: string }[] = [
  {
    he: "בְּרֵאשִׁית בָּרָא אֱלֹהִים",
    vi: "‘Ban đầu, Elohim tạo dựng…’",
    source: "Sáng thế 1:1",
  },
  {
    he: "אִם אֶשְׁכָּחֵךְ יְרוּשָׁלִָם",
    vi: "‘Nếu tôi quên Jerusalem…’",
    source: "Thi thiên 137:5",
  },
  {
    he: "שְׁמַע יִשְׂרָאֵל",
    vi: "‘Hỡi Israel, hãy lắng nghe…’",
    source: "Đệ nhị luật 6:4",
  },
];

export function viCategory(key: string) {
  return (
    CATEGORY_VI[key] ??
    CATEGORY_VI[key.replace(/ /g, "_")] ?? {
      name: key,
      desc: "Bộ sưu tập văn bản Israel cổ điển và hiện đại.",
      icon: "✦",
    }
  );
}

export function viBook(title: string) {
  return BOOK_VI[title];
}
