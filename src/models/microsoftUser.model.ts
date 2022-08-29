interface MicrosoftUser {
    _id: string;
    userId: String;
    name: String;
    role: String;
    practice: string;
    mail: string;
    reportings: Array<string>;
    last_access: string;
    __v: number;
  }
  
  export default MicrosoftUser;
  