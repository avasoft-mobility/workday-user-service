import mongoose from "mongoose";

const leadership = new mongoose.Schema({
    microsoftUserId: {
        type: String
    },
    name: {
        type: String
    },
    domain: {
        type: String
    },
    mail: {
        type: String
    },
    hrpoc: {
        type: String
    },
    hrmail:
    {
        type: Array<String>
    },
});

// collection name
export default mongoose.model("leaderships", leadership);
