import Tag from "./Tag.model";

interface Todo {
  _id: string;
  userId: string;
  microsoftUserId: string;
  title: string;
  comments: string;
  status: string;
  type: string;
  eta: number;
  ata: number;
  date: Date;
  tags?: Tag[];
  __v: number;
}

export default Todo;
