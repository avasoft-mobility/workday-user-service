import Cipherer from "../helpers/Cipherer";
import LambdaClient from "../helpers/LambdaClient";
import Attendance from "../models/Attendance.model";
import ErrorResponse from "../models/ErrorResponse.model";
import GraphViewUser from "../models/GraphViewUser.model";
import Tag from "../models/Tag.model";
import Todo from "../models/Todo.model";

import MicrosoftUser from "../schema/microsoftUserSchema";

interface ExceptionalValidationResponse {
  code: number;
  hasAccess: boolean;
  user: GraphViewUser;
}

const getGraphViewData = async (
  loggedInUser: GraphViewUser,
  targetUserId: string
): Promise<GraphViewUser[]> => {
  let response: GraphViewUser[] = [];
  const targetUser = await MicrosoftUser.findOne({
    userId: targetUserId,
  });

  const directReports = await MicrosoftUser.find({
    managerId: targetUserId,
  });

  let matchingReports = await getMatchingReports(targetUserId);

  const lambdaClient = new LambdaClient("Todos");
  const defaultTags = (await lambdaClient.get(`todos/private/common-tags`, {
    header: {
      key: "CF43D31C5DCD2094D72EAC3B257D5949",
    },
  })) as Tag[];

  response = processMatchingReports(matchingReports, targetUser!, loggedInUser);

  for (const directReport of directReports) {
    response[0].reportingDetails!.push({
      _id: directReport._id,
      userId: directReport.userId,
      name: directReport.name,
      role: directReport.role,
      practice: directReport.practice,
      mail: directReport.mail,
      reportings: directReport.reportings,
      managerId: directReport.managerId,
      last_access: directReport.last_access,
      todos: await getUserTodos(directReport.userId, defaultTags),
      attendance: await getUserAttendance(directReport.userId),
      __v: directReport.__v,
    });
  }

  response = orderReverseSorting(response);
  response = directReportsSorting(response);

  return response;
};

const processMatchingReports = (
  matchingReports: GraphViewUser[],
  targetUser: GraphViewUser,
  loggedInUser: GraphViewUser
): GraphViewUser[] => {
  let duplicateTargetUser = targetUser;
  const response: GraphViewUser[] = [];

  if (matchingReports.length > 1) {
    matchingReports = matchingReports.sort(
      (a, b) => a.reportings.length - b.reportings.length
    );

    for (let i = 0; i < matchingReports.length; i++) {
      if (duplicateTargetUser.managerId === matchingReports[i].userId) {
        response.push({
          _id: duplicateTargetUser._id,
          userId: duplicateTargetUser.userId,
          name: duplicateTargetUser.name,
          role: duplicateTargetUser.role,
          practice: duplicateTargetUser.practice,
          mail: duplicateTargetUser.mail,
          reportings: duplicateTargetUser.reportings,
          reportingDetails: [],
          managerId: duplicateTargetUser.managerId,
          order: i,
          last_access: duplicateTargetUser.last_access,
          __v: duplicateTargetUser.__v,
        });
        duplicateTargetUser = matchingReports[i];
        i = -1;
      }

      if (duplicateTargetUser.userId === loggedInUser.userId) {
        i++;
        response.push({
          _id: duplicateTargetUser._id,
          userId: duplicateTargetUser.userId,
          name: duplicateTargetUser.name,
          role: duplicateTargetUser.role,
          practice: duplicateTargetUser.practice,
          mail: duplicateTargetUser.mail,
          reportings: duplicateTargetUser.reportings,
          reportingDetails: [],
          managerId: duplicateTargetUser.managerId,
          order: i,
          last_access: duplicateTargetUser.last_access,
          __v: duplicateTargetUser.__v,
        });
        break;
      }
    }

    return response;
  }

  response.push({
    _id: duplicateTargetUser._id,
    userId: duplicateTargetUser.userId,
    name: duplicateTargetUser.name,
    role: duplicateTargetUser.role,
    practice: duplicateTargetUser.practice,
    mail: duplicateTargetUser.mail,
    reportings: duplicateTargetUser.reportings,
    reportingDetails: [],
    managerId: duplicateTargetUser.managerId,
    order: 1,
    last_access: duplicateTargetUser.last_access,
    __v: duplicateTargetUser.__v,
  });
  return response;
};

