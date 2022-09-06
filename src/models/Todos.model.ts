interface Tag {
  _id: string;
  microsoftUserId?: string;
  tagName: string;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

interface GraphTodo {
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
  tagNames?: string[];
  __v: number;
}

export { GraphTodo, Tag };
