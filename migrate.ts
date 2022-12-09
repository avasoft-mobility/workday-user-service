import User from "./src/schema/microsoftUserSchema";

const migrate = async (migrationDetails: {}) => {
  console.log("Started...");

  Object.keys(migrationDetails).forEach(async (toUserMailId) => {
    let targetUserMailIds = migrationDetails[
      toUserMailId as keyof typeof migrationDetails
    ] as string[];

    const toUser = await User.findOne({
      mail: { $regex: new RegExp(toUserMailId, "i") },
    });

    const reportings = toUser?.reportings;
    if (!reportings) {
      return;
    }

    for (let targetUserMailId of targetUserMailIds) {
      const targetUser = await User.findOne({
        mail: { $regex: new RegExp(targetUserMailId, "i") },
      });
      if (!targetUser) {
        continue;
      }

      reportings.push(targetUser?.userId);
    }

    await Promise.all(reportings);

    let uniqueReportings = [...new Set(reportings)];
    toUser.reportings = uniqueReportings;
    await toUser.save();
  });

  console.log("Completed...");
};

export { migrate };
