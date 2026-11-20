"use strict";

const weekCatFaces = [
  {
    label: "遇到惊喜的小猫",
    outline: "M35 76Q18 66 6 39Q10 35 47 50 M52 48Q79 38 108 47 M113 49Q154 42 154 48Q150 58 129 76 M37 93Q39 90 47 91Q90 96 119 92 M37 82Q29 83 26 89 M126 83Q135 84 139 88",
    face: "M64 59l-.5 12 M99 58l.5 12 M72 73l18-2q-4 14-9 15Z M121 10l-2 16 M116 33l4 5",
  },
  {
    label: "梦见小鱼的小猫",
    outline: "M27 68Q27 54 32 34Q45 41 57 52 M62 52Q74 52 87 55 M92 56l3-3 M96 55Q119 44 136 43Q132 53 120 71 M25 81Q24 97 74 100 M88 98Q112 99 126 91 M27 75l-10-4 M25 79l-10 1 M122 78q7 0 12 3 M123 84l8 3",
    face: "M45 70q9 2 16 2 M79 72q9 3 18 2 M77 100q4-14-7-14q-12-1-11-7q1-4 5-1q7 6 14 2q10-4 8 13l-2 7 M79 38Q86 29 100 25Q94 20 99 15Q109 2 127 5Q145 9 141 18Q137 30 116 31Q107 31 101 25 M107 20q8-13 17-3q6 9 10 3q-3-11-10-5q-7 12-17 5Z",
  },
  {
    label: "红着脸的小猫",
    outline: "M24 68Q15 50 26 20Q37 27 51 49 M52 52l4-7 M59 49Q81 49 101 50Q115 25 127 18Q144 43 133 68 M27 82Q22 95 72 96Q110 94 127 82 M25 73q-8 1-12 9 M128 76q7 3 10 7",
    face: "M39 71l6-11 M47 71l8-12 M55 71l8-12 M64 71l10-15 M78 71l11-16 M90 71l11-15 M101 69l9-11 M61 80q5 5 11 0q6 5 11-1",
  },
  {
    label: "有点紧张的小猫",
    outline: "M23 72Q13 50 20 28Q25 27 53 51 M57 51Q77 49 105 51 M110 51Q126 42 149 39Q150 50 126 77 M27 93Q63 109 109 100 M25 78q-9 1-15 8 M24 86q-8 1-11 7 M121 81q7 1 12 5 M119 90l10 4",
    face: "M47 70q6-6 13-4 M92 64q10 2 16 8 M58 72l-.6 8 M97 73l-.6 8 M69 92q7-8 13-1 M112 59l1 14 M117 58l1 16 M122 60l1 9 M127 60l1 8",
  },
  {
    label: "朝你眨眼的小猫",
    outline: "M38 80Q15 68 9 58Q30 46 56 49 M62 43l4 5 M70 48q11-7 27-8 M101 40Q106 21 115 10Q133 31 138 64 M46 99Q83 113 135 88 M39 88q-8 1-12 6 M43 94q-6 2-9 7 M136 73q7-3 10-1 M136 78q6-1 10 0",
    face: "M56 75q12 2 18 8 M102 60l.4 13 M78 84l8 6q5-2 8-9",
  },
  {
    label: "眼睛闪亮的小猫",
    outline: "M23 67Q14 51 26 24Q31 23 51 53 M53 50l3 5 M59 53q15-1 31 1 M95 54q16-12 31-22q4 22-11 43 M28 87Q65 112 109 98 M24 76q-8 1-13 8 M26 81q-6 2-9 8 M115 82l10 6 M115 89l8 6",
    face: "M60 81q4 12 10 1 M34 78l2 3 M30 79l2 4 M96 83q3-3 6 0",
    fill: "M37 69Q39 58 50 59Q60 61 61 69Q60 79 49 80Q38 79 37 69Z M42 65q1-4 8-4q4 2-1 4q-5 3-7 0Z M52 70q3-5 5-1q0 5-4 5q-3-1-1-4Z M43 75q3-2 5 0q2 2-1 2q-3 1-4-2Z M70 69Q73 59 85 60Q96 61 98 70Q98 80 85 81Q73 81 70 69Z M75 66q4-5 9-4q3 3-2 4q-4 4-7 0Z M88 69q5-5 7-1q0 5-4 5q-4 0-3-4Z M77 76q3-2 6 1q1 2-2 2q-3 0-4-3Z",
  },
  {
    label: "一脸问号的小猫",
    outline: "M25 73Q10 53 20 26Q24 25 51 49 M55 44l4 7 M63 51Q81 49 104 51 M109 51Q127 47 149 38Q146 56 131 77 M28 94Q63 92 100 96q15 1 23-4 M22 80q-8 2-13 8 M25 86q-8 2-11 10 M129 83l10 2 M129 88l8 4",
    face: "M39 74q7-10 17-5q9 5 6 8q-6 8-20 5q-7-2-3-8Z M92 74q8-7 20-3q10 3 7 8q-8 9-20 5q-11-4-7-10Z M69 89l10-10l13 10Z M119 11q8-9 11 0q0 5-5 12 M121 26l5 7",
    fill: "M45 74q4-5 7-3q-4 6 3 7q-7 4-10-4Z M105 71a3 3 0 1 0 6 0Z",
  },
  {
    label: "歪头好奇的小猫",
    outline: "M29 77Q17 65 12 34Q31 40 52 53 M54 44l9 6 M67 51q14-4 33 0 M105 52q-3-19 3-31q20 21 28 56 M35 96q2-4 6-4q47 16 91 3 M29 84q-8 2-13 7 M31 90q-8 3-10 8 M135 83l9 2 M136 90l8 2",
    face: "M70 68l.3 12 M104 68l-.5 12 M87 94l7-8 M145 32q9-3 10 3q-2 4-7 6 M146 45l6 4",
  },
  {
    label: "笑弯眼的小猫",
    outline: "M26 65l-18-2Q26 43 48 34 M52 31l4 3 M65 31q15-9 36-2 M107 29l8-3 M118 30q19 3 35 14q-13 10-25 26 M38 83q23 15 70 10q12-1 18-7 M33 69q-7 1-13 7 M35 77q-6 2-8 10 M130 78q7 1 11 6",
    face: "M49 61q5-5 11-6 M106 54q8 1 13 7 M73 62q8-4 14-1l-5 15Z",
  },
  {
    label: "半睁着眼的小猫",
    outline: "M27 76Q15 54 12 30Q11 25 18 28Q37 34 53 45 M56 44l27 1 M87 45q25-1 51-12q2 4-15 37 M31 95q29 1 60 2q26 1 32 2 M26 82q-7 1-11 7 M28 88q-7 3-9 8 M120 82l10 3 M123 88l10 5",
    face: "M42 69q16 1 29 0q-4 13-14 13q-12 0-15-13Z M85 70l25-2q1 14-11 15q-8 0-14-13Z",
  },
  {
    label: "趴着打瞌睡的小猫",
    outline: "M22 67Q36 29 70 19q5-2 3 2L61 38q39-1 54 4q23-7 39 3q1 2-26 21 M23 72Q9 75 4 84q-3 6 7 6q34-2 77-2q41 0 48 4 M125 74l12 2 M126 81l8 3",
    face: "M40 72q10-1 20 0 M85 73q9-2 19-1 M66 85l9-6l9 5",
  },
  {
    label: "低头看东西的小猫",
    outline: "M25 72Q9 48 10 26Q14 25 49 46 M51 42l3 8 M58 49q21-1 45 2 M106 52l4-7 M112 51q19-16 37-21q4 0 2 10q-3 23-16 39 M37 96q38 8 86 8 M27 81q-8 4-12 11 M30 88q-7 4-9 14 M129 90q7 1 14 7 M130 98q8 2 11 7",
    face: "M43 74q4-11 16-10q12 2 12 13q-1 10-14 10q-13-3-14-13Z M91 76q3-13 15-12q13 3 12 15q-3 10-15 9q-11-2-12-12Z M76 87q6-4 15 1q0 3-8 7q-3-1-7-8Z",
    fill: "M56 76a4 5 0 1 0 0 10a4 5 0 1 0 0-10Z M102 77a4 5 0 1 0 0 10a4 5 0 1 0 0-10Z",
  },
];

function drawWeekCat(canvas, face) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(canvas.width / 160, 0, 0, canvas.height / 114, 0, 0);
  ctx.clearRect(0, 0, 160, 114);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ctx.fillStyle = "#1f211b";
  ctx.lineWidth = 2.8;
  ctx.stroke(new Path2D(face.outline));
  ctx.lineWidth = 2.4;
  ctx.stroke(new Path2D(face.face));
  if (face.fill) ctx.fill(new Path2D(face.fill), "evenodd");
  canvas.setAttribute("aria-label", face.label);
}

function startWeekCat(canvas) {
  const interval = 30_000;
  const startedAt = performance.now();
  let current = -1;

  function update() {
    const next = Math.floor((performance.now() - startedAt) / interval) % weekCatFaces.length;
    if (next === current) return;
    current = next;
    drawWeekCat(canvas, weekCatFaces[current]);
  }

  update();
  window.setInterval(update, interval);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
}
