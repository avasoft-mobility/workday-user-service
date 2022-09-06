interface MicrosoftUser {
  _id: string;
  userId: string;
  name: string;
  role: string;
  practice: string;
  mail: string;
  reportings: Array<string>;
  managerId: string;
  last_access: string;
  employeeId: string;
  __v: number;
}

export default MicrosoftUser;
