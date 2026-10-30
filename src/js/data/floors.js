// Paradise Club floors, top to bottom. Thai text is copied unchanged from the
// original site. The maps and corridors drawn from `seed` are atmospheric
// illustrations, not floor plans.
export const FLOORS = {
  P: { code: 'P', label: 'FLOOR P · HOTEL', seed: 7,
    title: 'โรงแรม',
    text: 'ห้องพักหรูที่ไม่มีหน้าต่างสักบาน แขกรู้ได้ว่าเป็นกลางวันหรือกลางคืน ก็จากแสงไฟที่ฝ่ายบริหารเป็นผู้ตั้งเท่านั้น',
    rooms: 'SUITES P-01 — P-48', clear: 'CLEARANCE · GUESTS WITH A KEYCARD', prefix: 'P' },
  V: { code: 'V', label: 'FLOOR V · PRIVATE ROOMS', seed: 13,
    title: 'พื้นที่บันเทิงส่วนตัว',
    text: 'ห้องรับรองส่วนตัวที่เข้าได้ด้วยคำเชิญเท่านั้น ประตูทุกบานหน้าตาเหมือนกัน และไม่มีห้องใดปรากฏอยู่ในผังอาคารฉบับทางการ',
    rooms: 'ROOMS V-1 — V-?', clear: 'CLEARANCE · BY INVITATION', prefix: 'V' },
  C: { code: 'C', label: 'FLOOR C · CASINO', seed: 21,
    title: 'คาสิโน',
    text: 'คาสิโนที่ไม่มีนาฬิกาบนผนังแม้แต่เรือนเดียว โต๊ะเปิดตลอดเวลา และทางเดินทุกเส้นพาวนกลับมาที่โต๊ะเดิม',
    rooms: 'TABLES C-01 — C-36', clear: 'CLEARANCE · MEMBERS', prefix: 'C' },
  B: { code: 'B', label: 'FLOOR B · BARS', seed: 34,
    title: 'บาร์',
    text: 'บาร์หลายแห่งเชื่อมถึงกันด้วยทางเดินที่ดูเหมือนกันทุกเส้น ลูกค้าบางคนเข้ามาเพื่อลืม และบางคนก็ลืมจริง ๆ',
    rooms: 'BARS B-I — B-VII', clear: 'CLEARANCE · OPEN TO GUESTS', prefix: 'B' },
  G: { code: 'G', label: 'FLOOR G · THE CLUB', seed: 3,
    title: 'คลับระดับสูง',
    text: 'คลับหรูชั้นล่างสุดที่คนภายนอกรู้จัก ทางเข้าเดียวที่ทุกคนจำได้ และเป็นทางเดียวที่ไม่มีใครจำได้ว่าเคยเดินออกไป',
    rooms: 'HALL · LOUNGES G-1 — G-9', clear: 'CLEARANCE · ON THE LIST', prefix: 'G' },
  S: { code: 'S1', label: 'FLOOR S1 · STAFF QUARTERS', seed: 55,
    title: 'ที่พักพนักงาน',
    text: 'ที่พัก อาหาร รายได้ และสวัสดิการสำหรับพนักงาน ซึ่งส่วนใหญ่เป็นมิวแทนต์หรือผู้มีความสามารถพิเศษที่ไม่มีที่อื่นให้ไป ที่นี่ปลอดภัยกว่าโลกภายนอก — ตราบใดที่ยังทำตามกฎของเจ้าของอาคาร',
    rooms: 'QUARTERS S1-001 — S1-140', clear: 'CLEARANCE · STAFF ONLY · CURFEW ENFORCED', prefix: 'S1' },
  X: { code: '—', label: 'FLOOR — · NOT IN THE DIRECTORY', seed: 66, hidden: true,
    title: 'ชั้นที่ไม่มีอยู่',
    text: 'ชั้นที่ไม่มีหมายเลขบนแผงลิฟต์ ที่ตั้งของเครือข่ายธุรกิจผิดกฎหมายและข้อตกลงที่ไม่ควรถูกบันทึกไว้ ไม่มีใครยอมรับว่าเคยลงมาถึงชั้นนี้',
    rooms: 'ROOMS ███ — ███', clear: 'CLEARANCE · NONE ISSUED', prefix: '—' },
};

export const ORDER = ['P', 'V', 'C', 'B', 'G', 'S', 'X'];
