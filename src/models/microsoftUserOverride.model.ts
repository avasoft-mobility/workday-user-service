interface MicrosoftUserOverride {
    _id: string;
    toUserId: string;
    reportees: string[];
    status: string;
    requestedDate: Date;
    __v?: number;
  }
  
  export default MicrosoftUserOverride;
  