const getMatchingReports = async (
  targetUserId: string
): Promise<GraphViewUser[]> => {
  return await MicrosoftUser.find({ reportings: targetUserId });
};

const getUserTodos = async (
  userId: string,
  defaultTags: Tag[]
): Promise<Todo[]> => {
  let userTodos: Todo[] = [];
  const lambdaClient = new LambdaClient("Todos");
  const response = (await lambdaClient.get(
    `todos?userId=${userId}&date=${new Date()}`
  )) as Todo[];

  for (const todo of response) {
    var todoItem: Todo = {
      _id: todo.microsoftUserId,
      userId: todo.userId,
      microsoftUserId: todo.microsoftUserId,
      title: Cipherer.decrypt(todo.title),
      comments: todo.comments ? Cipherer.decrypt(todo.comments) : "",
      status: todo.status,
      type: todo.type,
      eta: todo.eta,
      ata: todo.ata,
      date: todo.date,
      tags: fetchTodoDefaultTags(todo.tags ? [] : [], defaultTags),
      __v: todo.__v,
    };
    userTodos.push(todoItem);
  }

  userTodos = todoETABasedSorting(userTodos);

  return userTodos;
};

const getUserAttendance = async (userId: string): Promise<Attendance> => {
  const lambdaClient = new LambdaClient("Attendance");
  const userAttendance = (await lambdaClient.get(
    `/attendance?userId=${userId}&date=${new Date()}`
  )) as Attendance;

  return userAttendance;
};

const fetchTodoDefaultTags = (tags: string[], defaultTags: Tag[]): Tag[] => {
  let result: Tag[] = [];
  for (let tagId of tags) {
    const defaultTag = defaultTags.find(
      (x) => x._id!.toString() === tagId.toString()
    );
    if (!defaultTag) {
      continue;
    }
    result.push(defaultTag);
  }

  return result;
};

const orderReverseSorting = (response: GraphViewUser[]): GraphViewUser[] => {
  const graphDataCount = response.length;

  for (let i = 0; i < graphDataCount; i++) {
    response[i].order = graphDataCount - i;
  }

  response.sort((a, b) => {
    if (a.order! > b.order!) {
      return 1;
    }
    return -1;
  });

  return response;
};

const directReportsSorting = (response: GraphViewUser[]): GraphViewUser[] => {
  const responseCount = response.length;
  let targetUser = response[responseCount - 1];
  targetUser.reportingDetails!.sort((a, b) => {
    if (a.reportings!.length < b.reportings!.length) {
      return 1;
    }
    return -1;
  });

  return response;
};

const todoETABasedSorting = (userTodos: Todo[]): Todo[] => {
  userTodos.sort((a, b) => {
    if (a.eta < b.eta) {
      return 1;
    }
    return -1;
  });

  return userTodos;
};

const graphReportingsValidation = (
  userId: string,
  targetUserId: string
): ErrorResponse => {
  if (!userId) {
    return { code: 400, message: "UserId Required" };
  }

  if (!targetUserId) {
    return { code: 400, message: "Target UserId Required" };
  }

  return { code: 200, message: "Successful" };
};

const exceptionalValidation = (
  loggedInUser: GraphViewUser
): ExceptionalValidationResponse => {
  if (
    loggedInUser.practice === "Human Resource" &&
    loggedInUser.reportings.length > 1
  ) {
    loggedInUser.userId = "f6bd2701-f60c-4b51-91a0-800e1c70ec42";
    return { code: 200, hasAccess: true, user: loggedInUser };
  }

  if (loggedInUser.reportings.length > 1) {
    return { code: 200, hasAccess: true, user: loggedInUser };
  }

  return { code: 403, hasAccess: false, user: loggedInUser };
};

export { exceptionalValidation, graphReportingsValidation, getGraphViewData };
