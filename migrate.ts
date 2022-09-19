import User from "./src/schema/microsoftUserSchema";

const TO_EMAIL_ID = "ganeshkumar.r@avasoft.com";

const TARGET_EMAIL_IDS = [
  "rammya.d@avasoft.com",
  "karthik.g@avasoft.com",
  "harikrishnan.s@avasoft.com",
  "mugilan.r@avasoft.com",
  "dharineesh.k@avasoft.com",
  "venkat.k@avasoft.com",
  "reshma.r@avasoft.com",
  "sharmila.s@avasoft.com",
  "sowjanya.s@avasoft.com",
];

const migrate = async () => {
  console.log("Started...");

  const toUser = await User.findOne({
    mail: { $regex: new RegExp(TO_EMAIL_ID, "i") },
  });

  const reportings = toUser?.reportings;

  if (!reportings) {
    return;
  }

  for (let targetEmail of TARGET_EMAIL_IDS) {
    const targetUser = await User.findOne({
      mail: { $regex: new RegExp(targetEmail, "i") },
    });
    if (!targetUser) {
      continue;
    }
    reportings.push(targetUser?.userId);
  }

  let uniqueReportings = [...new Set(reportings)];

  toUser.reportings = uniqueReportings;
  await toUser.save();
  console.log("Completed...");
};

export { migrate };
