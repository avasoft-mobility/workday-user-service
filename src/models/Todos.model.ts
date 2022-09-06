import Tag from "./tag.model";

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
  tagNames?: string[];
  __v: number;
}

interface TodoWithTag extends Todo {
  tags?: Tag[];
}

interface TodoWithTagId extends Todo {
  tags?: string[];
}

export { TodoWithTag as Todo, Tag, TodoWithTagId };
